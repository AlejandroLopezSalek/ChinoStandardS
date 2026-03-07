const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const striptags = require('striptags');
const User = require('../models/User');
const ChatLog = require('../models/ChatLog');
// path removed

// Load Lesson Data for Context
let allLessons = {};
try {
    const a1 = require('../../src/data/a1_lessons.json');
    const a2 = require('../../src/data/a2_lessons.json');
    const b1 = require('../../src/data/b1_lessons.json');
    const b2 = require('../../src/data/b2_lessons.json');
    const c1 = require('../../src/data/c1_lessons.json');
    allLessons = { ...a1, ...a2, ...b1, ...b2, ...c1 };
} catch (e) {
    console.warn("Could not load lesson data for AI context:", e.message);
}

// Rate limiting specifically for AI chat to prevent abuse
const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // Limit each IP to 50 requests per hour
    message: { error: 'Too many AI requests, please try again later.' }
});

router.use(aiLimiter);

// Initialize Groq Client
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// Helper to get user from token
const getUserFromRequest = async (req) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    if (!token) return null;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return await User.findById(String(decoded.userId));
    } catch (err) {
        // Token invalid or expired
        if (process.env.NODE_ENV === 'development') console.debug('Auth check failed:', err.message);
        return null;
    }
};

// POST / (Mounted at /api/chat)
// Helper to extract lesson context
const getLessonContext = (context) => {
    let currentPage = "";
    if (typeof context === 'object' && context.page) {
        currentPage = context.page;
    } else if (typeof context === 'string') {
        if (context.includes('/')) currentPage = context;
    }

    if (currentPage && (currentPage.includes('/Lesson/') || currentPage.includes('/Leccion/'))) {
        const cleanPath = currentPage.endsWith('/') ? currentPage.slice(0, -1) : currentPage;
        const parts = cleanPath.split('/');
        const slug = parts.at(-1);

        if (slug && allLessons[slug]) {
            const lesson = allLessons[slug];
            const cleanContent = striptags(lesson.content);
            return `
*** ACTIVE LESSON CONTEXT ***
User is currently viewing the lesson: "${lesson.title}"
Content: ${cleanContent.substring(0, 1500)}...
(Use this information to answer specific questions about the lesson topic)
`;
        }
    }
    return "";
};

// Helper to construct system prompt
const buildSystemPrompt = (user, context, lessonContentContext, memoryContext, lang = 'es', ragContext = '') => {
    let userContext = "User: Guest";

    if (user) {
        userContext = `User: ${user.username} | Level: ${user.profile?.level || 'A1'} | Streak: ${user.stats?.streak || 0} days`;
    }

    const contextStr = typeof context === 'object' ? JSON.stringify(context) : String(context || '');
    let specialInstructions = "";

    if (contextStr.includes('Contribuir') || contextStr.includes('Admin') || contextStr.includes('Lección')) {
        specialInstructions = `
*** SPECIAL CONTEXT: LESSON MODE ***
If the user is creating a lesson (Contribute), assist with Chinese examples and grammar.
If the user is viewing a lesson, answer based on the ACTIVE LESSON CONTEXT provided below.
`;
    }

    let languageRules = `1. **Language**: EXPLAIN in Spanish, but PROVIDE EXAMPLES in Chinese.`;
    if (lang === 'en') {
        languageRules = `1. **Language**: EXPLAIN in English, but PROVIDE EXAMPLES in Chinese.`;
    } else if (lang === 'tr') {
        languageRules = `1. **Language**: EXPLAIN in Turkish, but PROVIDE EXAMPLES in Chinese.`;
    }

    let instructionsLang = `Your goal: Help Spanish speakers learn Chinese correctly.`;
    if (lang === 'en') {
        instructionsLang = `Your goal: Help English speakers learn Chinese correctly.`;
    } else if (lang === 'tr') {
        instructionsLang = `Your goal: Help Turkish speakers learn Chinese correctly.`;
    }

    return `You are "Panda", the AI mascot for "PandaLatam".
${instructionsLang}

CONTEXT:
${userContext}
${lessonContentContext}
Current Page: ${contextStr || 'General Dashboard'}${memoryContext || ''}
${ragContext}

CRITICAL RULES:
${languageRules}
2. **Clarity**: Finish your sentences. Do not trail off.
3. **Grammar**: When explaining grammar, be structured. Don't mix Spanish/English endings into Chinese words unless comparing them.
4. **Personality**: You can use emojis to be friendly! 🌟
5. **Length**: If the answer is long, break it into bullet points.

${specialInstructions}

NAVIGATION:
- Only navigate if explicitly asked (e.g., "Go to profile" or "Ir a perfil").
- Valid: /Inicio, /Consejos/, /Gramatica/, /Community-Lessons/, /NivelA1/ thru /NivelC1/, /Perfil/
- Example: "Take me to profile" -> "Let's go. [[NAVIGATE:/Perfil/]]"`;
};

// Daily cache - in-memory fast layer
let wodCache = {};

// Helper to generate the target word sync prompt
const getTargetWordPrompt = (existingOther, languageName) => {
    if (!existingOther?.data?.character) return "";

    const sourceLevelBadge = existingOther.data.level_badge || "";
    const levelPrefixMatch = sourceLevelBadge.match(/^([a-zA-Z0-9]+)\s*-/);
    const levelInstruction = levelPrefixMatch
        ? `\n- "level_badge": MUST start with "${levelPrefixMatch[1]} - " followed by the ${languageName} translated level name.`
        : "";

    return `

CRITICAL INSTRUCTION - SYNC REQUIRED:
You MUST use these exact Chinese values for the following fields. DO NOT alter them:
- "character": "${existingOther.data.character}"
- "pinyin": "${existingOther.data.pinyin}"
- "sentence_character": "${existingOther.data.sentence_character}"
- "sentence_pinyin": "${existingOther.data.sentence_pinyin}"${levelInstruction}

Your ONLY task is to provide the ${languageName} translations for 'word_translation', 'level_badge', 'tip', and 'sentence_translation'. 
CRITICAL RULE: You MUST NOT translate the target word itself in the 'sentence_translation'. Keep the target word "${existingOther.data.character}" in its original Chinese character form inside the translated sentence!`;
};

// GET /word-of-day (Mounted at /api/chat/word-of-day)
const DailyWord = require('../models/DailyWord');

router.get('/word-of-day', async (req, res) => {
    try {
        if (!process.env.GROQ_API_KEY) {
            return res.status(503).json({ error: 'AI service not configured' });
        }

        const lang = ['en', 'tr'].includes(req.query.lang) ? req.query.lang : 'es';

        let languageName = 'Spanish';
        if (lang === 'en') {
            languageName = 'English';
        } else if (lang === 'tr') {
            languageName = 'Turkish';
        }
        const todayStr = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
        // Cache per language (v2 string appended to bust corrupted production caches)
        const cacheKey = todayStr + '_v2_' + lang;

        // 1. Check in-memory first (fastest)
        if (wodCache[cacheKey]) {
            return res.json(wodCache[cacheKey]);
        }

        // 2. Check MongoDB for EXACT cache
        const existing = await DailyWord.findOne({ date: cacheKey });
        if (existing) {
            wodCache[cacheKey] = existing.data;
            return res.json(existing.data);
        }

        // 2.5 Check if ANY OTHER language generated a word today
        const otherCacheKeyPrefix = todayStr + '_v2_';
        const existingOther = await DailyWord.findOne({
            date: {
                $regex: '^' + otherCacheKeyPrefix,
                $ne: cacheKey
            }
        });

        let targetWordPrompt = getTargetWordPrompt(existingOther, languageName);

        // 3. Generate new word via AI
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Avoid recently generated words
        const recentWordsDocs = await DailyWord.find({ date: { $regex: '^' + todayStr.substring(0, 7) }, createdAt: { $gte: thirtyDaysAgo } }, { 'data.character': 1 }).sort({ createdAt: -1 });
        const recentWords = recentWordsDocs.map(d => d.data?.character).filter(Boolean);
        const avoidPrompt = recentWords.length > 0 && !targetWordPrompt ? `\n\nNOTE: Try to avoid these words that were provided recently: ${recentWords.join(', ')}.` : '';

        // Dynamic examples based on language to avoid confusing the AI
        const DYNAMIC_EXAMPLES = {
            en: { word: 'Mother', level: 'A1 - Beginner', tip: 'Remember the character naturally looks like a mother holding a baby.', sentence: 'I want to see my 母亲' },
            tr: { word: 'Anne', level: 'A1 - Başlangıç', tip: 'Karakterin bebeğini tutan bir anneye benzediğini unutmayın.', sentence: '母亲ı görmek istiyorum' },
            es: { word: 'Madre', level: 'A1 - Principiante', tip: 'Recuerda que el carácter parece una madre sosteniendo a un bebé.', sentence: 'Quiero ver a mi 母亲' }
        };
        const exMap = DYNAMIC_EXAMPLES[lang] || DYNAMIC_EXAMPLES.es;
        const exampleWordTrans = exMap.word;
        const exampleLevel = exMap.level;
        const exampleTip = exMap.tip;
        const exampleSentenceTrans = exMap.sentence;

        const userPrompt = `Act as a Chinese language learning API. Your task is to generate a 'Word of the Day' for a learning application.

You must output ONLY strictly valid JSON. Do not include any markdown formatting, conversational text, or explanations.

The user's interface language is: ${languageName}.

CRITICAL INSTRUCTIONS:
1. Choose a legitimate and common Simplified Chinese vocabulary word (ranging from HSK 1 to HSK 6). Ensure it is a REAL word, NOT a random or invalid character.
2. Pinyin fields MUST use the Latin alphabet with tone marks (e.g. mǔ qīn). NO Chinese characters allowed in pinyin fields.
3. Translation fields MUST be written entirely in ${languageName}. NO Chinese characters allowed, EXCEPT for rule 4 below.
4. For 'sentence_character': You MUST write a grammatically correct sentence using ONLY Simplified Chinese characters. ABSOLUTELY NO Japanese characters allowed.
5. For 'sentence_translation': You MUST NOT translate the target word itself. Instead, insert the original Chinese character within the ${languageName} translation appropriately. For example, if the word is 苹果, the output MUST be "She ate an 苹果", NOT "She ate an apple". Translate the rest of the sentence into natural ${languageName}.

EXAMPLE OUTPUT FORMAT (for a ${languageName} user learning the word 母亲):
{
  "character": "母亲",
  "pinyin": "mǔ qīn",
  "word_translation": "${exampleWordTrans}",
  "level_badge": "${exampleLevel}",
  "tip": "${exampleTip}",
  "sentence_character": "我想见到我的母亲",
  "sentence_pinyin": "wǒ xiǎng jiàn dào wǒ de mǔ qīn",
  "sentence_translation": "${exampleSentenceTrans}"
}

Create a JSON object for the daily word following the exact structure from the example above.${targetWordPrompt}${avoidPrompt}`;

        const groqCall = groq.chat.completions.create({
            model: 'moonshotai/kimi-k2-instruct',
            messages: [
                {
                    role: 'system',
                    content: `You are a strict native Simplified Chinese language teacher. You ONLY speak and output Simplified Chinese, English, Turkish, and Spanish. Respond ONLY with valid JSON, no markdown, no extra text.`
                },
                {
                    role: 'user',
                    content: userPrompt
                }
            ],
            temperature: 0.6,
            max_tokens: 300
        });

        // Add a 7-second timeout so the API doesn't hang indefinitely. 
        // If it hangs, it naturally throws and falls back to the hardcoded word.
        const completion = await Promise.race([
            groqCall,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Groq AI Timeout')), 7000))
        ]);

        const raw = completion.choices[0]?.message?.content?.trim() || '';
        const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        const wordData = JSON.parse(jsonStr);

        // Validate required fields
        const required = ['character', 'pinyin', 'word_translation', 'level_badge', 'tip', 'sentence_character', 'sentence_pinyin', 'sentence_translation'];
        for (const field of required) {
            if (!wordData[field]) throw new Error(`Missing field: ${field}`);
        }

        // 4. Save to MongoDB & memory (upsert to handle rare races)
        await DailyWord.findOneAndUpdate(
            { date: cacheKey },
            { data: wordData },
            { upsert: true, new: true }
        );

        wodCache[cacheKey] = wordData;
        res.json(wordData);
    } catch (err) {
        console.error('[word-of-day] Error:', err.message);
        // Fallback to a hardcoded word so the widget never breaks
        const validLang = ['en', 'tr'].includes(req.query.lang) ? req.query.lang : 'es';
        const FALLBACK_WORDS = {
            en: { trans: 'Hello', level: 'A1 - Beginner', tip: 'Nǐ hǎo is the most common greeting in Chinese.', sentTrans: 'Hello, how are you?' },
            tr: { trans: 'Merhaba', level: 'A1 - Başlangıç', tip: 'Nǐ hǎo, Çince\'deki en yaygın selamlamadır.', sentTrans: 'Merhaba, nasılsın?' },
            es: { trans: 'Hola', level: 'A1 - Principiante', tip: 'Nǐ hǎo es el saludo más común en chino.', sentTrans: '¿Hola, cómo estás?' }
        };
        const fbMap = FALLBACK_WORDS[validLang];

        const fallback = {
            character: '你好',
            pinyin: 'nǐ hǎo',
            word_translation: fbMap.trans,
            level_badge: fbMap.level,
            tip: fbMap.tip,
            sentence_character: '你好，你怎么样？',
            sentence_pinyin: 'Nǐ hǎo, nǐ zěnme yàng?',
            sentence_translation: fbMap.sentTrans
        };
        res.json(fallback);
    }
});

// GET /past-words (Mounted at /api/chat/past-words)
router.get('/past-words', async (req, res) => {
    try {
        const pastWords = await DailyWord.find({}).sort({ date: -1 });
        const results = pastWords.map(doc => ({
            date: doc.date,
            ...doc.data
        }));
        res.json(results);
    } catch (err) {
        console.error('Error fetching past words:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST / (Mounted at /api/chat)
router.post('/', async (req, res) => {

    try {
        const { message, context, history, lang } = req.body;
        const user = await getUserFromRequest(req);

        if (!process.env.GROQ_API_KEY) {
            console.error('SERVER ERROR: GROQ_API_KEY is missing in .env');
            return res.status(503).json({
                error: 'Service unavailable',
                message: 'AI service is not configured on the server.'
            });
        }

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const lessonContentContext = getLessonContext(context);
        let memoryContext = "";
        if (user?.stats?.lastViewedLesson?.title) {
            memoryContext = `\nMEMORY: The user was last studying "${user.stats.lastViewedLesson.title}".`;
        }

        // --- RAG RETRIEVAL ---
        const ragService = require('../services/ragService');
        const similarChunks = await ragService.findSimilarContext(message, 3);
        let ragContext = "";
        if (similarChunks && similarChunks.length > 0) {
            ragContext = `\n*** COMMUNITY KNOWLEDGE BASE ***\nIf the user's question is related to the following community material, use it to formulate your answer:\n`;
            similarChunks.forEach(chunk => {
                ragContext += `[Source: "${chunk.metadata?.title || 'Community Lesson'}" by ${chunk.metadata?.author || 'Unknown'} - Level ${chunk.metadata?.level || 'N/A'}]:\n"${chunk.text}"\n\n`;
            });
        }

        const systemPrompt = buildSystemPrompt(user, context, lessonContentContext, memoryContext, lang, ragContext);

        const messages = [{ role: "system", content: systemPrompt }];

        // Add history
        if (Array.isArray(history)) {
            const recentHistory = history.slice(-4);
            recentHistory.forEach(msg => {
                if (msg.role && msg.content) messages.push(msg);
            });
        }

        messages.push({ role: "user", content: message });

        const chatCompletion = await groq.chat.completions.create({
            messages: messages,
            model: "moonshotai/kimi-k2-instruct",
            temperature: 0.6,
            max_tokens: 1024,
        });

        const reply = chatCompletion.choices[0]?.message?.content || "Lo siento, no pude procesar eso.";

        res.json({ reply });

        // Log interaction asynchronously (fire-and-forget)
        logChatInteraction(user, message, reply, context, lessonContentContext, req);

    } catch (error) {
        console.error(' Groq API Error:', error);

        // Return specific error message for debugging
        res.status(500).json({
            error: 'AI Error',
            message: error.message || 'Hubo un error al conectar con el asistente.',
            details: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
});

/**
 * Log chat interaction to database
 * @param {Object|null} user - User object or null for guests
 * @param {string} message - User message
 * @param {string} reply - AI's reply
 * @param {Object|string} context - Page context
 * @param {string} lessonContentContext - Lesson context if applicable
 * @param {Object} req - Express request object
 */
async function logChatInteraction(user, message, reply, context, lessonContentContext, req) {
    try {
        // Sanitize all inputs to prevent database injection
        const sanitizedMessage = String(message || '').substring(0, 5000);
        const sanitizedReply = String(reply || '').substring(0, 10000);
        const sanitizedUsername = user?.username ? String(user.username).substring(0, 100) : 'Guest';
        const sanitizedLessonContext = lessonContentContext ? String(lessonContentContext).substring(0, 100) + '...' : '';

        await ChatLog.create({
            userId: user?._id || null,
            username: sanitizedUsername,
            userMessage: sanitizedMessage,
            aiResponse: sanitizedReply,
            context: (typeof context === 'object' && context !== null)
                ? { page: String(context.page || '') }
                : { raw: typeof context === 'string' ? context : '' },
            lessonContext: sanitizedLessonContext,
            metadata: {
                ip: req.ip,
                userAgent: req.get('User-Agent')
            }
        });
    } catch (error) {
        console.error('Failed to log chat interaction:', error.message);
    }
}




module.exports = router;
// Trigger restart
