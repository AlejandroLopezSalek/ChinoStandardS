# PandaLatam AI Agent Context

You are an AI assistant helping build **PandaLatam**, an educational platform for Spanish speakers learning Chinese.

## System Architecture
PandaLatam uses a hybrid, high-performance architecture:
- **Frontend Engine**: Eleventy (11ty) Static Site Generator using HTML and Vanilla JavaScript. *(No React or Next.js components should be created for the frontend)*.
- **Styling**: TailwindCSS (`src/css/tailwind.css`). Utility-first approach.
- **Backend API**: Node.js and Express (`server/`).
- **Database**: MongoDB with Mongoose (`server/models/`).
- **Authentication**: JWT & OAuth2 (Google).
- **AI Core**: Groq SDK (LLaMA 3.3 70B) for content generation, chat, and "Word of the Day" features.

## Coding Guidelines
1. **Frontend**: Keep the frontend purely static and vanilla. Use `localStorage` for state management where needed.
2. **Backend**: Follow strict security practices (input sanitization with `mongo-sanitize`, rate limiting, helmet, and CORS protection).
3. **Language**: User-facing interfaces and content MUST be generated in Spanish, as the target audience is Spanish speakers learning Chinese.
4. **Consistency**: Follow existing configurations (like Prettier/ESLint rules, Tailwind setup).

## Vercel AI SDK Integration Opportunities
The project currently relies on the `groq-sdk`. If expanding AI capabilities with the **Vercel AI SDK**, you should consider using:
- `@ai-sdk/groq` or `@ai-sdk/openai` (configured with Groq API) to standardize text generation across the backend.
- `generateObject` for structured JSON data schemas (useful for generating grammar quizzes and vocabulary lists reliably).
- `streamText` to provide a faster UX in the AI Chat feature (`/server/routes/ai.js`).
