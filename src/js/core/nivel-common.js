// =====================================================
// CHINO STANDARD - NIVEL COMMON JS (CLEAN REWRITE)
// Handles: Level Detection, Lesson Fetching, Universal Modal
// =====================================================

// 1. Level Detection
function getCurrentLevel() {
    const path = globalThis.location.pathname;
    const regex = /Nivel([ABC][12])/i;
    const match = regex.exec(path);
    return match ? match[1].toUpperCase() : 'A1';
}

const CURRENT_LEVEL = getCurrentLevel();
const LEVEL_LOWER = CURRENT_LEVEL.toLowerCase();

// i18n support
const lang = globalThis.location.pathname.startsWith('/en/') ? 'en' : (globalThis.location.pathname.startsWith('/tr/') ? 'tr' : 'es');
const translations = {
    es: {
        notFound: "Sé el primero en contribuir",
        noContent: "Esta lección aún no tiene contenido. ¿Conoces este tema? ¡Contribuye!",
        contribute: "Agregar Contenido",
        editLesson: "Editar Lección",
        loginRequired: "Debes iniciar sesión para editar",
        deleted: "Lección eliminada correctamente",
        errorDelete: "Error al eliminar la lección",
        viewExplanation: "Ver Explicación",
        basic: "Básico",
        new: "Nuevo"
    },
    en: {
        notFound: "Be the first to contribute",
        noContent: "This lesson has no content yet. Do you know this topic? Contribute!",
        contribute: "Add Content",
        editLesson: "Edit Lesson",
        loginRequired: "You must be logged in to edit",
        deleted: "Lesson deleted successfully",
        errorDelete: "Error deleting lesson",
        viewExplanation: "See Explanation",
        basic: "Basic",
        new: "New"
    },
    tr: {
        notFound: "İlk katkıda bulunan sen ol",
        noContent: "Bu dersin henüz içeriği yok. Bu konuyu biliyor musun? Katkıda bulun!",
        contribute: "İçerik Ekle",
        editLesson: "Dersi Düzenle",
        loginRequired: "Düzenlemek için giriş yapmalısınız",
        deleted: "Ders başarıyla silindi",
        errorDelete: "Ders silinirken hata oluştu",
        viewExplanation: "Açıklamayı Gör",
        basic: "Temel",
        new: "Yeni"
    }
};
const t = translations[lang];

let explanationsCache = null;

// 2. Data Fetching
async function getExplanations() {
    if (explanationsCache) return explanationsCache;

    try {
        console.log(`📚 Loading lessons for ${CURRENT_LEVEL}...`);

        // Fetch Static Data
        const response = await fetch(`/data/${LEVEL_LOWER}_lessons.json`);
        let data = response.ok ? await response.json() : {};

        // Fetch Dynamic Data (if service exists)
        if (globalThis.ContributionService) {
            try {
                const dynamicLessons = await globalThis.ContributionService.getPublishedLessons();
                if (Array.isArray(dynamicLessons)) {
                    // Filter: Match Level + Exclude Community Source
                    const levelLessons = dynamicLessons.filter(l => {
                        const isLevelMatch = (l.level || '').toUpperCase() === CURRENT_LEVEL;
                        const isNotCommunity = l.source !== 'community'; // Strict separation
                        return isLevelMatch && isNotCommunity;
                    });

                    // Render Cards for New Lessons
                    renderDynamicCards(levelLessons);

                    levelLessons.forEach(lesson => {
                        const key = lesson.id || lesson.lessonId;
                        if (key) {
                            data[key] = {
                                title: lesson.title || t.new,
                                content: lesson.content || lesson.newContent || '',
                                description: lesson.description || '',
                                id: key,
                                source: lesson.source,
                                _id: lesson._id
                            };
                        }
                    });
                }
            } catch (err) { console.warn('⚠️ Dynamic fetch warning:', err); }
        }
        explanationsCache = data;
        return data;
    } catch (error) {
        console.error('❌ Critical Error loading lessons:', error);
        return {};
    }
}

// 3. Modal Logic (Simplified & Robust)
globalThis.closeUniversalModal = function () {
    const modal = document.getElementById('universalLessonModal');
    if (!modal) return;

    console.log('🔒 Closing Modal...');
    // Force Hide
    modal.style.display = 'none';
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = ''; // Restore scroll

    // Clear content slightly later
    setTimeout(() => {
        const content = document.getElementById('universalModalContent');
        if (content) content.innerHTML = '';
        const actions = document.getElementById('universalModalActions');
        if (actions) actions.innerHTML = '';
    }, 100);
};

// Open Function
async function openExplanation(topic) {
    console.log('🚀 Opening topic:', topic);
    const modal = document.getElementById('universalLessonModal');
    const titleEl = document.getElementById('universalModalTitle');
    const contentEl = document.getElementById('universalModalContent');
    const actionsEl = document.getElementById('universalModalActions');

    if (!modal || !titleEl || !contentEl) {
        console.error('❌ Modal DOM elements missing!');
        return;
    }

    // Show loading state potentially? Or just wait.
    document.body.style.cursor = 'wait';

    // Load Data
    const explanations = await getExplanations();
    document.body.style.cursor = 'default';

    const item = explanations ? explanations[topic] : null;

    if (item) {
        titleEl.textContent = item.title;
        contentEl.innerHTML = item.content;

        setupModalActions(actionsEl, item, topic);
        setupDeleteButton(modal, item);
        injectPronunciation(contentEl);
    } else {
        // No content yet — show contribute CTA
        titleEl.textContent = t.notFound;
        contentEl.innerHTML = `
            <div class="flex flex-col items-center justify-center py-10 gap-4 text-center">
                <div class="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                    <i class="fas fa-pencil-alt text-2xl text-red-400"></i>
                </div>
                <p class="text-stone-500 dark:text-stone-400 max-w-xs">${t.noContent}</p>
                <a href="/Contribute/?topic=${encodeURIComponent(topic)}&level=${CURRENT_LEVEL}"
                   class="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow transition-all">
                    <i class="fas fa-plus"></i>
                    ${t.contribute || 'Contribuir'}
                </a>
            </div>
        `;
        // Still show the edit button for logged-in users
        setupModalActions(actionsEl, { id: topic }, topic);
    }

    // SHOW MODAL - Force it
    console.log('✨ Displaying Modal');
    modal.classList.remove('hidden');
    modal.style.display = 'flex'; // Explicit override
    document.body.style.overflow = 'hidden'; // Lock scroll
}

function setupModalActions(actionsEl, item, topic) {
    if (!actionsEl) return;
    actionsEl.innerHTML = '';

    const dbId = item.id || item._id;

    if (dbId || topic) {
        const btn = document.createElement('button');
        btn.className = 'bg-white/20 hover:bg-white/30 text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors';
        btn.innerHTML = '<i class="fas fa-edit"></i>';
        btn.title = t.editLesson;

        btn.onclick = () => {
            // UPDATE: Check if logged in
            if (!globalThis.AuthService?.isLoggedIn()) {
                if (globalThis.ToastSystem) globalThis.ToastSystem.error(t.loginRequired, 'Acceso Restringido');
                else alert(t.loginRequired);
                return;
            }

            if (dbId) {
                globalThis.location.href = `/Contribute/?editLesson=${dbId}`;
            } else {
                globalThis.location.href = `/Contribute/?topic=${topic}&level=${CURRENT_LEVEL}`;
            }
        };
        actionsEl.appendChild(btn);
    }
}

function setupDeleteButton(modal, item) {
    const dbId = item.id || item._id; // Covers both formats
    const modalContent = modal.querySelector('.explanation-content'); 
    const universalContent = modal.querySelector('#universalModalContent'); // Fallback

    const targetContainer = modalContent || universalContent;

    // Check strict Admin
    const isAdmin = globalThis.ContributionService?.isAdmin();

    if (targetContainer && dbId && isAdmin) {
        // Prevent duplicates
        if (targetContainer.querySelector('.admin-delete-container')) return;

        const deleteContainer = document.createElement('div');
        deleteContainer.className = 'admin-delete-container mt-6 pt-4 border-t border-stone-200 dark:border-stone-700 flex justify-end';

        const deleteBtn = document.createElement('button');
        // Icon-only button style
        deleteBtn.className = 'w-10 h-10 bg-red-100 hover:bg-red-200 text-red-600 rounded-full transition-colors flex items-center justify-center shadow-sm';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = "Eliminar Lección (Admin Only)";

        deleteBtn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (confirm('¿ADMIN: Estás seguro de que deseas eliminar esta lección permanentemente?')) {
                await handleDelete(dbId, modal, deleteBtn);
            }
        };

        deleteContainer.appendChild(deleteBtn);
        targetContainer.appendChild(deleteContainer);
    }
}

async function handleDelete(dbId, modal, deleteBtn) {
    try {
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        // FIX: Method name was wrong (deleteContribution exists in service, deleteLesson does not)
        await globalThis.ContributionService.deleteContribution(dbId);

        if (globalThis.toastSuccess) globalThis.toastSuccess(t.deleted);

        modal.classList.add('hidden');
        setTimeout(() => globalThis.location.reload(), 800);
    } catch (error) {
        console.error('Error deleting lesson:', error);
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';

        if (globalThis.toastError) globalThis.toastError(t.errorDelete);
        else alert(t.errorDelete);
    }
}

function injectPronunciation(contentEl) {
    if (globalThis.PronunciationSystem?.scanAndInject) {
        setTimeout(() => {
            globalThis.PronunciationSystem.scanAndInject(contentEl);
        }, 50);
    } else if (globalThis.PronunciationSystem?.inject) {
        setTimeout(() => globalThis.PronunciationSystem.inject(contentEl), 50);
    }
}

// 4. Render Dynamic Cards Function
function renderDynamicCards(lessons) {
    const container = document.querySelector('.grammar-cards-container, .grammar-cards');
    if (!container) return;

    lessons.forEach(lesson => {
        // Avoid duplicates if card already exists (check by data-topic or ID)
        // Static cards usually have data-topic. Dynamic ones will use ID.
        const id = lesson.id || lesson._id;
        if (container.querySelector(`[data-topic="${id}"]`)) return;

        const card = document.createElement('div');
        // Match existing card styles (based on components.njk grammarCard)
        card.className = 'grammar-card bg-white dark:bg-stone-800 rounded-xl p-6 shadow-lg border border-stone-100 dark:border-stone-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative group';
        card.dataset.topic = id;

        // Badge configuration with colors
        const badgeConfig = {
            'Básico': { bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
            'Basic': { bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
            'Temel': { bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
            'Intermedio': { bg: 'bg-yellow-50 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
            'Intermediate': { bg: 'bg-yellow-50 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
            'Orta': { bg: 'bg-yellow-50 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
            'Avanzado': { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
            'Advanced': { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
            'İleri': { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
            'Nuevo': { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
            'New': { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
            'Yeni': { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' }
        };
        const badgeType = lesson.badge || t.new;
        const badgeStyle = badgeConfig[badgeType] || badgeConfig['Nuevo'];

        card.innerHTML = `
            <div class="absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded ${badgeStyle.bg} ${badgeStyle.text}">
                ${badgeType}
            </div>
            <h3 class="text-xl font-bold text-stone-800 dark:text-stone-100 mb-2 transition-colors">
                ${lesson.title}
            </h3>
            <div class="flex items-center gap-2 mb-4">
                <span class="px-2 py-0.5 rounded text-xs font-semibold bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                    ${t.basic}
                </span>
            </div>
            <p class="card-description text-stone-600 dark:text-stone-400 text-sm mb-6 line-clamp-3">
                ${lesson.description || 'Sin descripción'}
            </p>
            <button class="explanation-btn w-full py-2.5 rounded-lg font-semibold bg-red-600 text-white shadow-md hover:bg-red-700 hover:shadow-lg hover:shadow-red-500/30 transition-all flex items-center justify-center gap-2"
                    data-topic="${id}">
                <i class="fas fa-book-open"></i>
                ${t.viewExplanation}
            </button>
        `;

        // Bind the button event immediately
        const btn = card.querySelector('.explanation-btn');
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            openExplanation(id);
        });

        container.appendChild(card);
    });
}

// 5. Initialization & Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Nivel Common Loaded (Clean Version)');

    // Bind Explanation Buttons
    const buttons = document.querySelectorAll('.explanation-btn');
    console.log(`Found ${buttons.length} explanation buttons`);

    buttons.forEach(btn => {
        // Clone to remove old listeners if any, or just add new one? 
        // Better to just add. If double click issues, we can optimize.
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const topic = btn.dataset.topic;
            if (topic) openExplanation(topic);
        });
    });

    // Bind Close Button (Universal)
    const closeBtn = document.getElementById('closeUniversalModalBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            globalThis.closeUniversalModal();
        });
    }

    // Bind Overlay Click (Close when clicking outside)
    const modal = document.getElementById('universalLessonModal');
    if (modal) {
        // HOIST TO BODY
        if (modal.parentElement !== document.body) {
            document.body.appendChild(modal);
            console.log('🚀 Modal hoisted to body for correct full-screen positioning');
        }

        modal.addEventListener('click', (e) => {
            // Check if specifically clicking the backdrop (id match)
            if (e.target.id === 'universalLessonModal') {
                globalThis.closeUniversalModal();
            }
        });
    }

    // Initialize Inline Editor (if available)
    if (typeof LessonEditor !== 'undefined') {
        globalThis.inlineLessonEditor = new LessonEditor('inlineLessonContentEditor');
    }

    // Handle Inline Form Submit (Legacy Support)
    const inlineForm = document.getElementById('inlineLessonForm');
    if (inlineForm) {
        inlineForm.addEventListener('submit', handleInlineSubmit);
    }

    // TRIGGER INITIAL LOAD to render dynamic cards
    getExplanations();
});

// 5. Legacy Inline Submit Logic (Kept for compatibility)
async function handleInlineSubmit(e) {
    e.preventDefault();
    if (!globalThis.ContributionService) {
        alert('Servicio de contribución no disponible');
        return;
    }

    const content = globalThis.inlineLessonEditor?.getContent() || '';
    if (!content?.trim()) {
        alert('Por favor añade contenido');
        return;
    }

    const lessonData = {
        lessonTitle: document.getElementById('inlineLessonTitle')?.value || 'Sin Título',
        level: CURRENT_LEVEL,
        description: document.getElementById('inlineLessonDescription')?.value || '',
        newContent: content,
        lessonId: document.getElementById('inlineLessonId')?.value,
        source: 'nivel-edit'
    };

    try {
        await globalThis.ContributionService.submitLessonEdit(lessonData);
        if (globalThis.ToastSystem) globalThis.ToastSystem.success('¡Propuesta enviada!', 'Éxito');
        else alert('¡Propuesta enviada!');

        // Close inline editor panels if they exist (simplified)
        const editorContainer = document.getElementById('inlineEditorContainer');
        if (editorContainer) editorContainer.style.display = 'none';

    } catch (error) {
        console.error('Submit error:', error);
        alert('Error al enviar la edición');
    }
}
