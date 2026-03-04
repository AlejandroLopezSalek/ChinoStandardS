// ========================================
// GLOSARIO DE PALABRAS
// ========================================

(function () {
    'use strict';

    const LEVEL_COLORS = {
        A1: { bg: 'bg-green-500', text: 'A1 – Principiante' },
        A2: { bg: 'bg-orange-500', text: 'A2 – Elemental' },
        B1: { bg: 'bg-red-500', text: 'B1 – Intermedio' },
        B2: { bg: 'bg-red-500', text: 'B2 – Intermedio Alto' },
        C1: { bg: 'bg-orange-500', text: 'C1 – Avanzado' }
    };

    let pastWords = [];

    const getEl = (id) => document.getElementById(id);

    function escHtml(str) {
        return String(str ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;');
    }

    async function init() {
        const container = getEl('glossaryContainer');
        if (!container) return;

        try {
            const res = await fetch('/api/chat/past-words');
            if (!res.ok) throw new Error('Network response was not ok');
            const allWords = await res.json();

            const lang = localStorage.getItem('language') || 'es';
            pastWords = allWords.filter(w => {
                // Return entries matching current language, or fallback old entries without language suffix
                return w.date.endsWith(`_${lang}`) || !w.date.includes('_');
            });

            renderGlossary(pastWords, container);
        } catch (err) {
            console.error('[Glossary] Error loading past words:', err);
            container.innerHTML = `
                <div class="text-center py-20 text-stone-500">
                    <i class="fas fa-exclamation-triangle text-4xl mb-4 text-red-400"></i>
                    <p class="text-lg">Error al cargar el glosario. Por favor, intenta más tarde.</p>
                </div>
            `;
        }

        const modal = getEl('wordModal');
        if (modal) {
            document.body.appendChild(modal); // Move to body to ensure fixed positioning covers the whole screen
        }

        // Setup modal close
        getEl('closeWordBg')?.addEventListener('click', closeModal);
        getEl('closeWordBtn')?.addEventListener('click', closeModal);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModal();
        });
    }

    function renderGlossary(words, container) {
        if (!words || words.length === 0) {
            container.innerHTML = '<p class="text-center text-stone-500 py-10">Aún no hay palabras en el glosario.</p>';
            return;
        }

        // Group by first letter (using pinyin if available, fallback to character)
        const groups = {};
        words.forEach(w => {
            if (!w.character) return;
            const data = { ...w };
            if (!data.pinyin) data.pinyin = data.character;
            if (!data.tip) data.tip = "Practica esta palabra para mejorar tu vocabulario.";

            // Try to extract first English letter from pinyin
            let firstLetter = data.pinyin.trim().charAt(0).toUpperCase();
            // Remove diacritics for sorting
            firstLetter = firstLetter.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (!/[A-Z]/.test(firstLetter)) firstLetter = '#';

            if (!groups[firstLetter]) groups[firstLetter] = [];
            groups[firstLetter].push(data);
        });

        // Sort letters
        const sortedLetters = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'tr'));

        let html = '';

        sortedLetters.forEach(letter => {
            // Sort words within the letter alphabetically by pinyin
            groups[letter].sort((a, b) => a.pinyin.localeCompare(b.pinyin, 'en'));

            html += `
                <div class="mb-4">
                    <h3 class="text-3xl font-black text-stone-300 dark:text-stone-600 mb-6 flex items-center gap-4">
                        <span>${letter}</span>
                        <div class="h-px bg-stone-200 dark:bg-stone-700 flex-grow mt-2"></div>
                    </h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        ${groups[letter].map(w => {
                const lvlCode = w.level_badge ? w.level_badge.substring(0, 2) : 'A1';
                const lvl = LEVEL_COLORS[lvlCode] || LEVEL_COLORS['A1'];
                // Check if answered locally
                const storageKey = 'wod_answered_' + w.date;
                const isAnswered = localStorage.getItem(storageKey) === w.character;
                const checkIcon = isAnswered
                    ? '<div class="absolute -top-2 -right-2 bg-white dark:bg-stone-800 rounded-full shadow-sm p-1"><i class="fas fa-check-circle text-green-500 text-lg leading-none"></i></div>'
                    : '';

                return `
                                <div class="word-card cursor-pointer group bg-white dark:bg-stone-800 rounded-xl p-5 shadow-sm border border-stone-200 dark:border-stone-700 hover:shadow-lg hover:-translate-y-1 hover:border-red-400 dark:hover:border-red-500 transition-all relative flex flex-col h-full" data-date="${escHtml(w.date)}">
                                    ${checkIcon}
                                    <div class="flex items-center gap-2 mb-3">
                                        <span class="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm ${lvl.bg}">${w.level_badge || 'A1'}</span>
                                        <span class="text-xs text-stone-400 font-medium ml-auto flex items-center gap-1"><i class="fas fa-calendar-alt opacity-50"></i> ${new Date(w.date.split('_')[0]).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</span>
                                    </div>
                                    <h4 class="text-xl font-bold text-stone-800 dark:text-stone-100 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors line-clamp-2 mb-2 break-words" title="${escHtml(w.character)}">${escHtml(w.character)}</h4>
                                    <span class="text-xs text-stone-500 mb-2">${escHtml(w.pinyin)}</span>
                                    
                                    <div class="mt-auto pt-3 border-t border-stone-100 dark:border-stone-700/50">
                                        <p class="text-sm font-medium ${isAnswered ? 'text-stone-600 dark:text-stone-300' : 'text-stone-400 font-semibold'}" title="${escHtml(w.word_translation)}">${isAnswered ? escHtml(w.word_translation) : 'Falta completar'}</p>
                                    </div>
                                </div>
                            `;
            }).join('')}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Attach clicks
        const handleCardClick = (e) => {
            const card = e.currentTarget;
            const date = card.dataset.date;
            const wordData = words.find(w => w.date === date);
            if (wordData) openWordModal(wordData);
        };

        container.querySelectorAll('.word-card').forEach(card => {
            card.addEventListener('click', handleCardClick);
        });
    }

    function openWordModal(data) {
        const modal = getEl('wordModal');
        const inner = getEl('modalWodInner');
        if (!modal || !inner) return;

        const lvlCode = data.level_badge ? data.level_badge.substring(0, 2) : 'A1';
        const lvlBg = LEVEL_COLORS[lvlCode] ? LEVEL_COLORS[lvlCode].bg : LEVEL_COLORS['A1'].bg;

        const storageKey = 'wod_answered_' + data.date;
        const localAnswered = localStorage.getItem(storageKey) === data.character;

        inner.innerHTML = `
            <!-- Header row -->
            <div class="flex flex-wrap items-center justify-between gap-2 mb-4 pr-6">
                <div class="flex items-center gap-2 text-white/80 text-xs sm:text-sm font-semibold uppercase tracking-wider">
                    <i class="fas fa-calendar text-yellow-300"></i> ${new Date(data.date.split('_')[0]).toLocaleDateString()}
                </div>
                <span class="px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-bold text-white ${lvlBg} shadow whitespace-nowrap">${data.level_badge || 'A1'}</span>
            </div>

            <!-- Chinese word -->
            <div class="text-center mb-2 mt-4">
                <div class="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2 leading-tight">${escHtml(data.character)}</div>
                <div class="text-white/70 text-sm font-medium"><i class="fas fa-volume-low mr-1"></i>${escHtml(data.pinyin)}</div>
            </div>

            <!-- Example sentence -->
            <div class="bg-white/10 rounded-xl p-4 my-5 text-center shadow-inner">
                <p class="text-white/95 italic sm:text-base text-sm font-medium leading-relaxed">"${escHtml(data.sentence_character)}"</p>
                <p class="text-white/70 text-xs mt-2 transition-all duration-300">${escHtml(data.sentence_pinyin)}</p>
                <p id="glosExampleTranslation" class="text-white/60 text-xs mt-2 transition-all duration-300 ${localAnswered ? '' : 'hidden'}">${escHtml(data.sentence_translation)}</p>
            </div>

            <!-- Answer input zone -->
            <div id="glosAnswerZone" class="mb-4 ${localAnswered ? 'hidden' : ''}">
                <label class="block text-white/80 text-xs font-semibold uppercase tracking-wider mb-2 ml-1">
                    <i class="fas fa-pencil mr-1"></i>¿Cómo se traduce?
                </label>
                <div class="flex gap-2">
                    <input id="glosAnswerInput" type="text" placeholder="Traducción al español..." class="flex-1 min-w-0 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/20 transition-all font-medium"/>
                    <button id="glosCheckBtn" class="shrink-0 px-4 py-3 bg-white text-red-700 font-bold rounded-xl text-sm hover:bg-white/90 transition-all shadow-md hover:shadow-lg active:scale-95">
                        <span class="hidden sm:inline">Verificar</span>
                        <i class="fas fa-check sm:hidden"></i>
                    </button>
                </div>
            </div>

            <div id="glosFeedback" class="mt-4 ${localAnswered ? 'bg-green-500/20 border-green-400/30 text-green-50 block' : 'hidden'} rounded-xl px-4 py-3 text-sm font-medium transition-all border shadow-sm">
                ${localAnswered ? '<i class="fas fa-check-circle mr-2 text-green-300"></i>¡Ya has completado esta palabra!' : ''}
            </div>

            <!-- Reveal buttons -->
            <div class="flex gap-3 mt-4">
                <button id="glosRevealBtn" class="flex-1 py-3 px-4 rounded-xl border border-white/20 text-white text-sm font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-2 shadow-sm ${localAnswered ? 'hidden' : ''}">
                    <i class="fas fa-eye"></i> Ver traducción
                </button>
                <button id="glosTipBtn" class="py-3 px-4 rounded-xl border border-white/20 text-white text-sm font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-2 shadow-sm">
                    <i class="fas fa-lightbulb"></i> Tip
                </button>
            </div>

            <!-- Translation -->
            <div id="glosTranslation" class="${localAnswered ? '' : 'hidden'} mt-5 text-center p-5 bg-white/10 rounded-2xl border border-white/20 transition-all shadow-inner backdrop-blur-sm">
                <div class="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-2">Traducción</div>
                <div class="text-3xl font-black text-white px-2 leading-tight">${escHtml(data.word_translation)}</div>
            </div>

            <!-- Tip -->
            <div id="glosTip" class="hidden mt-4 p-4 bg-yellow-400/20 border border-yellow-300/40 rounded-xl text-yellow-50 text-sm leading-relaxed shadow-sm font-medium">
                <i class="fas fa-lightbulb text-yellow-300 mr-2 text-lg float-left"></i>
                <div class="pl-7">${escHtml(data.tip)}</div>
            </div>
        `;

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';

        setTimeout(() => getEl('glosAnswerInput')?.focus(), 100);

        bindModalEvents(data, storageKey);
    }

    function bindModalEvents(data, storageKey) {
        let answered = localStorage.getItem(storageKey) === data.character;

        const checkBtn = getEl('glosCheckBtn');
        const input = getEl('glosAnswerInput');

        const doCheck = () => {
            if (answered) return;
            const userAnswer = input?.value.trim();
            if (!userAnswer) return;

            const normalize = (s) => s.toLowerCase()
                .normalize('NFD').replaceAll(/[\u0300-\u036f]/gu, '')
                .replaceAll(/[^a-z0-9\s]/gu, '').trim();

            const normUser = normalize(userAnswer);
            const normCorrect = normalize(data.word_translation);

            const isCorrect = normUser === normCorrect ||
                normCorrect.includes(normUser) ||
                normUser.includes(normCorrect);

            getEl('glosAnswerZone')?.classList.add('hidden');
            const feedback = getEl('glosFeedback');
            if (feedback) {
                if (isCorrect) {
                    feedback.className = 'mt-4 rounded-xl px-4 py-3 text-sm font-medium transition-all bg-green-500/20 border border-green-400/40 text-green-50 block shadow-sm';
                    feedback.innerHTML = '<i class="fas fa-circle-check mr-2 text-green-300 text-lg align-text-bottom"></i> ¡Correcto! 🎉 Bien hecho.';
                } else {
                    feedback.className = 'mt-4 rounded-xl px-4 py-3 text-sm font-medium transition-all bg-red-500/20 border border-red-400/40 text-red-50 block shadow-sm';
                    feedback.innerHTML = `<i class="fas fa-circle-xmark mr-2 text-red-300 text-lg align-text-bottom"></i> La traducción correcta era: <strong class="text-white">${escHtml(data.word_translation)}</strong>`;
                }
            }

            getEl('glosTranslation')?.classList.remove('hidden');
            getEl('glosExampleTranslation')?.classList.remove('hidden');
            getEl('glosRevealBtn')?.classList.add('hidden');

            answered = true;
            localStorage.setItem(storageKey, data.character);

            reRenderGlossary();
        };

        if (checkBtn && input) {
            checkBtn.addEventListener('click', doCheck);
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doCheck(); });
        }

        getEl('glosRevealBtn')?.addEventListener('click', () => {
            if (answered) return;
            getEl('glosTranslation')?.classList.remove('hidden');
            getEl('glosExampleTranslation')?.classList.remove('hidden');
            getEl('glosAnswerZone')?.classList.add('hidden');
            getEl('glosRevealBtn')?.classList.add('hidden');

            answered = true;
            localStorage.setItem(storageKey, data.character);

            reRenderGlossary();
        });

        getEl('glosTipBtn')?.addEventListener('click', () => {
            getEl('glosTip')?.classList.toggle('hidden');
        });
    }

    function reRenderGlossary() {
        const container = getEl('glossaryContainer');
        if (container && pastWords.length > 0) {
            // Re-render in background to show checkmarks
            renderGlossary(pastWords, container);
        }
    }

    function closeModal() {
        const modal = getEl('wordModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.body.style.overflow = '';
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
