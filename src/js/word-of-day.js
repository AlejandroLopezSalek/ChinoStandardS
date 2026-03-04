// ========================================
// WORD OF THE DAY WIDGET
// ========================================

(function () {
    'use strict';

    // Level Colors mapped to CEFR code at start of string
    const LEVEL_COLORS = {
        A1: 'bg-red-500',
        A2: 'bg-orange-500',
        B1: 'bg-red-500',
        B2: 'bg-orange-500',
        C1: 'bg-red-500'
    };

    const normalizeAnswer = (s) => s.toLowerCase()
        .normalize('NFD').replaceAll(/[\u0300-\u036f]/gu, '')
        .replaceAll(/[^a-z0-9\s]/gu, '').trim();

    function displayFeedback(feedback, input, isCorrect, isEn) {
        if (isCorrect) {
            feedback.className = 'mt-3 rounded-lg px-4 py-3 text-sm font-medium transition-all bg-green-400/20 border border-green-400/40 text-green-100';
            feedback.innerHTML = `<i class="fas fa-circle-check mr-2 text-green-300"></i>${isEn ? 'Correct! 🎉 Well done.' : '¡Correcto! 🎉 Bien hecho.'}`;
            if (input) {
                input.classList.add('border-green-400/60', 'bg-green-400/10');
                input.classList.remove('border-white/20', 'border-red-400/60', 'bg-red-400/10');
            }
        } else {
            feedback.className = 'mt-3 rounded-lg px-4 py-3 text-sm font-medium transition-all bg-red-400/20 border border-red-400/40 text-red-100';
            feedback.innerHTML = `<i class="fas fa-circle-xmark mr-2 text-red-300"></i>${isEn ? "Incorrect, try again!" : "Incorrecto, ¡intenta de nuevo!"}`;
            if (input) {
                input.classList.add('border-red-400/60', 'bg-red-400/10');
                input.classList.remove('border-white/20', 'border-green-400/60', 'bg-green-400/10');
                input.value = '';
                input.focus();
            }
        }
    }

    function getWidgetHTML(data, isEn, lvlBg, lvlText) {
        const currentTranslation = data.word_translation;
        const currentExampleTranslation = data.sentence_translation;
        const currentTip = data.tip;
        const answerLabel = isEn ? "How do you translate it?" : "¿Cómo se traduce?";
        const answerPlaceholder = isEn ? "English translation..." : "Traducción al español...";
        const verifyText = isEn ? "Verify" : "Verificar";
        const glossaryText = isEn ? "View past words glossary" : "Ver glosario de palabras anteriores";
        const translationLabel = isEn ? "Translation" : "Traducción";

        return `
            <!-- Header row -->
            <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div class="flex items-center gap-2 text-white/70 text-xs sm:text-sm font-semibold uppercase tracking-wider">
                    <i class="fas fa-star text-yellow-300"></i> ${isEn ? "Word of the Day" : "Palabra del Día"}
                </div>
                <span class="px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-bold text-white ${lvlBg} shadow whitespace-nowrap">${lvlText}</span>
            </div>

            <!-- Chinese word (big) -->
            <div class="text-center mb-2">
                <div id="wodWord" class="text-2xl sm:text-4xl font-black text-white tracking-tight mb-1">${escHtml(data.character)}</div>
                <div class="text-white/60 text-xs sm:text-sm"><i class="fas fa-volume-low mr-1"></i>${escHtml(data.pinyin)}</div>
            </div>

            <!-- Example sentence -->
            <div class="bg-white/10 rounded-xl p-4 my-4 text-center">
                <p class="text-white/90 italic text-sm">"${escHtml(data.sentence_character)}"</p>
                <p class="text-white/70 text-xs mt-2">${escHtml(data.sentence_pinyin)}</p>
                <p id="wodExampleTranslation" class="text-white/50 text-xs mt-1 transition-all">${escHtml(currentExampleTranslation)}</p>
            </div>

            <!-- Answer input zone -->
            <div id="wodAnswerZone" class="mb-4">
                <label class="block text-white/70 text-xs font-semibold uppercase tracking-wider mb-2">
                    <i class="fas fa-pencil mr-1"></i>${answerLabel}
                </label>
                <div class="flex gap-2">
                    <input id="wodAnswerInput"
                        type="text"
                        placeholder="${answerPlaceholder}"
                        class="flex-1 min-w-0 px-3 py-2.5 rounded-lg bg-white/15 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/20 transition-all"
                    />
                    <button id="wodCheckBtn"
                        class="shrink-0 px-3 sm:px-4 py-2.5 bg-white text-red-700 font-bold rounded-lg text-sm hover:bg-white/90 transition-all shadow hover:shadow-lg active:scale-95">
                        <span class="hidden sm:inline">${verifyText}</span>
                        <i class="fas fa-check sm:hidden"></i>
                    </button>
                </div>
            </div>
            <!-- Feedback area (outside zone so it stays visible) -->
            <div id="wodFeedback" class="mt-3 hidden rounded-lg px-4 py-3 text-sm font-medium transition-all"></div>

            <!-- View Glossary link -->
            <div class="flex gap-3 mt-2">
                <a href="${isEn ? '/en/Glosario/' : '/Glosario/'}" id="wodRevealGlossary"
                    class="flex-1 py-2.5 px-4 rounded-lg border border-white/30 text-white/80 text-sm font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                    <i class="fas fa-book"></i> ${glossaryText}
                </a>
                <button id="wodTipBtn"
                    class="py-2.5 px-4 rounded-lg border border-white/30 text-white/80 text-sm font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                    <i class="fas fa-lightbulb"></i> Tip
                </button>
            </div>

            <!-- Translation (hidden until revealed) -->
            <div id="wodTranslation"
                class="hidden mt-4 text-center p-4 bg-white/15 rounded-xl border border-white/20 transition-all">
                <div class="text-white/60 text-xs uppercase tracking-wider mb-1">${translationLabel}</div>
                <div class="text-2xl font-bold text-white">${escHtml(currentTranslation)}</div>
            </div>

            <!-- Tip (hidden until tapped) -->
            <div id="wodTip"
                class="hidden mt-3 p-3 bg-yellow-400/15 border border-yellow-300/30 rounded-xl text-yellow-100 text-sm">
                <i class="fas fa-lightbulb text-yellow-300 mr-2"></i>${escHtml(currentTip)}
            </div>
        `;
    }

    // ---- State ----
    let wodData = null;
    let answered = false;

    const getEl = (id) => document.getElementById(id);

    // Local storage key helper
    const getStorageKey = () => 'wod_answered_global_' + new Date().toISOString().slice(0, 10);

    // ---- Fetch word of the day ----
    async function loadWordOfDay() {
        const card = getEl('wodCard');
        if (!card) return;

        showSkeleton();

        try {
            const lang = localStorage.getItem('language') || 'es';
            const res = await fetch(`/api/chat/word-of-day?lang=${lang}`);
            if (!res.ok) throw new Error('Network error');
            wodData = await res.json();
            renderWidget(wodData);
        } catch (err) {
            console.warn('[WoD] Failed to load word of day:', err.message);
            renderError();
        }
    }

    // ---- Skeleton loader ----
    function showSkeleton() {
        const inner = getEl('wodInner');
        if (!inner) return;
        inner.innerHTML = `
            <div class="animate-pulse space-y-4 p-6">
                <div class="h-4 bg-white/20 rounded w-1/4"></div>
                <div class="h-8 bg-white/30 rounded w-1/2 mx-auto"></div>
                <div class="h-4 bg-white/20 rounded w-3/4 mx-auto"></div>
                <div class="h-10 bg-white/20 rounded w-full mt-4"></div>
            </div>`;
    }

    function handleNotLoggedIn(az, isEn) {
        if (!az) return;
        az.innerHTML = `
            <div class="bg-red-900/40 border border-red-400/30 rounded-xl p-4 text-center mt-4">
                <p class="text-white text-sm mb-3 font-medium">${isEn ? "Register to participate in the daily challenge and see your progress." : "Regístrate para participar en el desafío diario y ver tu progreso."}</p>
                <a href="${isEn ? '/en/register/' : '/Registro/'}" class="inline-block bg-white text-red-700 px-6 py-2 rounded-lg font-bold text-sm hover:bg-red-50 transition-all shadow-lg active:scale-95">${isEn ? "Register for free" : "Registrarme gratis"}</a>
            </div>
        `;
        // Only unhide the example sentence translation so they have some context, 
        // but DO NOT unhide the main translation block at the bottom
        getEl('wodExampleTranslation')?.classList.remove('hidden');
    }

    function handleAlreadyAnswered(az, feedback, isEn) {
        if (az) az.classList.add('hidden');

        // Show translation and persistent message
        getEl('wodTranslation')?.classList.remove('hidden');
        getEl('wodExampleTranslation')?.classList.remove('hidden');

        if (feedback) {
            feedback.className = 'mt-3 rounded-lg px-4 py-3 text-sm font-medium bg-red-400/20 border border-red-400/40 text-red-100';
            feedback.innerHTML = `<i class="fas fa-check-circle mr-2 text-red-300"></i>${isEn ? "You already completed today's challenge!" : "¡Ya has completado el desafío de hoy!"}`;
            feedback.classList.remove('hidden');
        }
    }

    // ---- Render widget ----
    function renderWidget(data) {
        const inner = getEl('wodInner');
        if (!inner) return;

        const lang = localStorage.getItem('language') || 'es';
        const isEn = lang === 'en';

        const lvlCode = data.level_badge ? data.level_badge.substring(0, 2) : 'A1';
        const lvlBg = LEVEL_COLORS[lvlCode] || LEVEL_COLORS['A1'];
        const lvlText = data.level_badge;

        inner.innerHTML = getWidgetHTML(data, isEn, lvlBg, lvlText);

        // Check if user is logged in (using global auth state if available)
        const isUserLoggedIn = !!(
            localStorage.getItem('token') ||
            localStorage.getItem('authToken') ||
            localStorage.getItem('currentUser') ||
            globalThis.AuthService?.isLoggedIn()
        );
        const storageKey = getStorageKey();
        const localAnswered = localStorage.getItem(storageKey) === data.character;

        if (!isUserLoggedIn) {
            handleNotLoggedIn(getEl('wodAnswerZone'), isEn);
        } else if (localAnswered) {
            // Already answered today
            answered = true;
            handleAlreadyAnswered(getEl('wodAnswerZone'), getEl('wodFeedback'), isEn);
        }

        bindEvents();
    }

    // ---- Event bindings ----
    function bindEvents() {
        // Verify answer
        const checkBtn = getEl('wodCheckBtn');
        const input = getEl('wodAnswerInput');

        if (checkBtn && input) {
            const doCheck = () => {
                if (answered) return;
                const userAnswer = input.value.trim();
                if (!userAnswer) return;
                checkAnswer(userAnswer, wodData.word_translation);
            };
            checkBtn.addEventListener('click', doCheck);
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doCheck(); });
        }

        // Reveal translation
        getEl('wodRevealBtn')?.addEventListener('click', () => {
            if (answered) return;
            const div = getEl('wodTranslation');
            const exTr = getEl('wodExampleTranslation');
            if (div) { div.classList.remove('hidden'); }
            if (exTr) exTr.classList.remove('hidden');

            const answerZone = getEl('wodAnswerZone');
            if (answerZone) answerZone.classList.add('hidden');

            saveWodAnalytics(wodData.character, null, false, wodData.level_badge);
            answered = true;
            localStorage.setItem(getStorageKey(), wodData.character); // Persist locally
        });

        // Show tip
        getEl('wodTipBtn')?.addEventListener('click', () => {
            getEl('wodTip')?.classList.toggle('hidden');
        });
    }

    // ---- Answer checking ----
    function checkAnswer(userAnswer, correctAnswer) {
        const feedback = getEl('wodFeedback');
        const input = getEl('wodAnswerInput');
        if (!feedback) return;

        const normUser = normalizeAnswer(userAnswer);
        const normCorrect = normalizeAnswer(correctAnswer);

        // Check for exact match or near-match (contains the key word)
        const isCorrect = normUser === normCorrect ||
            (normCorrect.includes(normUser) && normUser.length >= Math.max(3, normCorrect.length / 2));

        // Save to analytics
        saveWodAnalytics(wodData.character, userAnswer, isCorrect, wodData.level_badge);

        if (isCorrect) {
            // Hide answer zone after submitting correctly
            const answerZone = getEl('wodAnswerZone');
            if (answerZone) answerZone.classList.add('hidden');

            const div = getEl('wodTranslation');
            const exTr = getEl('wodExampleTranslation');
            if (div) div.classList.remove('hidden');
            if (exTr) exTr.classList.remove('hidden');

            answered = true;
            localStorage.setItem(getStorageKey(), wodData.character);
        }

        const isEn = localStorage.getItem('language') === 'en';
        displayFeedback(feedback, input, isCorrect, isEn);

        feedback.classList.remove('hidden');
    }

    // ---- Analytics helper ----
    async function saveWodAnalytics(word, guess, isCorrect, level) {
        try {
            // Get user info if available
            let username = 'guest';
            let country = 'unknown';

            try {
                const userKey = globalThis.APP_CONFIG?.AUTH?.USER_KEY || 'currentUser';
                const userStr = localStorage.getItem(userKey);
                if (userStr) {
                    const userObj = JSON.parse(userStr);
                    username = userObj.username || 'guest';
                    country = userObj.country || 'unknown';
                }
            } catch (error) {
                console.warn('Could not parse user info for analytics', error);
            }

            await fetch('/api/analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'word_of_day_attempt',
                    word: word,
                    guess: guess,
                    isCorrect: isCorrect,
                    level: level,
                    username: username,
                    country: country,
                    url: globalThis.location.pathname,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (err) {
            console.warn('[wod-analytics] Failed to save attempt:', err.message);
        }
    }

    // ---- Error state ----
    function renderError() {
        const inner = getEl('wodInner');
        if (!inner) return;
        inner.innerHTML = `
            <div class="text-center py-6">
                <i class="fas fa-wifi-slash text-3xl text-white/40 mb-3"></i>
                <p class="text-white/60 text-sm">No se pudo cargar la palabra del día.</p>
                <button data-action="wod-retry" class="mt-3 text-sm text-white/70 hover:text-white underline">Reintentar</button>
            </div>`;
    }

    // ---- Escape HTML ----
    function escHtml(str) {
        return String(str ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;');
    }

    // ---- Delegated retry handler ----
    function setupRetryDelegate() {
        const card = getEl('wodCard');
        if (!card) return;
        card.addEventListener('click', (e) => {
            if (e.target.closest('[data-action="wod-retry"]')) loadWordOfDay();
        });
    }

    // ---- Boot ----
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { setupRetryDelegate(); loadWordOfDay(); });
    } else {
        setupRetryDelegate();
        loadWordOfDay();
    }
})();

