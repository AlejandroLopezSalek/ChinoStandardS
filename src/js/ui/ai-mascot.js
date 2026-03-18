// Make functions global for Settings Panel control
globalThis.initMascot = initMascot;
globalThis.removeMascotUI = removeMascotUI;

document.addEventListener('DOMContentLoaded', () => {
    initMascot();
});

function initMascot() {
    // Check if disabled by user
    if (localStorage.getItem('panda_disabled') === 'true') {
        const btn = document.getElementById('panda-btn');
        if (btn) btn.classList.add('hidden');
        return;
    }

    createMascotUI();

    // Welcome flow: Check if seen. If NOT seen, show welcome modal.
    if (!localStorage.getItem('panda_welcome_seen')) {
        showWelcomeModal();
    }
}

function removeMascotUI() {
    const btn = document.getElementById('panda-btn');
    const chat = document.getElementById('panda-chat');
    if (btn) {
        btn.classList.add('scale-0', 'opacity-0');
        // Do NOT remove, just hide. It might be needed again if re-enabled.
        // But if we want to truly disable, we can add 'hidden' after transition
        setTimeout(() => btn.classList.add('hidden'), 300);
    }
    if (chat) {
        chat.classList.add('opacity-0', 'translate-y-10');
        setTimeout(() => chat.classList.add('hidden'), 300);
    }
}

function createMascotUI() {
    // 1. Get or Create Floating Button
    let mascotBtn = document.getElementById('panda-btn');

    if (mascotBtn) {
        // If exists (hidden or not), ensure it's visible
        mascotBtn.classList.remove('hidden');
        // Animation handled below
    } else {
        mascotBtn = document.createElement('div');
        mascotBtn.id = 'panda-btn';
        mascotBtn.className = 'fixed bottom-6 right-6 z-[9990] cursor-pointer group transition-all duration-300 hover:scale-110 transform scale-0 opacity-0'; // Start hidden for animation
        const lang = localStorage.getItem('language') || 'es';

        const TEXTS = {
            es: { bubbleText: "¡Hola! Soy Panda" },
            en: { bubbleText: "Hello! I'm Panda" },
            tr: { bubbleText: "Merhaba! Ben Panda" }
        };

        mascotBtn.innerHTML = `
            <div class="relative flex items-center justify-center w-[75px] h-[75px] md:w-[130px] md:h-[130px]">
                 
                 <!-- Mobile Backgrounds -->
                 <div class="absolute inset-0 bg-gradient-to-tr from-red-500 via-orange-500 to-pink-500 opacity-20 dark:opacity-40 rounded-2xl md:hidden"></div>
                 <div class="absolute inset-[2px] bg-white dark:bg-stone-800 rounded-xl md:hidden"></div>

                 <!-- Desktop Speech Bubble -->
                 <div class="absolute -top-12 right-0 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-sm py-1 px-3 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-stone-200 dark:border-stone-700 hidden md:block">
                    ${TEXTS[lang].bubbleText}
                </div>

                <!-- Replace Image with Emoji -->
                <div class="relative z-10 w-full h-full flex items-center justify-center md:filter md:drop-shadow-xl md:hover:-translate-y-1 transition-transform p-[2px] md:p-0">
                    <span class="text-4xl md:text-7xl" style="font-size: 80px; line-height: 1;">🐼</span>
                </div>

                <!-- Desktop Ping -->
                <span class="absolute top-2 right-2 flex h-4 w-4 hidden md:flex">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-4 w-4 bg-orange-500"></span>
                </span>
            </div>
        `;
        document.body.appendChild(mascotBtn);
    }

    // 2. Get or Create Chat Window (Hidden by default)
    let chatWindow = document.getElementById('panda-chat');

    // 2. Get existing Chat Window (Now in base.njk)


    // Safety check just in case
    if (!chatWindow) {
        console.warn('Panda Chat window not found in DOM');
        return;
    }

    // --- AUTO-HIDE LOGIC ---
    // --- AUTO-HIDE LOGIC ---
    let lastScrollY = globalThis.scrollY;
    let isScrollingDown = false;

    const updateVisibility = () => {
        // 1. Check Footer Intersection
        const footer = document.querySelector('footer');
        let isOverFooter = false;
        if (footer) {
            const rect = footer.getBoundingClientRect();
            // If top of footer is above bottom of viewport
            if (rect.top < globalThis.innerHeight) {
                isOverFooter = true;
            }
        }

        // 2. Check Ad Intersection (adBanner)
        const adBanner = document.getElementById('adBanner');
        let isAdVisible = false;
        if (adBanner) {
            isAdVisible = true;
        }

        // 3. Check Specific Paths
        const hiddenPaths = ['/Lesson/'];
        const currentPath = globalThis.location.pathname;
        const isHiddenPath = hiddenPaths.some(path => currentPath.includes(path));

        // Logic: Hide if (Over Footer AND Scrolling Down) OR (Ad Visible) OR (Hidden Path)
        // This ensures that if you scroll UP, Panda reappears even if over footer.
        const shouldHide = (isOverFooter && isScrollingDown) || isAdVisible || isHiddenPath;

        if (shouldHide) {
            mascotBtn.classList.add('translate-y-32', 'opacity-0', 'pointer-events-none');
        } else {
            mascotBtn.classList.remove('translate-y-32', 'opacity-0', 'pointer-events-none');
        }
    };

    // Scroll Listener
    // Scroll Listener Optimized with RAF
    let ticking = false;
    globalThis.addEventListener('scroll', () => {
        const currentY = globalThis.scrollY;

        // Simple direction and throttle via RAF
        if (!ticking) {
            globalThis.requestAnimationFrame(() => {
                const diff = Math.abs(currentY - lastScrollY);
                if (diff > 5) { // Threshold
                    isScrollingDown = currentY > lastScrollY;
                    lastScrollY = currentY;
                    updateVisibility();
                }
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });

    // Observers (Trigger update on layout changes too)
    const footerObserver = new IntersectionObserver((entries) => {
        updateVisibility();
    }, { root: null, threshold: [0, 0.1, 0.5] }); // Multiple thresholds

    const footer = document.querySelector('footer');
    if (footer) footerObserver.observe(footer);

    // Watch for Ad insertion/removal
    const adObserver = new MutationObserver(() => {
        updateVisibility();
    });
    adObserver.observe(document.body, { childList: true });

    // Initial check
    updateVisibility();

    // Reveal animation (if not hidden by logic immediately)
    requestAnimationFrame(() => {
        if (mascotBtn.classList.contains('translate-y-32')) {
            // Just remove the init scale-0, but keep opacity-0 from hide logic
            mascotBtn.classList.remove('scale-0');
        } else {
            mascotBtn.classList.remove('scale-0', 'opacity-0');
        }
    });

    // Load history on init
    loadChatHistory();

    // Event Listeners
    mascotBtn.addEventListener('click', toggleChat);

    // Close button logic fix
    const closeBtn = document.getElementById('close-chat-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent bubbling if needed
            toggleChat();
        });
    }

    const form = document.getElementById('panda-form'); // Check if this ID is still used in HTML above? No, used button directly.
    // Handling send via button and textarea enter
    const sendBtn = document.getElementById('send-msg-btn');
    const input = document.getElementById('chat-input');

    // ⚡ CRITICAL FIX: Prevent form submission reload
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            handleSend(e);
        });
    }

    if (sendBtn) sendBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Just in case
        handleSend(e);
    });

    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // Prevent newline and form submit
                handleSend(e);
            }
        });
    }
}

// --- PERSISTENCE HELPERS ---
function saveChatHistory(role, text) {
    let history = JSON.parse(sessionStorage.getItem('panda_chat_history') || '[]');
    history.push({ role, text });
    // Limit history to last 50 messages to prevent storage issues
    if (history.length > 50) history = history.slice(-50);
    sessionStorage.setItem('panda_chat_history', JSON.stringify(history));
}

function loadChatHistory() {
    const history = JSON.parse(sessionStorage.getItem('panda_chat_history') || '[]');
    // If empty, show welcome message is handled by default HTML structure or we can double check
    // Actually, HTML has specific welcome message hardcoded.
    // If history exists, we should probably clear the default "Hello" and show history, OR append history.
    // Current design: Hardcoded welcome message is always top. content adds below.

    // If we have history, we might want to preserve the visible state too?
    // For now, just load messages.
    history.forEach(msg => addMessage(msg.role, msg.text, false));

    // Auto-open if it was open?
    const wasOpen = sessionStorage.getItem('panda_chat_open') === 'true';
    if (wasOpen) {
        // We need to wait for DOM to be ready
        setTimeout(() => {
            const chat = document.getElementById('panda-chat');
            if (chat?.classList.contains('hidden')) {
                // Call toggle but ensure we don't mess up animation
                chat.classList.remove('hidden', 'translate-y-10', 'opacity-0', 'pointer-events-none');
            }
        }, 500);
    }
}

function showWelcomeModal() {
    // Only show if not disabled globally
    if (localStorage.getItem('panda_disabled') === 'true') return;

    const modalId = 'capi-welcome-modal';
    if (document.getElementById(modalId)) return;

    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'fixed inset-0 z-[10000] flex items-center justify-center bg-stone-900/60 backdrop-blur-sm opacity-0 transition-opacity duration-300 px-4';
    const lang = localStorage.getItem('language') || 'es';

    const MODAL_TEXTS = {
        es: {
            title: "¡Bienvenido a PandaLatam! 🌎",
            body1: "Soy <strong>Panda</strong>, tu asistente de inteligencia artificial. <br>",
            body2: "¿Quieres que te haga una guía rápida por el sitio web?",
            yesBtn: "¡Sí, por favor! 🚀",
            noBtn: "No, gracias, exploraré solo",
            guide: "¡Genial! 😃\n\nAquí tienes un resumen rápido:\n\n1. **Niveles:** Explora desde A1 hasta C1 en la página principal.\n2. **Gramática:** Consulta reglas específicas en la sección dedicada.\n3. **Comunidad:** Lee libros y lecciones creadas por otros estudiantes.\n\n¡Pregúntame cualquier cosa que necesites saber!"
        },
        en: {
            title: "Welcome to PandaLatam! 🌎",
            body1: "I'm <strong>Panda</strong>, your AI assistant. <br>",
            body2: "Would you like a quick tour of the website?",
            yesBtn: "Yes, please! 🚀",
            noBtn: "No thanks, I'll explore alone",
            guide: "Awesome! 😃\n\nHere's a quick summary:\n\n1. **Levels:** Explore from A1 to C1 on the homepage.\n2. **Grammar:** Check out specific rules in the dedicated section.\n3. **Community:** Read books and lessons created by other students.\n\nAsk me anything you need to know!"
        },
        tr: {
            title: "PandaLatam'a Hoş Geldiniz! 🌎",
            body1: "Ben <strong>Panda</strong>, yapay zeka asistanınız. <br>",
            body2: "Web sitesinde hızlı bir tur ister misiniz?",
            yesBtn: "Evet, lütfen! 🚀",
            noBtn: "Hayır teşekkürler, kendim keşfedeceğim",
            guide: "Harika! 😃\n\nİşte hızlı bir özet:\n\n1. **Seviyeler:** Ana sayfada A1'den C1'e kadar keşfedin.\n2. **Dilbilgisi:** Özel bölümde belirli kuralları kontrol edin.\n3. **Topluluk:** Diğer öğrenciler tarafından oluşturulan kitapları ve dersleri okuyun.\n\nBilmeniz gereken her şeyi bana sorun!"
        }
    };
    const t = MODAL_TEXTS[lang] || MODAL_TEXTS['es'];

    modal.innerHTML = `
        <div class="bg-white dark:bg-stone-800 rounded-3xl shadow-2xl p-8 w-full max-w-md transform scale-95 transition-transform duration-300 border border-stone-200 dark:border-stone-700 text-center relative overflow-hidden">
            <!-- Decorative Back -->
            <div class="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-red-500 to-orange-600 opacity-10"></div>
            
            <!-- Mascot Icon Large -->
            <div class="relative w-24 h-24 mx-auto mb-6 -mt-2 flex items-center justify-center animate-bounce-slow" style="font-size: 110px; line-height: 1;">
                 🐼
            </div>

            <h3 class="text-2xl font-bold text-stone-800 dark:text-white mb-3">${t.title}</h3>
            <p class="text-stone-600 dark:text-stone-300 mb-8 leading-relaxed">
                ${t.body1}
                ${t.body2}
            </p>

            <div class="flex flex-col gap-3">
                <button id="welcome-yes" class="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-lg shadow-red-500/30 transition-all transform hover:-translate-y-0.5 font-bold text-lg">
                    ${t.yesBtn}
                </button>
                <button id="welcome-no" class="w-full py-3 rounded-xl text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors font-medium">
                    ${t.noBtn}
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Animate In
    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
        modal.querySelector('div').classList.add('scale-100');
    });

    // Handlers
    const closeModal = () => {
        modal.classList.add('opacity-0');
        modal.querySelector('div').classList.remove('scale-100');
        modal.querySelector('div').classList.add('scale-95');
        localStorage.setItem('panda_welcome_seen', 'true'); // Mark as seen
    };

    document.getElementById('welcome-yes').addEventListener('click', () => {
        closeModal();
        // Trigger Chat Open with Guide Message
        setTimeout(() => {
            const btn = document.getElementById('panda-btn');
            if (btn) btn.click();
            addMessage('assistant', t.guide);
            saveChatHistory('assistant', t.guide);
        }, 500);
    });

    document.getElementById('welcome-no').addEventListener('click', () => {
        closeModal();
    });
}

function showDeactivationModal() {
    // Custom Disable Modal
    // ... existing implementation if needed or reuse same pattern ...
}

function toggleChat() {
    const chat = document.getElementById('panda-chat');
    const input = document.getElementById('chat-input');
    const isHidden = chat.classList.contains('hidden');

    if (isHidden) {
        chat.classList.remove('hidden');
        // Small timeout to allow removing 'hidden' before animating opacity
        setTimeout(() => {
            chat.classList.remove('translate-y-10', 'opacity-0', 'pointer-events-none');
        }, 10);

        if (input) setTimeout(() => input.focus(), 300); // Focus input on open
        sessionStorage.setItem('panda_chat_open', 'true');
    } else {
        chat.classList.add('translate-y-10', 'opacity-0', 'pointer-events-none');
        setTimeout(() => {
            chat.classList.add('hidden');
        }, 300);
        sessionStorage.setItem('panda_chat_open', 'false');
    }
}

async function gatherContext() {
    // --- CONTEXT GATHERING ---
    const contextData = {
        page: globalThis.location.pathname,
        title: document.title
    };

    // Check for Community Lesson Modal
    const lessonModal = document.getElementById('lessonModal');
    if (lessonModal && !lessonModal.classList.contains('hidden')) {
        const lessonTitle = document.getElementById('lessonTitle')?.innerText;
        const lessonBody = document.getElementById('lessonBody')?.innerText;
        if (lessonTitle) {
            // Limit body length to avoid huge payload
            const truncatedBody = lessonBody ? lessonBody.substring(0, 1500) + '...' : '';
            contextData.activeLesson = {
                type: 'community',
                title: lessonTitle,
                content: truncatedBody
            };
        }
    }
    return contextData;
}

async function handleSend(e) {
    if (e) e.preventDefault();
    const input = document.getElementById('chat-input');
    const btn = document.getElementById('send-msg-btn');
    const message = input.value.trim();

    if (!message) return;

    // UI Updates
    addMessage('user', message);
    saveChatHistory('user', message);

    input.value = '';
    btn.disabled = true;

    // Add loading indicator
    const loadingId = addLoadingIndicator();

    try {
        // Load history for context
        const savedHistory = JSON.parse(sessionStorage.getItem('panda_chat_history') || '[]');
        const history = savedHistory.map(h => ({ role: h.role, content: h.text }));

        const token = localStorage.getItem('authToken');
        const headers = { 'Content-Type': 'application/json' };

        if (token) headers['Authorization'] = `Bearer ${token}`;

        const contextData = await gatherContext();

        const lang = localStorage.getItem('language') || 'es';
        const API_URL = `${globalThis.API_BASE_URL}/chat`;
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                message: message,
                context: contextData,
                history: history,
                lang: lang
            })
        });

        const data = await response.json();
        removeMessage(loadingId);

        if (response.ok) {
            handleAssistantResponse(data.reply);
        } else {
            const errMsg = '😅 Ups, Panda se mareó un poco. ¿Podrías preguntarme de nuevo?';
            addMessage('assistant', errMsg);
        }

    } catch (error) {
        removeMessage(loadingId);
        const netError = '📡 ¡Vaya! Parece que perdí la conexión. Intenta de nuevo en unos segundos.';
        addMessage('assistant', netError);
        console.error(error);
    } finally {
        btn.disabled = false;
        input.focus();
    }
}

function handleAssistantResponse(reply) {
    // Check for Navigation Tag or normal response
    // Pattern: [[NAVIGATE:/url]] - Case insensitive, flexible spaces and newlines
    const navRegex = /\[\[NAVIGATE\s*:\s*([^\]]+)\]\]/i;
    const navMatch = reply.match(navRegex);

    if (navMatch) {
        const url = navMatch[1].trim();
        // Remove the tag from the message shown to user
        const cleanReply = reply.replace(navRegex, '').trim();

        if (cleanReply) {
            addMessage('assistant', cleanReply);
            saveChatHistory('assistant', cleanReply);
        }

        // Execute navigation after short delay
        setTimeout(() => {
            globalThis.location.assign(url);
        }, 1500);
    } else {
        addMessage('assistant', reply);
        saveChatHistory('assistant', reply);
    }
}

function addMessage(role, text, animate = true) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'}`;

    // Styling classes
    // User: Simple text, white color
    // Assistant: Prose (Markdown), dark mode support
    const bubbleClass = role === 'user'
        ? 'bg-red-600 text-white rounded-br-none'
        : 'bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-bl-none border border-stone-100 dark:border-stone-600 w-full'; // Added w-full for assistant to allow prose to expand

    const textClass = role === 'user'
        ? 'leading-relaxed'
        : 'prose prose-sm prose-red dark:prose-invert max-w-none leading-relaxed [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4';

    // Note: Added custom overrides for prose spacing to fit chat bubble better

    let contentHtml;
    if (role === 'assistant' && typeof marked !== 'undefined') {
        contentHtml = marked.parse(text);
    } else {
        // Escape HTML for user input to prevent XSS
        contentHtml = text
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll("\"", "&quot;")
            .replaceAll("'", "&#039;")
            .replaceAll("\n", '<br>');
    }

    div.innerHTML = `
        <div class="max-w-[85%] rounded-2xl px-4 py-2 shadow-sm ${bubbleClass} overflow-x-auto">
            <div class="${textClass}">${contentHtml}</div>
        </div>
    `;

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;

    if (animate) {
        div.style.opacity = '0';
        div.style.transform = 'translateY(10px)';
        div.style.transition = 'all 0.3s ease';
        setTimeout(() => {
            div.style.opacity = '1';
            div.style.transform = 'translateY(0)';
        }, 10);
    }
}

function addLoadingIndicator() {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const id = 'loading-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = 'flex justify-start';
    div.innerHTML = `
        <div class="bg-white dark:bg-stone-700 rounded-2xl rounded-bl-none px-4 py-3 border border-stone-100 dark:border-stone-600">
            <div class="flex gap-1.5">
                <div class="w-2 h-2 bg-stone-400 rounded-full animate-bounce"></div>
                <div class="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                <div class="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
            </div>
        </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return id;
}

function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}
