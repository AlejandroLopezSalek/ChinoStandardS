const { pipeline } = require('@xenova/transformers');
const LessonVector = require('../models/LessonVector');

class RagService {
    constructor() {
        this.pipe = null;
        this.modelName = 'Xenova/all-MiniLM-L6-v2';
        this.isInitializing = false;
        this.initPromise = null;
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
            // 1. Delete old vectors for this lesson if re-indexing
            await LessonVector.deleteMany({ lessonId });

            // 2. Chunk text
            const chunks = this.chunkText(content);
            if (chunks.length === 0) return;

            // 3. Generate embeddings and save
            console.log(`[RAG Service] Indexing ${chunks.length} chunks for lesson ${lessonId}`);

            for (let i = 0; i < chunks.length; i++) {
                const chunkText = chunks[i];
                if (!chunkText.trim()) continue;

                const vector = await this.generateEmbedding(chunkText);

                await new LessonVector({
                    lessonId,
                    chunkIndex: i,
                    text: chunkText,
                    vector,
                    metadata
                }).save();
            }

            console.log(`[RAG Service] Successfully indexed lesson ${lessonId}`);
        } catch (err) {
            console.error(`[RAG Service] Error indexing lesson ${lessonId}:`, err);
        }
    }

    // Mathematical Dot Product & Cosine Similarity for array comparison
    dotProduct(vecA, vecB) {
        let sum = 0;
        for (let i = 0; i < vecA.length; i++) {
            sum += vecA[i] * vecB[i];
        }
        return sum;
    }

    magnitude(vec) {
        let sum = 0;
        for (let i = 0; i < vec.length; i++) {
            sum += vec[i] * vec[i];
        }
        return Math.sqrt(sum);
    }

    cosineSimilarity(vecA, vecB) {
        const magA = this.magnitude(vecA);
        const magB = this.magnitude(vecB);
        if (magA === 0 || magB === 0) return 0;
        return this.dotProduct(vecA, vecB) / (magA * magB);
    }

    async findSimilarContext(queryText, limit = 3) {
        try {
            // 1. Convert user query to vector
            const queryVector = await this.generateEmbedding(queryText);

            // 2. Load ALL vectors from DB (Since dataset is small, this is fast enough in RAM)
            // If dataset grows >10,000, consider Mongo Atlas Vector Search or pre-filtering.
            const allLessonDocs = await LessonVector.find({});

            // 3. Calculate similarity scores
            const scoredDocs = allLessonDocs.map(doc => {
                const score = this.cosineSimilarity(queryVector, doc.vector);
                return {
                    text: doc.text,
                    metadata: doc.metadata,
                    score: score
                };
            });

            // 4. Sort by highest score (closest to 1.0)
            scoredDocs.sort((a, b) => b.score - a.score);

            // 5. Filter threshold (e.g. only return if score > 0.3)
            const filteredDocs = scoredDocs.filter(d => d.score > 0.3);

            // 6. Return top N chunks
            return filteredDocs.slice(0, limit);
        } catch (err) {
            console.error('[RAG Service] Error searching context:', err);
            return [];
        }
    }
}

module.exports = new RagService();
