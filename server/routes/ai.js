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
const buildSystemPrompt = (user, context, lessonContentContext, memoryContext, lang = 'es') => {
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

    const languageRules = lang === 'en'
        ? `1. **Language**: EXPLAIN in English, but PROVIDE EXAMPLES in Chinese.`
        : `1. **Language**: EXPLAIN in Spanish, but PROVIDE EXAMPLES in Chinese.`;

    const instructionsLang = lang === 'en'
        ? `Your goal: Help English speakers learn Chinese correctly.`
        : `Your goal: Help Spanish speakers learn Chinese correctly.`;

    return `You are "Panda", the AI mascot for "ChinoAmerica".
${instructionsLang}

CONTEXT:
${userContext}
${lessonContentContext}
Current Page: ${contextStr || 'General Dashboard'}${memoryContext || ''}

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

// GET /word-of-day (Mounted at /api/chat/word-of-day)
const DailyWord = require('../models/DailyWord');

router.get('/word-of-day', async (req, res) => {
    try {
        if (!process.env.GROQ_API_KEY) {
            return res.status(503).json({ error: 'AI service not configured' });
        }

        const lang = req.query.lang === 'en' ? 'en' : 'es';
        const todayStr = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
        // Unify the cache key so the same underlying Chinese word is used globally for the day.
        const cacheKey = todayStr + '_global';

        // 1. Check in-memory first (fastest)
        if (wodCache[cacheKey]) {
            return res.json(wodCache[cacheKey]);
        }

        // 2. Check MongoDB (for consistency across processes)
        const existing = await DailyWord.findOne({ date: cacheKey });
        if (existing) {
            wodCache[cacheKey] = existing.data;
            return res.json(existing.data);
        }

        // 3. Generate new word via AI
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        // Only avoid words generated in the same language to prevent cross-language blocking issues causing bad generation
        const recentWordsDocs = await DailyWord.find({ date: { $regex: '_global$' }, createdAt: { $gte: thirtyDaysAgo } }, { 'data.word': 1 }).sort({ createdAt: -1 });
        const recentWords = recentWordsDocs.map(d => d.data?.word).filter(Boolean);
        const avoidPrompt = recentWords.length > 0 ? `\n\nNOTE: Try to avoid these words that were provided in the last 30 days: ${recentWords.join(', ')}. You can repeat them occasionally if they are very important, but prefer providing new words.` : '';

        const userPrompt = `Generate a Chinese "Word or Phrase of the Day" for language learners.
Return ONLY a JSON object with these exact fields (no markdown, no code block):
{
  "word": "<Target word in pure Chinese characters ONLY>",
  "pronunciation": "<Pinyin for the target word WITH TONE MARKS>",
  "translationEn": "<English translation of the target word>",
  "translationEs": "<Spanish translation of the target word>",
  "example": "<Short example sentence using the word in pure Chinese characters ONLY. NO PINYIN HERE.>",
  "examplePronunciation": "<Pinyin for the entire example sentence WITH TONE MARKS. NO CHINESE CHARACTERS HERE.>",
  "exampleTranslationEn": "<English translation of the example sentence. CRITICAL: Do NOT translate the target word itself, insert the Chinese characters of the target word directly into this translated sentence>",
  "exampleTranslationEs": "<Spanish translation of the example sentence. CRITICAL: Do NOT translate the target word itself, insert the Chinese characters of the target word directly into this translated sentence>",
  "level": "<one of: A1, A2, B1, B2, C1>",
  "tipEn": "<Short memory tip in English to remember this>",
  "tipEs": "<Short memory tip in Spanish to remember this>"
}
Pick a useful, everyday term. It can be a single word or a common short phrase.
IMPORTANT: DO NOT use extremely basic greetings like "ni hao" (unless for a specific level idiom).
CRITICAL RULE 1: The 'example' field MUST contain ONLY Hanzi characters. Do not mix pinyin and characters.
CRITICAL RULE 2: The 'exampleTranslationEn' and 'exampleTranslationEs' fields MUST leave the target word in Chinese characters within the sentence. For example, if the word is 苹果, write: "I ate a 苹果 today." and "Comí una 苹果 hoy."
Provide variety across different levels (A1 to C1).${avoidPrompt}`;

        const completion = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [
                {
                    role: 'system',
                    content: `You are a Chinese language teacher. Respond ONLY with valid JSON, no markdown, no extra text.`
                },
                {
                    role: 'user',
                    content: userPrompt
                }
            ],
            temperature: 0.9,
            max_tokens: 300
        });

        const raw = completion.choices[0]?.message?.content?.trim() || '';
        const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        const wordData = JSON.parse(jsonStr);

        // Validate required fields
        const required = ['word', 'pronunciation', 'translationEn', 'translationEs', 'example', 'exampleTranslationEn', 'exampleTranslationEs', 'level', 'tipEn', 'tipEs'];
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
        const isEn = req.query.lang === 'en';
        const fallback = {
            word: 'Nǐ hǎo (你好)',
            translation: isEn ? 'Hello' : 'Hola',
            pronunciation: 'nǐ hǎo',
            example: 'Nǐ hǎo, nǐ zěnme yàng?',
            examplePronunciation: 'nǐ hǎo, nǐ zěnme yàng?',
            exampleTranslation: isEn ? 'Hello, how are you?' : '¿Hola, cómo estás?',
            level: 'A1',
            tip: isEn ? 'Nǐ hǎo is the most common greeting in Chinese.' : 'Nǐ hǎo es el saludo más común en chino.'
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

        const systemPrompt = buildSystemPrompt(user, context, lessonContentContext, memoryContext, lang);

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
            model: "llama-3.3-70b-versatile",
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
