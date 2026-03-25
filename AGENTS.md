# PandaLatam AI Agent Context

You are an AI assistant helping build **PandaLatam**, an educational platform for Spanish speakers learning Chinese.

## System Architecture
PandaLatam uses a hybrid, high-performance architecture:
- **Frontend Engine**: Eleventy (11ty) Static Site Generator using HTML and Vanilla JavaScript. *(No React or Next.js components should be created for the frontend)*.
- **Styling**: TailwindCSS (`src/css/tailwind.css`). Utility-first approach.
- **Backend API**: Node.js and Express (`server/`).
- **Database**: MongoDB with Mongoose (`server/models/`).
- **Authentication**: JWT & OAuth2 (Google).
- **AI Core**: Vercel AI SDK (`@ai-sdk/openai`). Features: Chat, Word of the Day (WoD), DNA analysis, Exams. **StoryLab** MUST use `moonshotai/kimi-k2-instruct` for 100% Hanzi integrity.
- **AI Content Generation Rules (Critical)**:
  1. **Hanzi Presence**: `character` and `sentence_character` MUST be 100% Hanzi (no empty strings or Pinyin). For StoryLab, use the `hanzi` field in the prompt and map it back to `hz`.
  2. **Format Persistence**: `sentence_translation` MUST include the target word in Hanzi (e.g., "Mi 父亲 es...").
  3. **Unicode Pinyin**: Use precomposed Unicode tone marks (ā, á, ǎ, à). NEVER use numbers or separate marks.
  4. **One-Shot Guard**: Always provide a JSON example in the messages array (system/user roles) with REAL Hanzi to anchor the expected output structure.
  5. **Groq JSON Strategy**: MUST use `generateText` with `responseFormat: 'json'`. Use the `messages` array for StoryLab to ensure better JSON schema compliance.
  6. **StoryLab Segmentation**: `segments` MUST be word-by-word or short phrases (max 4 Hanzi). NEVER send long sentences in a single segment as they break the mobile layout.
- **Exam Architecture (Updated)**: Exams feature 3 sections (Listening, Reading, Writing) with level-specific question counts. 
  - **Listening**: Uses a single `listening_passage` (long conversation/monologue) for all section questions.
  - **Reading**: Uses a `reading_passage` displayed in a dedicated modal.
  - **Writing**: Level-specific HSK tasks.
  - **Persistence**: Results, history, and user feedback are persisted in `LabExam` model.
  - **Audio**: Played via **Browser Native Speech Synthesis** (`zh-CN`/`tr-TR`) with a server-side robotic fallback.
- **TTS Strategy**: Prefer Browser Native SpeechSynthesis for realistic Chinese pronunciation. Fallback to `/api/chat/tts` only if unsupported.

## Coding Standards & Architecture (New)

### 1. Directory Structure
- `src/js/`: Modularized by function.
  - `auth/`: Session and user management.
  - `lab/`: AI-driven experimental features (`lab-exams.js`, `lab-story.js`, `lab-dna.js`).
  - `admin/`: Internal management tools.
  - `ui/`: Reusable interface components (e.g., `ai-mascot.js`).
  - `core/`: Global application logic.
- `scripts/`: Development and maintenance utilities (outside `src/`).

### 2. Multi-language (i18n) Strategy
- **Data-Driven Templates**: Avoid cloning `.html` files. Use Eleventy Pagination from `src/_data/i18n/*.json`.
- **Initialization**: Each lab page (`ADN`, `Examenes`, `StoryLab`, `Analisis`) parses `i18n-messages` into `window.I18N` for client-side logic to ensure consistent translation in dynamic UI updates.
- **Routing & SEO**: Use a directory-based structure for localized pages (e.g., `permalink: "{{ t.dir }}PageName/index.html"`). All links in `base.njk` are normalized to avoid double-slash issues in localized paths.
- **AI Language Context**: Pass the `lang` parameter to AI routes (`/generate-exam`, `/start-story`) to ensure the agent generates content (instructions, feedback) in the user's native tongue. Grading is flexible with synonyms in the target language.

## Coding Guidelines
1. **Frontend**: Keep the frontend purely static and vanilla. Use `localStorage` for state management where needed.
2. **Backend**: Follow strict security practices (input sanitization with `mongo-sanitize`, rate limiting, helmet, and CORS protection).
3. **Language**: User-facing interfaces and content English, Turkish and Spanish as native for learning Chinese.
4. **Consistency**: Follow existing configurations (like Prettier/ESLint rules, Tailwind setup).
5. **UI Performance**: To avoid "flicker" between page loads, do NOT use `opacity: 0` fadeIn transitions in `base.njk`. Pages should load immediately (`opacity: 1`).
6. **Tailwind Safelist**: Any dynamic color class (e.g., based on level levels) MUST be explicitly added to `tailwind.config.js` safelist/regex.

## Vercel AI SDK Implementation
The project is fully integrated with the **Vercel AI SDK**:
- `@ai-sdk/openai` configured with Groq baseURL to standardize text generation.
- **Groq JSON Strategy**: MUST use `generateText` with `responseFormat: 'json'` and manual JSON extraction via Regex (`.match(/\{[\s\S]*\}/)`) to ensure compatibility. `generateObject` is deprecated for Groq routes due to periodic schema validation failures.
- **Hanzi Guard**: To force Hanzi generation (especially for names), use the field name `hanzi` in the AI prompt and map it back to `hz` in the backend logic. This prevents the model from skipping the character field.
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
WSL2 automatically forwards `localhost` to the host and vice versa.
- **IMPORTANT**: It is not necessary to verify the Host IP (`172.x.x.1`) in every task. Only do so if there are persistent connection issues between the server in WSL and MongoDB on Windows.
- Compass on Windows should connect to `localhost:27017` if the Windows service is OFF.


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