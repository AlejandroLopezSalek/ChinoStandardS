const { pipeline } = require('@xenova/transformers');
const { QdrantClient } = require('@qdrant/js-client-rest');
const LessonVector = require('../models/LessonVector');

// Initialize Qdrant Client (targeting the local Docker container)
const qdrantClient = new QdrantClient({
    url: 'http://127.0.0.1:6333',
    checkCompatibility: false
});
const COLLECTION_NAME = 'lessons';

class RagService {
    constructor() {
        this.pipe = null;
        this.modelName = 'Xenova/all-MiniLM-L6-v2';
        this.isInitializing = false;
        this.initPromise = null;
        this.ensureCollection();
    }

    async ensureCollection() {
        try {
            const result = await qdrantClient.getCollections();
            const exists = result.collections.some(c => c.name === COLLECTION_NAME);
            if (!exists) {
                // Xenova/all-MiniLM-L6-v2 outputs 384 dimensions
                await qdrantClient.createCollection(COLLECTION_NAME, {
                    vectors: {
                        size: 384,
                        distance: 'Cosine'
                    }
                });
                console.log(`[Qdrant] Created collection '${COLLECTION_NAME}' (384-dim, Cosine)`);
            }
        } catch (e) {
            // Silencing this in development as it is noisy when Docker is not running
            if (process.env.NODE_ENV === 'production') {
                console.error('[Qdrant] Connection warning:', e.message);
            }
        }
    }

    async init() {
        if (this.pipe) return this.pipe;

        if (this.isInitializing) {
            return this.initPromise;
        }

        this.isInitializing = true;
        this.initPromise = (async () => {
            try {
                console.log(`[RAG Service] Loading embedding model: ${this.modelName}...`);
                // Use the feature-extraction pipeline
                this.pipe = await pipeline('feature-extraction', this.modelName);
                console.log('[RAG Service] Embedding model loaded successfully.');
                return this.pipe;
            } catch (err) {
                console.error('[RAG Service] Error loading model:', err);
                throw err;
            } finally {
                this.isInitializing = false;
            }
        })();

        return this.initPromise;
    }

    async generateEmbedding(text) {
        const extractor = await this.init();
        // Generate embedding. output is a Tensor. pooling='mean', normalize=true are standard for sent-transformers
        const output = await extractor(text, { pooling: 'mean', normalize: true });
        // The output.data is a Float32Array
        return Array.from(output.data);
    }

    // Split text into ~200 word chunks
    chunkText(text, maxWords = 200) {
        const words = text.split(/\s+/);
        const chunks = [];
        let currentChunk = [];

        for (const word of words) {
            if (currentChunk.length >= maxWords) {
                chunks.push(currentChunk.join(' '));
                currentChunk = [];
            }
            currentChunk.push(word);
        }
        if (currentChunk.length > 0) {
            chunks.push(currentChunk.join(' '));
        }
        return chunks;
    }

    async indexLesson(lessonId, content, metadata = {}) {
        try {
            // 1. Delete old vectors for this lesson if re-indexing (from Mongo & Qdrant)
            await LessonVector.deleteMany({ lessonId });

            try {
                // Delete points by payload lessonId in Qdrant
                await qdrantClient.delete(COLLECTION_NAME, {
                    filter: {
                        must: [{ key: "lessonId", match: { value: String(lessonId) } }]
                    }
                });
            } catch (e) { /* Ignore if collection is empty or unreachable */ }

            // 2. Chunk text
            const chunks = this.chunkText(content);
            if (chunks.length === 0) return;

            console.log(`[RAG Service] Indexing ${chunks.length} chunks for lesson ${lessonId}`);

            const pointsToUpsert = [];

            for (let i = 0; i < chunks.length; i++) {
                const chunkText = chunks[i];
                if (!chunkText.trim()) continue;

                // Local CPU inference (Xenova)
                const vector = await this.generateEmbedding(chunkText);

                // Save to MongoDB as a backup/reference
                const newMongoDoc = await new LessonVector({
                    lessonId,
                    chunkIndex: i,
                    text: chunkText,
                    vector,
                    metadata
                }).save();

                // Build Qdrant Point
                pointsToUpsert.push({
                    id: String(newMongoDoc._id), // Use Mongo's specific UUID
                    vector: vector,
                    payload: {
                        lessonId: String(lessonId),
                        chunkIndex: i,
                        text: chunkText,
                        ...metadata
                    }
                });
            }

            // Batch insert into Qdrant
            if (pointsToUpsert.length > 0) {
                await qdrantClient.upsert(COLLECTION_NAME, { wait: true, points: pointsToUpsert });
            }

            console.log(`[RAG Service] Successfully indexed lesson ${lessonId} into DB & Qdrant`);
        } catch (err) {
            console.error(`[RAG Service] Error indexing lesson ${lessonId}:`, err);
        }
    }

    async findSimilarContext(queryText, limit = 3) {
        try {
            // 1. Convert user query to vector locally via Xenova
            const queryVector = await this.generateEmbedding(queryText);

            // 2. Search Qdrant via its ultra-fast C++ Engine
            const searchParams = {
                vector: queryVector,
                limit: limit,
                with_payload: true,
                score_threshold: 0.3 // Only return decent matches
            };

            const qdrantResults = await qdrantClient.search(COLLECTION_NAME, searchParams);

            // 3. Format back to standard output
            const formattedResults = qdrantResults.map(point => {
                return {
                    score: point.score,
                    text: point.payload.text,
                    metadata: point.payload || {}
                };
            });

            return formattedResults;

        } catch (err) {
            console.error('[RAG Service/Qdrant] Error searching context:', err.message);
            // Fallback: If Qdrant is down, return empty context rather than crashing the chat.
            return [];
        }
    }
}

module.exports = new RagService();
