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
const buildSystemPrompt = (user, context, lessonContentContext, memoryContext) => {
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

    return `You are "Panda", the AI mascot for "ChinoAmerica".
Your goal: Help Spanish speakers learn Chinese correctly.

CONTEXT:
${userContext}
${lessonContentContext}
Current Page: ${contextStr || 'General Dashboard'}${memoryContext || ''}

CRITICAL RULES:
1. **Language**: EXPLAIN in Spanish, but PROVIDE EXAMPLES in Chinese.
2. **Clarity**: Finish your sentences. Do not trail off.
3. **Grammar**: When explaining grammar, be structured. Don't mix Spanish endings into Chinese words unless comparing them.
4. **Personality**: You can use emojis to be friendly! 🌟
5. **Length**: If the answer is long, break it into bullet points.

${specialInstructions}

NAVIGATION:
- Only navigate if explicitly asked (e.g., "Ir a perfil").
- Valid: /Inicio, /Consejos/, /Gramatica/, /Community-Lessons/, /NivelA1/ thru /NivelC1/, /Perfil/
- Example: "Llevame a perfil" -> "Vamos al perfil. [[NAVIGATE:/Perfil/]]"`;
};

// Daily cache - in-memory fast layer
let wodCache = { date: null, data: null };

// GET /word-of-day (Mounted at /api/chat/word-of-day)
const DailyWord = require('../models/DailyWord');

router.get('/word-of-day', async (req, res) => {
    try {
        if (!process.env.GROQ_API_KEY) {
            return res.status(503).json({ error: 'AI service not configured' });
        }

        const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

        // 1. Check in-memory first (fastest)
        if (wodCache.date === today && wodCache.data) {
            return res.json(wodCache.data);
        }

        // 2. Check MongoDB (for consistency across processes)
        const existing = await DailyWord.findOne({ date: today });
        if (existing) {
            wodCache = { date: today, data: existing.data };
            return res.json(existing.data);
        }

        // 3. Generate new word via AI
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentWordsDocs = await DailyWord.find({ createdAt: { $gte: thirtyDaysAgo } }, { 'data.word': 1 }).sort({ createdAt: -1 });
        const recentWords = recentWordsDocs.map(d => d.data?.word).filter(Boolean);
        const avoidPrompt = recentWords.length > 0 ? `\n\nNOTE: Try to avoid these words that were provided in the last 30 days: ${recentWords.join(', ')}. You can repeat them occasionally if they are very important, but prefer providing new words.` : '';

        const completion = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [
                {
                    role: 'system',
                    content: 'You are a Chinese language teacher for Spanish speakers. Respond ONLY with valid JSON, no markdown, no extra text.'
                },
                {
                    role: 'user',
                    content: `Generate a Chinese "Word or Phrase of the Day" for Spanish speakers learning Chinese.
Return ONLY a JSON object with these exact fields (no markdown, no code block):
{
  "word": "<Chinese word or short useful phrase>",
  "pronunciation": "<phonetic pronunciation for Spanish speakers>",
  "translation": "<Spanish translation>",
  "example": "<Short example sentence in Chinese using the word/phrase>",
  "exampleTranslation": "<Spanish translation of the example, BUT LEAVE THE TARGET WORD IN TURKISH so the user has to guess it>",
  "level": "<one of: A1, A2, B1, B2, C1>",
  "tip": "<Short memory tip in Spanish to remember this>"
}
Pick a useful, everyday term. It can be a single word or a common short phrase. 
IMPORTANT: DO NOT use extremely basic greetings like "merhaba", "selam", "nasılsın", "günaydın", or "iyi akşamlar" (unless it is for a specific level like C1 in a complex idiom).
CRITICAL: In 'exampleTranslation', you MUST NOT translate the target 'word'. Leave the target 'word' exactly as it is in Chinese within the Spanish sentence.
Provide variety across different levels (A1 to C1).${avoidPrompt}`
                }
            ],
            temperature: 0.9,
            max_tokens: 300
        });

        const raw = completion.choices[0]?.message?.content?.trim() || '';
        const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        const wordData = JSON.parse(jsonStr);

        // Validate required fields
        const required = ['word', 'pronunciation', 'translation', 'example', 'exampleTranslation', 'level', 'tip'];
        for (const field of required) {
            if (!wordData[field]) throw new Error(`Missing field: ${field}`);
        }

        // 4. Save to MongoDB & memory (upsert to handle rare races)
        await DailyWord.findOneAndUpdate(
            { date: today },
            { data: wordData },
            { upsert: true, new: true }
        );

        wodCache = { date: today, data: wordData };
        res.json(wordData);
    } catch (err) {
        console.error('[word-of-day] Error:', err.message);
        // Fallback word so the widget never shows an error on AI failure
        res.json({
            word: 'merhaba',
            pronunciation: 'mehr-ah-bah',
            translation: 'hola',
            example: 'Merhaba, nasılsınız?',
            exampleTranslation: '¿Hola, cómo están?',
            level: 'A1',
            tip: 'Suena como "mer-aba" — el saludo más básico en chino.'
        });
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
        const { message, context, history } = req.body;
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

        const systemPrompt = buildSystemPrompt(user, context, lessonContentContext, memoryContext);

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


// ========================================
// WORD OF THE DAY
// ========================================

/**
 * In-memory cache: one entry per calendar day (UTC date string).
 * Format: { date: 'YYYY-MM-DD', data: { word, translation, ... } }
 */
let wordOfDayCache = null;

const WORD_OF_DAY_PROMPT = `You are a Chinese language teacher for Spanish speakers.
Generate a "Chinese Word of the Day" for language learners.
Choose a word appropriate for any level (A1–C1). Vary difficulty each day.
Respond ONLY with a valid JSON object — no markdown, no extra text:
{
  "word": "<Chinese word or short phrase>",
  "translation": "<Spanish translation>",
  "pronunciation": "<phonetic guide in Spanish e.g. 'mer-AB-a'>",
  "example": "<short Chinese example sentence using the word>",
  "exampleTranslation": "<Spanish translation of the example>",
  "level": "<A1|A2|B1|B2|C1>",
  "tip": "<A hint about the word's meaning, like a Spanglish sentence mixing Spanish and the Chinese word (e.g., 'Ayer fui a la [ev] para descansar'), to help them guess>"
}`;

router.get('/word-of-day', async (req, res) => {
    const todayUtc = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

    // Return cached result if still today
    if (wordOfDayCache?.date === todayUtc) {
        return res.json(wordOfDayCache.data);
    }

    if (!process.env.GROQ_API_KEY) {
        return res.status(503).json({ error: 'AI service not configured.' });
    }

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: 'You are a JSON-only API. Never add markdown or extra text.' },
                { role: 'user', content: WORD_OF_DAY_PROMPT }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.9,
            max_tokens: 400,
        });

        const raw = completion.choices[0]?.message?.content || '{}';

        // Strip any accidental markdown fences
        const cleaned = raw.replaceAll(/```json|```/g, '').trim();
        const data = JSON.parse(cleaned);

        // Validate required fields
        const required = ['word', 'translation', 'pronunciation', 'example', 'exampleTranslation', 'level', 'tip'];
        for (const field of required) {
            if (!data[field]) throw new Error(`Missing field: ${field}`);
        }

        wordOfDayCache = { date: todayUtc, data };
        return res.json(data);

    } catch (err) {
        console.error('Word of Day generation error:', err.message);
        // Fallback to a hardcoded word so the widget never breaks
        const fallback = {
            word: 'Merhaba',
            translation: 'Hola',
            pronunciation: 'mer-HA-ba',
            example: 'Merhaba, nasılsın?',
            exampleTranslation: '¡Hola, cómo estás?',
            level: 'A1',
            tip: 'Merhaba es el saludo más común en chino. Úsalo en cualquier situación.'
        };
        wordOfDayCache = { date: todayUtc, data: fallback };
        return res.json(fallback);
    }
});

module.exports = router;
