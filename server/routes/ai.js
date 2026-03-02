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
        const languageName = lang === 'en' ? 'English' : 'Spanish';
        const todayStr = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
        // Cache per language
        const cacheKey = todayStr + '_' + lang;

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

        // 2.5 Check if the OTHER language generated a word today
        const otherLang = lang === 'en' ? 'es' : 'en';
        const otherCacheKey = todayStr + '_' + otherLang;
        const existingOther = await DailyWord.findOne({ date: otherCacheKey });

        let targetWordPrompt = "";
        if (existingOther && existingOther.data && existingOther.data.character) {
            targetWordPrompt = `

CRITICAL INSTRUCTION - SYNC REQUIRED:
You MUST use these exact Chinese values for the following fields. DO NOT alter them:
- "character": "${existingOther.data.character}"
- "pinyin": "${existingOther.data.pinyin}"
- "sentence_character": "${existingOther.data.sentence_character}"
- "sentence_pinyin": "${existingOther.data.sentence_pinyin}"

Your ONLY task is to provide the ${languageName} translations for 'word_translation', 'level_badge', 'tip', and 'sentence_translation'. 
REMEMBER RULE 3: You MUST NOT translate the target word itself in the 'sentence_translation'. You MUST keep the target word as its original Chinese character.`;
        }

        // 3. Generate new word via AI
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Avoid recently generated words
        const recentWordsDocs = await DailyWord.find({ date: { $regex: '^' + todayStr.substring(0, 7) }, createdAt: { $gte: thirtyDaysAgo } }, { 'data.character': 1 }).sort({ createdAt: -1 });
        const recentWords = recentWordsDocs.map(d => d.data?.character).filter(Boolean);
        const avoidPrompt = recentWords.length > 0 && !targetWordPrompt ? `\n\nNOTE: Try to avoid these words that were provided recently: ${recentWords.join(', ')}.` : '';

        // Dynamic examples based on language to avoid confusing the AI
        const exampleWordTrans = lang === 'en' ? 'Mother' : 'Madre';
        const exampleLevel = lang === 'en' ? 'A1 - Beginner' : 'A1 - Principiante';
        const exampleTip = lang === 'en' ? 'Remember the character naturally looks like a mother holding a baby.' : 'Recuerda que el carácter parece una madre sosteniendo a un bebé.';
        const exampleSentenceTrans = lang === 'en' ? 'I want to see my 母亲' : 'Quiero ver a mi 母亲';

        const userPrompt = `Act as a Chinese language learning API. Your task is to generate a 'Word of the Day' for a learning application.

You must output ONLY strictly valid JSON. Do not include any markdown formatting, conversational text, or explanations.

The user's interface language is: ${languageName}.

CRITICAL INSTRUCTIONS:
1. Pinyin fields MUST use the Latin alphabet with tone marks (e.g. mǔ qīn). NO Chinese characters allowed in pinyin fields.
2. Translation fields MUST be written entirely in ${languageName}. NO Chinese characters allowed, EXCEPT for rule 3 below.
3. For 'sentence_translation': You MUST NOT translate the target word itself. You MUST keep the target word as its original Chinese character. Translate the rest of the sentence around it into ${languageName}.

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
        const isEn = req.query.lang === 'en';
        const fallback = {
            character: '你好',
            pinyin: 'nǐ hǎo',
            word_translation: isEn ? 'Hello' : 'Hola',
            level_badge: isEn ? 'A1 - Beginner' : 'A1 - Principiante',
            tip: isEn ? 'Nǐ hǎo is the most common greeting in Chinese.' : 'Nǐ hǎo es el saludo más común en chino.',
            sentence_character: '你好，你怎么样？',
            sentence_pinyin: 'Nǐ hǎo, nǐ zěnme yàng?',
            sentence_translation: isEn ? 'Hello, how are you?' : '¿Hola, cómo estás?'
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
