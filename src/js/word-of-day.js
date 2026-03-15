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

    function displayFeedback(feedback, input, isCorrect, isEn, isTr, attemptsLeft) {
        if (isCorrect) {
            feedback.className = 'mt-3 rounded-lg px-4 py-3 text-sm font-medium transition-all bg-green-400/20 border border-green-400/40 text-green-100';

            let msg = '¡Correcto! 🎉 Bien hecho.';
            if (isTr) msg = 'Doğru! 🎉 Harika iş.';
            else if (isEn) msg = 'Correct! 🎉 Well done.';

            feedback.innerHTML = `<i class="fas fa-circle-check mr-2 text-green-300"></i>${msg}`;
            if (input) {
                input.classList.add('border-green-400/60', 'bg-green-400/10');
                input.classList.remove('border-white/20', 'border-red-400/60', 'bg-red-400/10');
            }
        } else {
            feedback.className = 'mt-3 rounded-lg px-4 py-3 text-sm font-medium transition-all bg-red-400/20 border border-red-400/40 text-red-100';

            let msg = 'Incorrecto, ¡intenta de nuevo!';
            if (attemptsLeft === 1) {
                msg = '⚠️ ¡Último intento!';
                if (isEn) msg = '⚠️ Last attempt!';
                else if (isTr) msg = '⚠️ Son deneme!';
            } else {
                if (isTr) msg = 'Yanlış, tekrar dene!';
                else if (isEn) msg = "Incorrect, try again!";
            }

            feedback.innerHTML = `<i class="fas fa-circle-xmark mr-2 text-red-300"></i>${msg}`;
            if (input) {
                input.classList.add('border-red-400/60', 'bg-red-400/10');
                input.classList.remove('border-white/20', 'border-green-400/60', 'bg-green-400/10');
                input.value = '';
                input.focus();
            }
        }
    }

    const TRANSLATIONS = {
        es: {
            title: "Palabra del Día",
            answerLabel: "¿Cómo se traduce?",
            answerPlaceholder: "Traducción al español...",
            verifyText: "Verificar",
            glossaryText: "Ver glosario de palabras anteriores",
            translationLabel: "Traducción",
            glossaryLink: "/Glosario/"
        },
        en: {
            title: "Word of the Day",
            answerLabel: "How do you translate it?",
            answerPlaceholder: "English translation...",
            verifyText: "Verify",
            glossaryText: "View past words glossary",
            translationLabel: "Translation",
            glossaryLink: "/en/Glosario/"
        },
        tr: {
            title: "Günün Kelimesi",
            answerLabel: "Nasıl çevirirsiniz?",
            answerPlaceholder: "Türkçe çeviri...",
            verifyText: "Doğrula",
            glossaryText: "Geçmiş kelimeler sözlüğünü gör",
            translationLabel: "Çeviri",
            glossaryLink: "/tr/Glosario/"
        }
    };

    function getWidgetHTML(data, isEn, isTr, lvlBg, lvlText) {
        let langCode = 'es';
        if (isTr) langCode = 'tr';
        else if (isEn) langCode = 'en';
        const t = TRANSLATIONS[langCode];

        const currentTranslation = data.word_translation;
        const currentExampleTranslation = data.sentence_translation;
        const currentTip = data.tip;

        return `
            <!-- Header row -->
            <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div class="flex items-center gap-2 text-white/70 text-xs sm:text-sm font-semibold uppercase tracking-wider">
                    <i class="fas fa-star text-yellow-300"></i> ${t.title}
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
                    <i class="fas fa-pencil mr-1"></i>${t.answerLabel}
                </label>
                <div class="flex gap-2">
                    <input id="wodAnswerInput"
                        type="text"
                        placeholder="${t.answerPlaceholder}"
                        class="flex-1 min-w-0 px-3 py-2.5 rounded-lg bg-white/15 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/20 transition-all"
                    />
                    <button id="wodCheckBtn"
                        class="shrink-0 px-3 sm:px-4 py-2.5 bg-white text-red-700 font-bold rounded-lg text-sm hover:bg-white/90 transition-all shadow hover:shadow-lg active:scale-95">
                        <span class="hidden sm:inline">${t.verifyText}</span>
                        <i class="fas fa-check sm:hidden"></i>
                    </button>
                </div>
            </div>
            <!-- Feedback area (outside zone so it stays visible) -->
            <div id="wodFeedback" class="mt-3 hidden rounded-lg px-4 py-3 text-sm font-medium transition-all"></div>

            <!-- View Glossary link -->
            <div class="flex gap-3 mt-2">
                <a href="${t.glossaryLink}" id="wodRevealGlossary"
                    class="flex-1 py-2.5 px-4 rounded-lg border border-white/30 text-white/80 text-sm font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                    <i class="fas fa-book"></i> ${t.glossaryText}
                </a>
                <button id="wodTipBtn"
                    class="py-2.5 px-4 rounded-lg border border-white/30 text-white/80 text-sm font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                    <i class="fas fa-lightbulb"></i> Tip
                </button>
            </div>

            <!-- Translation (hidden until revealed) -->
            <div id="wodTranslation"
                class="hidden mt-4 text-center p-4 bg-white/15 rounded-xl border border-white/20 transition-all">
                <div class="text-white/60 text-xs uppercase tracking-wider mb-1">${t.translationLabel}</div>
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

    // Local storage key helper — includes username so different users on the same browser don't share WoD state
    const getStorageKey = (username) => {
        const today = new Date().toISOString().slice(0, 10);
        return username ? `wod_answered_${today}_${username}` : `wod_answered_global_${today}`;
    };

    // Helper to get current logged-in username from localStorage
    const getCurrentUsername = () => {
        try {
            const userKey = globalThis.APP_CONFIG?.AUTH?.USER_KEY || 'currentUser';
            const userStr = localStorage.getItem(userKey);
            if (userStr) return JSON.parse(userStr)?.username || null;
        } catch { /* ignore */ }
        return null;
    };

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

    function handleNotLoggedIn(az, isEn, isTr) {
        if (!az) return;

        let msg = "Regístrate para participar en el desafío diario y ver tu progreso.";
        let btn = "Registrarme gratis";
        let link = "/Registro/";

        if (isTr) {
            msg = "Günlük mücadeleye katılmak ve ilerlemenizi görmek için kayıt olun.";
            btn = "Ücretsiz kayıt ol";
            link = "/tr/register/";
        } else if (isEn) {
            msg = "Register to participate in the daily challenge and see your progress.";
            btn = "Register for free";
            link = "/en/register/";
        }

        az.innerHTML = `
            <div class="bg-red-900/40 border border-red-400/30 rounded-xl p-4 text-center mt-4">
                <p class="text-white text-sm mb-3 font-medium">${msg}</p>
                <a href="${link}" class="inline-block bg-white text-red-700 px-6 py-2 rounded-lg font-bold text-sm hover:bg-red-50 transition-all shadow-lg active:scale-95">${btn}</a>
            </div>
        `;
        // Only unhide the example sentence translation so they have some context, 
        // but DO NOT unhide the main translation block at the bottom
        getEl('wodExampleTranslation')?.classList.remove('hidden');
    }

    function handleAlreadyAnswered(az, feedback, isEn, isTr) {
        if (az) az.classList.add('hidden');

        // Show translation and persistent message
        getEl('wodTranslation')?.classList.remove('hidden');
        getEl('wodExampleTranslation')?.classList.remove('hidden');

        if (feedback) {
            let msg = "¡Ya has completado el desafío de hoy!";
            if (isTr) msg = "Bugünün mücadelesini zaten tamamladınız!";
            else if (isEn) msg = "You already completed today's challenge!";

            feedback.className = 'mt-3 rounded-lg px-4 py-3 text-sm font-medium bg-red-400/20 border border-red-400/40 text-red-100';
            feedback.innerHTML = `<i class="fas fa-check-circle mr-2 text-red-300"></i>${msg}`;
            feedback.classList.remove('hidden');
        }
    }

    // ---- Render widget ----
    function renderWidget(data) {
        const inner = getEl('wodInner');
        if (!inner) return;

        const lang = localStorage.getItem('language') || 'es';
        const isEn = lang === 'en';
        const isTr = lang === 'tr';

        const lvlCode = data.level_badge ? data.level_badge.substring(0, 2) : 'A1';
        const lvlBg = LEVEL_COLORS[lvlCode] || LEVEL_COLORS['A1'];
        const lvlText = data.level_badge;

        inner.innerHTML = getWidgetHTML(data, isEn, isTr, lvlBg, lvlText);

        // Check if user is logged in (using global auth state if available)
        const isUserLoggedIn = !!(
            localStorage.getItem('token') ||
            localStorage.getItem('authToken') ||
            localStorage.getItem('currentUser') ||
            globalThis.AuthService?.isLoggedIn()
        );
        const currentUsername = getCurrentUsername();
        const storageKey = getStorageKey(currentUsername);
        const localAnswered = localStorage.getItem(storageKey) === data.character;

        if (!isUserLoggedIn) {
            handleNotLoggedIn(getEl('wodAnswerZone'), isEn, isTr);
        } else if (localAnswered) {
            // Already answered today
            answered = true;
            handleAlreadyAnswered(getEl('wodAnswerZone'), getEl('wodFeedback'), isEn, isTr);
        }

        bindEvents();
    }

    // ---- Event bindings ----
    function bindEvents() {
        const checkBtn = getEl('wodCheckBtn');
        const input = getEl('wodAnswerInput');
        let attemptsLeft = 3;

        // Inject attempt counter badge under the input row
        if (input && checkBtn && !answered) {
            const lang = localStorage.getItem('language') || 'es';
            const isEn = lang === 'en';
            const isTr = lang === 'tr';
            
            let counterLabel = 'intentos restantes';
            if (isEn) counterLabel = 'attempts remaining';
            else if (isTr) counterLabel = 'deneme hakkı kaldı';

            const badge = document.createElement('div');
            badge.id = 'wodAttemptBadge';
            badge.className = 'mt-1 text-right text-xs font-semibold text-white/40 transition-all';
            badge.innerHTML = `<span id="wodAttemptCount">3</span> ${counterLabel}`;
            input.closest('div')?.after(badge);
        }

        if (checkBtn && input) {
            const doCheck = () => {
                if (answered) return;
                const userAnswer = input.value.trim();
                if (!userAnswer) return;
                checkAnswer(userAnswer, wodData.word_translation, attemptsLeft, (n) => { attemptsLeft = n; });
            };
            checkBtn.addEventListener('click', doCheck);
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doCheck(); });
        }

        getEl('wodRevealBtn')?.addEventListener('click', () => {
            if (answered) return;
            const div = getEl('wodTranslation');
            const exTr = getEl('wodExampleTranslation');
            if (div) div.classList.remove('hidden');
            if (exTr) exTr.classList.remove('hidden');
            getEl('wodAnswerZone')?.classList.add('hidden');
            getEl('wodAttemptBadge')?.remove();
            saveWodAnalytics(wodData.character, null, false, wodData.level_badge);
            answered = true;
            localStorage.setItem(getStorageKey(getCurrentUsername()), wodData.character);
        });

        getEl('wodTipBtn')?.addEventListener('click', () => {
            getEl('wodTip')?.classList.toggle('hidden');
        });
    }

    // ---- Answer checking ----
    function checkAnswer(userAnswer, correctAnswer, attemptsLeft, setAttempts) {
        const feedback = getEl('wodFeedback');
        const input = getEl('wodAnswerInput');
        if (!feedback) return;

        const normUser = normalizeAnswer(userAnswer);
        const normCorrect = normalizeAnswer(correctAnswer);

        const isCorrect = normUser === normCorrect ||
            (normCorrect.split(/\s+/).length === 1 &&
                normUser.length >= Math.ceil(normCorrect.length * 0.9) &&
                normCorrect.startsWith(normUser));

        const isEn = localStorage.getItem('language') === 'en';
        const isTr = localStorage.getItem('language') === 'tr';

        if (isCorrect) {
            saveWodAnalytics(wodData.character, userAnswer, true, wodData.level_badge);
            getEl('wodAnswerZone')?.classList.add('hidden');
            getEl('wodAttemptBadge')?.remove();
            getEl('wodTranslation')?.classList.remove('hidden');
            getEl('wodExampleTranslation')?.classList.remove('hidden');
            answered = true;
            localStorage.setItem(getStorageKey(getCurrentUsername()), wodData.character);
            return;
        }

        const newAttempts = (attemptsLeft ?? 3) - 1;
        if (setAttempts) setAttempts(newAttempts);

        const countEl = getEl('wodAttemptCount');
        const badge = getEl('wodAttemptBadge');
        if (countEl) countEl.textContent = newAttempts;
        if (badge) {
            if (newAttempts === 1) badge.className = 'mt-1 text-right text-xs font-bold text-red-300 animate-pulse transition-all';
            else if (newAttempts === 2) badge.className = 'mt-1 text-right text-xs font-semibold text-yellow-300 transition-all';
        }

        if (newAttempts <= 0) {
            getEl('wodAnswerZone')?.classList.add('hidden');
            getEl('wodAttemptBadge')?.remove();
            getEl('wodTranslation')?.classList.remove('hidden');
            getEl('wodExampleTranslation')?.classList.remove('hidden');
            answered = true;
            localStorage.setItem(getStorageKey(getCurrentUsername()), wodData.character);
            
            feedback.className = 'mt-3 rounded-lg px-4 py-3 text-sm font-medium transition-all bg-red-400/20 border border-red-400/40 text-red-100';
            let msg = 'Sin intentos. La respuesta era:';
            if (isEn) msg = 'No attempts left. The answer was:';
            else if (isTr) msg = 'Deneme hakkı kalmadı. Cevap:';
            
            feedback.innerHTML = `<i class="fas fa-circle-xmark mr-2 text-red-300"></i>${msg} <strong>${escHtml(correctAnswer)}</strong>`;
            feedback.classList.remove('hidden');
            return;
        }

        displayFeedback(feedback, isCorrect ? null : input, isCorrect, isEn, isTr, attemptsLeft);
    }

    // ---- WoD Stats helper ----
    async function saveWodAnalytics(word, guess, isCorrect, level) {
        try {
            // Get user info from localStorage if available
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
                console.warn('Could not parse user info for WoD stats', error);
            }

            const date = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
            const token = localStorage.getItem('token') || localStorage.getItem('authToken');

            await fetch('/api/wod/attempt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    date,
                    character: word,
                    isCorrect,
                    username,
                    country
                })
            });
        } catch (err) {
            console.warn('[wod-stats] Failed to save attempt:', err.message);
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

