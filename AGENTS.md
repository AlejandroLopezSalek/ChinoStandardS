# PandaLatam AI Agent Context

You are an AI assistant helping build **PandaLatam**, an educational platform for Spanish speakers learning Chinese.

## System Architecture
PandaLatam uses a hybrid, high-performance architecture:
- **Frontend Engine**: Eleventy (11ty) Static Site Generator using HTML and Vanilla JavaScript. *(No React or Next.js components should be created for the frontend)*.
- **Styling**: TailwindCSS (`src/css/tailwind.css`). Utility-first approach.
- **Backend API**: Node.js and Express (`server/`).
- **Database**: MongoDB with Mongoose (`server/models/`).
- **Authentication**: JWT & OAuth2 (Google).
- **AI Core**: Vercel AI SDK (`@ai-sdk/openai`) configured with Groq API. Models: `moonshotai/kimi-k2-instruct` (Kimi) and `llama-3.3-70b`. Features: Chat, Word of the Day, DNA analysis, Exams.
- **Exam Architecture (New)**: Exams are structured into 3 sections (Listening, Reading, Writing) with level-specific question counts (HSK 1/2: 10, HSK 3: 13, HSK 4: 15, HSK 5/6: 20). The Listening section uses AI-generated text and frontend TTS for audio comprehension.

## Coding Standards & Architecture (New)

### 1. Directory Structure
- `src/js/`: Modularized by function.
  - `auth/`: Session and user management.
  - `lab/`: AI-driven experimental features.
  - `admin/`: Internal management tools.
  - `ui/`: Reusable interface components.
  - `core/`: Global application logic.
- `scripts/`: Development and maintenance utilities (outside `src/`).

### 2. Multi-language (i18n) Strategy
- **Data-Driven Templates**: Avoid cloning `.html` files for different languages.
- Use `src/_data/i18n.json` for UI strings.
- Leverage Eleventy **Pagination** to generate localized pages (e.g., `/StoryLab.html`, `/en/StoryLab.html`, `/tr/StoryLab.html`) from a single Nunjucks source.

## Coding Guidelines
1. **Frontend**: Keep the frontend purely static and vanilla. Use `localStorage` for state management where needed.
2. **Backend**: Follow strict security practices (input sanitization with `mongo-sanitize`, rate limiting, helmet, and CORS protection).
3. **Language**: User-facing interfaces and content English,Turkish and Spanish as native for  learning Chinese.
4. **Consistency**: Follow existing configurations (like Prettier/ESLint rules, Tailwind setup).

## Vercel AI SDK Implementation
The project is fully integrated with the **Vercel AI SDK**:
- `@ai-sdk/openai` configured with Groq baseURL to standardize text generation.
- `generateObject` for structured JSON data schemas (grammar quizzes, DNA analysis, vocabulary lists).
- `streamText` for faster real-time UX in the AI Chat (`/server/routes/ai.js`).

## Persistence & Context Rule
> [!IMPORTANT]
> ANY change to the project's core architecture, tech stack, or rules MUST be reflected in this file (`AGENTS.md`) and saved to Engram immediately. Documentation is the source of truth for all AI agents.

## MongoDB Setup for WSL Ubuntu

When migrating from Windows to WSL Ubuntu, MongoDB needs to be properly installed and configured:

### Installation Steps:
1. Add MongoDB repository:
   ```bash
   sudo apt-get install -y gnupg curl
   curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
   echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
   ```

2. Install MongoDB:
   ```bash
   sudo apt-get update && sudo apt-get install -y mongodb-org
   ```

3. Start and enable MongoDB service:
   ```bash
   sudo systemctl start mongod
   sudo systemctl enable mongod
   ```

4. Verify installation:
   ```bash
   sudo systemctl status mongod
   mongosh --eval "db.adminCommand('ping')"
   ```

### Environment Variables:
Ensure `.env` file has correct MongoDB URI:
```
MONGO_URI=mongodb://127.0.0.1:27017/chinostandard
```

### Troubleshooting:
- If MongoDB fails to start, check logs: `sudo journalctl -u mongod -f`
- Ensure port 27017 is not blocked by firewall
- Verify MongoDB configuration in `/etc/mongod.conf`

### Switching back to Windows MongoDB (Host)
If you need to use the native Windows MongoDB instance instead of the WSL one:
1. **Stop WSL MongoDB**: `sudo systemctl stop mongod`
2. **Start Windows MongoDB**: Open PowerShell as Admin and run `Start-Service MongoDB` (or use the Services app).
3. **Compass Connection**: You can still use `localhost:27017` in Compass. If it doesn't connect, use the Windows Host IP (find via `ip route` in WSL, usually `172.x.x.1`).

### Port Management (WSL vs Host)
WSL2 automáticamente reenvía `localhost` al host y viceversa.
- **IMPORTANTE**: No es necesario verificar la IP del host (`172.x.x.1`) en cada tarea. Solo hacelo si hay problemas persistentes de conexión entre el servidor en WSL y MongoDB en Windows.
- Compass en Windows debería conectar a `localhost:27017` si el servicio de Windows está APAGADO.


### Compass Configuration for WSL
To always see the WSL instance regardless of the Windows service state:
1. Find WSL IP: `hostname -I` (in WSL terminal).
2. In Compass, use `mongodb://<WSL_IP>:27017`.



## Agent Protocol

### Environment
- You are operating NATIVELY inside a Linux (Ubuntu/WSL) environment.
- Use standard bash commands.
- The absolute root is `/home/$USER/...` (never use Windows paths).

### Memory
- Engram is active. Use `engram stats` and `engram save` directly in the terminal to manage architectural knowledge.

### Commit & Review Policy
- **Small Changes** (< 300 lines, < 5 files): Use default `git commit` to trigger GGA review.
- **Large Changes** (> 500 lines or complex modules like `server/routes/ai.js`): Use `git commit --no-verify` if GGA times out due to provider limits (Gemini TPM quotas). 
- **Verification**: If bypassing GGA, the agent MUST perform a manual logic review before committing.