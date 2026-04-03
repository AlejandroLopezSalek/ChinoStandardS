// ========================================
// ADMIN CONTRIBUTIONS - Admin Dashboard Handler
// ========================================

let currentFilter = 'all';
let currentRequestId = null;
let confirmAction = null;

// Tailwind Classes Configuration
const TAB_ACTIVE_CLASSES = ['bg-red-600', 'text-white', 'shadow-md', 'shadow-red-500/20'];
const TAB_INACTIVE_CLASSES = ['text-stone-600', 'hover:bg-stone-100', 'dark:text-stone-400', 'dark:hover:bg-stone-800'];
const BADGE_ACTIVE_CLASSES = ['bg-white/20', 'text-white'];
const BADGE_INACTIVE_CLASSES = ['bg-stone-100', 'dark:bg-stone-700', 'text-stone-600', 'dark:text-stone-300'];

// New Global for Lessons Cache
let allPublishedLessons = [];
let allAdminUsers = [];

document.addEventListener('DOMContentLoaded', () => {
    // Only run on admin dashboard
    const adminPage = document.getElementById('admin-dashboard-page');
    if (!adminPage) return;

    // Check admin access
    if (!globalThis.ContributionService?.isAdmin()) {
        showToast(window.I18N_ADMIN?.messages?.access_denied || 'Acceso denegado.', 'error');
        setTimeout(() => {
            globalThis.location.href = '/';
        }, 2000);
        return;
    }

    // Append modals to body to ensure full-screen blur works correctly
    const requestModal = document.getElementById('requestModal');
    if (requestModal) document.body.appendChild(requestModal);

    const confirmModal = document.getElementById('confirmModal');
    if (confirmModal) document.body.appendChild(confirmModal);

    initAdminDashboard();
});

function initAdminDashboard() {
    // Validate session before loading dashboard
    if (!globalThis.ContributionService?.isTokenValid()) {
        showToast(window.I18N_ADMIN?.messages?.session_expired || 'Tu sesión ha expirado.', 'error');
        setTimeout(() => {
            globalThis.location.href = '/login/?expired=true';
        }, 1500);
        return;
    }

    // Load stats and requests
    loadStats();
    loadRequests();

    // Search Listener for Lessons
    const searchInput = document.getElementById('lessonSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterLessonsTable(e.target.value);
        });
    }

    // Search Listener for Users
    const userSearchInput = document.getElementById('userSearch');
    if (userSearchInput) {
        userSearchInput.addEventListener('input', (e) => {
            filterUsersTable(e.target.value);
        });
    }

    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            handleTabClick(e.currentTarget);
        });
    });

    // Modal buttons
    document.getElementById('approveBtn')?.addEventListener('click', () => handleApprove(currentRequestId));
    document.getElementById('rejectBtn')?.addEventListener('click', () => handleReject(currentRequestId));
}

// New Tab Switcher logic
globalThis.switchMainTab = function (tabName) {
    const requestsSection = document.getElementById('requestsSection');
    const lessonsSection = document.getElementById('lessonsSection');
    const tabRequests = document.getElementById('tabRequests');
    const tabLessons = document.getElementById('tabLessons');

    const activeClasses = 'px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm bg-white dark:bg-stone-700 text-red-600 dark:text-red-400';
    const inactiveClasses = 'px-6 py-2.5 rounded-lg text-sm font-medium transition-all text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-700/50';

    if (tabName === 'requests') {
        requestsSection.classList.remove('hidden');
        lessonsSection.classList.add('hidden');
        usersSection.classList.add('hidden');

        // Update styling
        tabRequests.className = activeClasses;
        tabLessons.className = inactiveClasses;
        tabUsers.className = inactiveClasses;
    } else if (tabName === 'lessons') {
        requestsSection.classList.add('hidden');
        lessonsSection.classList.remove('hidden');
        usersSection.classList.add('hidden');

        // Update styling
        tabLessons.className = activeClasses;
        tabRequests.className = inactiveClasses;
        tabUsers.className = inactiveClasses;

        // Load lessons if empty
        if (allPublishedLessons.length === 0) {
            loadPublishedLessons();
        }
    } else if (tabName === 'users') {
        requestsSection.classList.add('hidden');
        lessonsSection.classList.add('hidden');
        usersSection.classList.remove('hidden');

        // Update styling
        tabUsers.className = activeClasses;
        tabRequests.className = inactiveClasses;
        tabLessons.className = inactiveClasses;

        // Load users if empty
        if (allAdminUsers.length === 0) {
            loadAdminUsers();
        }
    }
}

function handleTabClick(target) {
    // Reset all tabs
    document.querySelectorAll('.filter-tab').forEach(t => {
        t.classList.remove('active', ...TAB_ACTIVE_CLASSES);
        t.classList.add(...TAB_INACTIVE_CLASSES);

        const badge = t.querySelector('span');
        if (badge) {
            badge.classList.remove(...BADGE_ACTIVE_CLASSES);
            badge.classList.add(...BADGE_INACTIVE_CLASSES);
        }
    });

    // Set active tab
    target.classList.add('active', ...TAB_ACTIVE_CLASSES);
    target.classList.remove(...TAB_INACTIVE_CLASSES);

    const activeBadge = target.querySelector('span');
    if (activeBadge) {
        activeBadge.classList.remove(...BADGE_INACTIVE_CLASSES);
        activeBadge.classList.add(...BADGE_ACTIVE_CLASSES);
    }

    currentFilter = target.dataset.filter;
    loadRequests();
}

// ========================================
// LOAD DATA
// ========================================

async function loadStats() {
    try {
        const stats = await globalThis.ContributionService.getStats();

        document.getElementById('statPending').textContent = stats.pending;
        document.getElementById('statApproved').textContent = stats.approved;
        document.getElementById('statRejected').textContent = stats.rejected;
        document.getElementById('statTotal').textContent = stats.total;

        document.getElementById('badgeAll').textContent = stats.pending;
        document.getElementById('badgeLessons').textContent = stats.lessonEdits;
        document.getElementById('badgeBooks').textContent = stats.bookUploads;
        if (document.getElementById('badgeExams')) {
            document.getElementById('badgeExams').textContent = stats.communityExams || 0;
        }

    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadRequests() {
    const container = document.getElementById('requestsList');

    try {
        let requests = await globalThis.ContributionService.getPendingRequests();

        // Apply filter
        if (currentFilter !== 'all') {
            requests = requests.filter(req => req.type === currentFilter);
        }

        if (requests.length === 0) {
            container.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center p-12 text-center bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700">
                    <div class="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400 text-3xl mb-4">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h3 class="text-xl font-bold text-stone-800 dark:text-white mb-2">${window.I18N_ADMIN?.requests?.empty_title || '¡Todo al día!'}</h3>
                    <p class="text-stone-500 dark:text-stone-400">${window.I18N_ADMIN?.requests?.empty_desc || 'No hay solicitudes pendientes'}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = requests.map(request => `
            <div class="bg-white dark:bg-stone-800 rounded-2xl p-6 border border-stone-200 dark:border-stone-700 shadow-sm hover:shadow-md transition-all duration-300 group relative overflow-hidden" data-id="${request.id}">
                <div class="flex items-center justify-between mb-4 pb-4 border-b border-stone-100 dark:border-stone-700/50">
                    <div class="flex items-center gap-3">
                         <div class="w-10 h-10 rounded-xl flex items-center justify-center ${request.type === 'lesson_edit' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : request.type === 'community_exam' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'}">
                             <i class="fas ${request.type === 'lesson_edit' ? 'fa-book-open' : request.type === 'community_exam' ? 'fa-graduation-cap' : 'fa-file-pdf'}"></i>
                         </div>
                         <span class="font-semibold text-stone-700 dark:text-stone-200 text-sm">
                             ${request.type === 'lesson_edit' ? (window.I18N_ADMIN?.requests?.type_lesson || 'Edición de Lección') : request.type === 'community_exam' ? (window.I18N_ADMIN?.requests?.type_exam || 'Examen de IA') : (window.I18N_ADMIN?.requests?.type_book || 'Libro Compartido')}
                         </span>
                    </div>
                    <span class="text-xs font-medium text-stone-500 bg-stone-100 dark:bg-stone-700 dark:text-stone-300 px-2.5 py-1 rounded-full">
                        ${formatDate(request.submittedAt)}
                    </span>
                </div>

                <h3 class="text-lg font-bold text-stone-800 dark:text-white mb-2 line-clamp-1">${escHtml(request.title)}</h3>
                <p class="text-stone-600 dark:text-stone-400 text-sm mb-4 line-clamp-2 leading-relaxed">${escHtml(truncate(request.description, 150))}</p>

                <div class="flex items-center gap-4 mb-6 text-sm text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-800/50 p-3 rounded-xl border border-stone-100 dark:border-stone-700/50">
                     <span class="flex items-center gap-2"><i class="fas fa-user text-red-500"></i> ${escHtml(request.submittedBy?.username || 'Usuario Desconocido')}</span>
                     ${request.data.level ? `<span class="flex items-center gap-2 border-l border-stone-200 dark:border-stone-700 pl-4"><i class="fas fa-layer-group text-orange-500"></i> ${escHtml(request.data.level)}</span>` : ''}
                </div>

                <div class="flex items-center justify-end gap-2 pt-2">
                    <button class="px-4 py-2 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2" onclick="viewRequest('${request._id}')">
                        <i class="fas fa-eye"></i> ${window.I18N_ADMIN?.requests?.view_btn || 'Ver'}
                    </button>
                    <button class="w-9 h-9 flex items-center justify-center bg-orange-100 hover:bg-orange-200 text-orange-600 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 dark:text-orange-400 rounded-lg transition-colors" onclick="handleApprove('${request._id}')" title="${window.I18N_ADMIN?.requests?.approve_quick || 'Aprobar Rápido'}">
                         <i class="fas fa-check"></i>
                    </button>
                    <button class="w-9 h-9 flex items-center justify-center bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 rounded-lg transition-colors" onclick="handleReject('${request._id}')" title="${window.I18N_ADMIN?.requests?.reject_quick || 'Rechazar Rápido'}">
                         <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading requests:', error);

        // Handle authentication errors specifically
        if (error.message.includes('Token expired') || error.message.includes('Unauthorized')) {
            // The ContributionService will handle the redirect
            return;
        }

        // Handle other errors
        container.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center p-12 text-center text-red-500">
                <i class="fas fa-exclamation-triangle text-3xl mb-4"></i>
                <h3 class="text-xl font-bold mb-2">${window.I18N_ADMIN?.requests?.error_load || 'Error al cargar las solicitudes'}</h3>
                <p class="text-sm text-stone-600 dark:text-stone-400 mb-4">${window.I18N_ADMIN?.requests?.error_desc || 'Por favor, intenta recargar la página'}</p>
                <button onclick="loadRequests()" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                    <i class="fas fa-sync-alt mr-2"></i>${window.I18N_ADMIN?.requests?.error_retry || 'Reintentar'}
                </button>
            </div>
        `;
    }
}

function handleDelete(id) {
    if (confirm(window.I18N_ADMIN?.messages?.delete_permanent_confirm || '¿Estás seguro?')) {
        globalThis.ContributionService.deleteRequest(id)
            .then(() => {
                showToast(window.I18N_ADMIN?.messages?.delete_confirm || 'Solicitud eliminada', 'success');
                loadStats();
                loadRequests();
            })
            .catch(err => {
                console.error(err);
                showToast(window.I18N_ADMIN?.messages?.delete_error || 'Error al eliminar', 'error');
            });
    }
}

// ========================================
// VIEW REQUEST DETAILS
// ========================================

async function viewRequest(id) {
    const request = await globalThis.ContributionService.getRequestById(id);
    if (!request) return;

    currentRequestId = id;

    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');

    modalTitle.textContent = request.title;

    if (request.type === 'lesson_edit') {
        modalBody.innerHTML = `
            <div class="space-y-6">
                <div class="bg-stone-50 dark:bg-stone-800/50 p-6 rounded-2xl border border-stone-200 dark:border-stone-700">
                    <h3 class="flex items-center gap-2 mb-4 text-stone-800 dark:text-white font-bold pb-2 border-b border-stone-200 dark:border-stone-700">
                        <i class="fas fa-info-circle text-red-500"></i> ${window.I18N_ADMIN?.modals?.detail?.general_info || 'Información General'}
                    </h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div class="flex flex-col gap-1">
                            <strong class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">${window.I18N_ADMIN?.modals?.detail?.level || 'Nivel'}</strong>
                            <span class="font-semibold text-stone-800 dark:text-white">${request.data.level}</span>
                        </div>
                        <div class="flex flex-col gap-1">
                            <strong class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">${window.I18N_ADMIN?.modals?.detail?.lesson_id || 'ID de Lección'}</strong>
                            <span class="font-semibold text-stone-800 dark:text-white">${request.data.lessonId || (window.I18N_ADMIN?.modals?.detail?.new_lesson || 'Nueva lección')}</span>
                        </div>
                        <div class="flex flex-col gap-1">
                            <strong class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">${window.I18N_ADMIN?.modals?.detail?.submitted_by || 'Enviado por'}</strong>
                            <span class="font-semibold text-stone-800 dark:text-white">${request.submittedBy?.username || (window.I18N_ADMIN?.modals?.detail?.unknown_user || 'Usuario Desconocido')}</span>
                        </div>
                        <div class="flex flex-col gap-1">
                            <strong class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">${window.I18N_ADMIN?.modals?.detail?.date || 'Fecha'}</strong>
                            <span class="font-semibold text-stone-800 dark:text-white">${formatDate(request.submittedAt)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white dark:bg-stone-800 p-6 rounded-2xl border border-stone-200 dark:border-stone-700">
                    <h3 class="flex items-center gap-2 mb-4 text-stone-800 dark:text-white font-bold">
                        <i class="fas fa-align-left text-red-500"></i> ${window.I18N_ADMIN?.modals?.detail?.description || 'Descripción'}
                    </h3>
                    <p class="text-stone-600 dark:text-stone-300 leading-relaxed">${request.description}</p>
                </div>
                
                <div class="bg-white dark:bg-stone-800 p-6 rounded-2xl border border-stone-200 dark:border-stone-700">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="flex items-center gap-2 text-stone-800 dark:text-white font-bold">
                            <i class="fas fa-file-alt text-red-500"></i> ${window.I18N_ADMIN?.modals?.detail?.content || 'Contenido'}
                        </h3>
                        <button class="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold shadow-lg shadow-red-500/20 hover:bg-red-700 transition-all flex items-center gap-2" id="toggleEditBtn" onclick="toggleAdminEditor()">
                            <i class="fas fa-edit"></i> ${window.I18N_ADMIN?.modals?.detail?.edit_btn || 'Editar Contenido'}
                        </button>
                    </div>
                    
                    <!-- View Mode -->
                    <div id="contentPreview" class="prose dark:prose-invert max-w-none bg-stone-50 dark:bg-stone-900/50 p-6 rounded-xl border border-stone-200 dark:border-stone-700 max-h-[500px] overflow-y-auto">
                        ${request.data.newContent ? sanitizeHtml(request.data.newContent) : `<p class="text-stone-400 italic">${window.I18N_ADMIN?.modals?.detail?.no_content || 'Sin contenido'}</p>`}
                    </div>
                    
                    <!-- Edit Mode -->
                    <div id="adminEditorContainer" style="display: none;" class="mt-4">
                        <div id="adminEditor" class="min-h-[400px]"></div>
                    </div>
                </div>
            </div>
        `;

        // Initialize editor but keep hidden
        if (typeof LessonEditor === 'undefined') {
            console.error('LessonEditor class not defined');
            document.getElementById('adminEditorContainer').innerHTML = '<p class="text-red-500">Editor no disponible</p>';
        } else {
            globalThis.adminEditorInstance = new LessonEditor('adminEditor');
            globalThis.adminEditorInstance.setContent(request.data.newContent || '');
        }

    } else {
        modalBody.innerHTML = `
            <div class="space-y-6">
                <div class="bg-stone-50 dark:bg-stone-800/50 p-6 rounded-2xl border border-stone-200 dark:border-stone-700">
                    <h3 class="flex items-center gap-2 mb-4 text-stone-800 dark:text-white font-bold pb-2 border-b border-stone-200 dark:border-stone-700">
                        <i class="fas fa-info-circle text-red-500"></i> ${window.I18N_ADMIN?.modals?.detail?.book_info || 'Información del Libro'}
                    </h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div class="flex flex-col gap-1">
                            <strong class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">${window.I18N_ADMIN?.modals?.detail?.author || 'Autor'}</strong>
                            <span class="font-semibold text-stone-800 dark:text-white">${request.data.author}</span>
                        </div>
                        <div class="flex flex-col gap-1">
                            <strong class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">${window.I18N_ADMIN?.modals?.detail?.level || 'Nivel'}</strong>
                            <span class="font-semibold text-stone-800 dark:text-white">${request.data.level}</span>
                        </div>
                        <div class="flex flex-col gap-1">
                            <strong class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">${window.I18N_ADMIN?.modals?.detail?.category || 'Categoría'}</strong>
                            <span class="font-semibold text-stone-800 dark:text-white">${request.data.category}</span>
                        </div>
                        <div class="flex flex-col gap-1">
                            <strong class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">${window.I18N_ADMIN?.modals?.detail?.language || 'Idioma'}</strong>
                            <span class="font-semibold text-stone-800 dark:text-white">${request.data.language}</span>
                        </div>
                        <div class="flex flex-col gap-1">
                            <strong class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">${window.I18N_ADMIN?.modals?.detail?.format || 'Formato'}</strong>
                            <span class="font-semibold text-stone-800 dark:text-white">${request.data.format}</span>
                        </div>
                        <div class="flex flex-col gap-1">
                            <strong class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">${window.I18N_ADMIN?.modals?.detail?.size || 'Tamaño'}</strong>
                            <span class="font-semibold text-stone-800 dark:text-white">${request.data.fileSize}</span>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white dark:bg-stone-800 p-6 rounded-2xl border border-stone-200 dark:border-stone-700">
                    <h3 class="flex items-center gap-2 mb-4 text-stone-800 dark:text-white font-bold">
                        <i class="fas fa-align-left text-red-500"></i> ${window.I18N_ADMIN?.modals?.detail?.description || 'Descripción'}
                    </h3>
                    <p class="text-stone-600 dark:text-stone-300 leading-relaxed">${request.description}</p>
                </div>
                
                <div class="bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl border border-red-100 dark:border-red-800">
                    <h3 class="flex items-center gap-2 mb-3 text-red-800 dark:text-red-300 font-bold">
                        <i class="fas fa-link"></i> ${window.I18N_ADMIN?.modals?.detail?.file_link || 'Enlace al Archivo'}
                    </h3>
                    <a href="${request.data.fileUrl}" target="_blank" class="flex items-center gap-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline break-all">
                        <i class="fas fa-external-link-alt"></i> ${request.data.fileUrl}
                    </a>
                </div>
                
                    <div class="flex items-center gap-3 p-4 bg-stone-100 dark:bg-stone-800 rounded-xl">
                    <div class="w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-stone-500">
                        <i class="fas fa-user"></i>
                    </div>
                    <div>
                        <p class="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide">${window.I18N_ADMIN?.modals?.detail?.submitted_by || 'Enviado por'}</p>
                        <p class="font-semibold text-stone-800 dark:text-white">${request.submittedBy?.username || (window.I18N_ADMIN?.modals?.detail?.unknown_user || 'Usuario Desconocido')} <span class="text-stone-400 font-normal">(${request.submittedBy?.email || 'Sin email'})</span></p>
                    </div>
                </div>
            </div>
        `;
    } else if (request.type === 'community_exam') {
        modalBody.innerHTML = `
            <div class="space-y-6">
                <div class="bg-stone-50 dark:bg-stone-800/50 p-6 rounded-2xl border border-stone-200 dark:border-stone-700">
                    <h3 class="flex items-center gap-2 mb-4 text-stone-800 dark:text-white font-bold pb-2 border-b border-stone-200 dark:border-stone-700">
                        <i class="fas fa-info-circle text-red-500"></i> ${window.I18N_ADMIN?.modals?.detail?.exam_info || 'Información del Examen'}
                    </h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div class="flex flex-col gap-1">
                            <strong class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">${window.I18N_ADMIN?.modals?.detail?.level || 'Nivel'}</strong>
                            <span class="font-semibold text-stone-800 dark:text-white">${request.data.level}</span>
                        </div>
                        <div class="flex flex-col gap-1">
                            <strong class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">${window.I18N_ADMIN?.modals?.detail?.submitted_by || 'Enviado por'}</strong>
                            <span class="font-semibold text-stone-800 dark:text-white">${request.submittedBy?.username || 'Usuario Desconocido'}</span>
                        </div>
                    </div>
                </div>

                ${request.data.reading_passage ? `
                <div class="bg-white dark:bg-stone-800 p-6 rounded-2xl border border-stone-200 dark:border-stone-700">
                    <h3 class="flex items-center gap-2 mb-4 text-stone-800 dark:text-white font-bold">
                        <i class="fas fa-book-reader text-red-500"></i> ${window.I18N_ADMIN?.modals?.detail?.passage || 'Texto de Lectura'}
                    </h3>
                    <div class="p-4 bg-stone-50 dark:bg-stone-900/50 rounded-xl border border-stone-100 dark:border-stone-700/50 text-stone-800 dark:text-stone-200 italic leading-relaxed">
                        ${escHtml(request.data.reading_passage)}
                    </div>
                </div>
                ` : ''}

                <div class="bg-white dark:bg-stone-800 p-6 rounded-2xl border border-stone-200 dark:border-stone-700">
                    <h3 class="flex items-center gap-2 mb-4 text-stone-800 dark:text-white font-bold">
                        <i class="fas fa-question-circle text-red-500"></i> ${window.I18N_ADMIN?.modals?.detail?.questions || 'Preguntas'}
                    </h3>
                    <div class="space-y-4">
                        ${(request.data.sections || []).flatMap(s => s.questions || []).map((q, idx) => `
                            <div class="p-4 bg-stone-50 dark:bg-stone-900/50 rounded-xl border border-stone-100 dark:border-stone-700/50">
                                <p class="font-bold text-stone-800 dark:text-white mb-2">${idx + 1}. ${escHtml(q.question)}</p>
                                <ul class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                    ${(q.options || []).map(opt => `
                                        <li class="flex items-center gap-2 ${opt === q.correct_answer ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-stone-500'}">
                                            <i class="fas ${opt === q.correct_answer ? 'fa-check-circle' : 'fa-circle text-[8px]'}"></i> ${escHtml(opt)}
                                        </li>
                                    `).join('')}
                                </ul>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    const modal = document.getElementById('requestModal');
    modal.classList.remove('hidden');
    // Simple fade in
    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('.modal-content').classList.remove('scale-95');
        modal.querySelector('.modal-content').classList.add('scale-100');
    });
}

// ========================================
// HANDLE APPROVE/REJECT
// ========================================

function handleApprove(id) {
    currentRequestId = id;
    confirmAction = 'approve';

    document.getElementById('confirmTitle').textContent = window.I18N_ADMIN?.modals?.confirm?.approve_title || 'Confirmar Aprobación';
    document.getElementById('confirmMessage').textContent = window.I18N_ADMIN?.modals?.confirm?.approve_msg || '¿Estás seguro de que quieres aprobar esta solicitud?';
    document.getElementById('reasonGroup').style.display = 'none';

    openConfirmModal();
}

function handleReject(id) {
    currentRequestId = id;
    confirmAction = 'reject';

    document.getElementById('confirmTitle').textContent = window.I18N_ADMIN?.modals?.confirm?.reject_title || 'Confirmar Rechazo';
    document.getElementById('confirmMessage').textContent = window.I18N_ADMIN?.modals?.confirm?.reject_msg || '¿Estás seguro de que quieres rechazar esta solicitud?';
    document.getElementById('reasonGroup').style.display = 'block';

    openConfirmModal();
}

// Confirm button handler
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('confirmBtn')?.addEventListener('click', () => {
        if (confirmAction === 'approve') {
            approveRequest();
        } else if (confirmAction === 'reject') {
            rejectRequest();
        }
    });
});

async function approveRequest() {
    try {
        // Get edited content if in editor mode
        let finalContent = null;
        if (globalThis.adminEditorInstance) {
            const editorContainer = document.getElementById('adminEditorContainer');
            if (editorContainer && editorContainer.style.display !== 'none') {
                finalContent = globalThis.adminEditorInstance.getContent();
            }
        }

        await globalThis.ContributionService.approveRequest(currentRequestId, finalContent);
        showToast(window.I18N_ADMIN?.messages?.approve_success || 'Solicitud aprobada correctamente', 'success');
        closeConfirmModal();
        closeModal();
        loadStats();
        loadRequests();
    } catch (error) {
        console.error('Error approving request:', error);

        // Authentication errors are handled by ContributionService
        if (error.message.includes('Token expired') || error.message.includes('Unauthorized')) {
            return;
        }

        showToast(window.I18N_ADMIN?.messages?.approve_error || 'Error al aprobar la solicitud. Por favor, intenta nuevamente.', 'error');
    }
}

async function rejectRequest() {
    try {
        const reason = document.getElementById('rejectionReason').value;
        await globalThis.ContributionService.rejectRequest(currentRequestId, reason);
        showToast(window.I18N_ADMIN?.messages?.reject_info || 'Solicitud rechazada', 'info');
        closeConfirmModal();
        closeModal();
        loadStats();
        loadRequests();
    } catch (error) {
        console.error('Error rejecting request:', error);

        // Authentication errors are handled by ContributionService
        if (error.message.includes('Token expired') || error.message.includes('Unauthorized')) {
            return;
        }

        showToast(window.I18N_ADMIN?.messages?.reject_error || 'Error al rechazar la solicitud. Por favor, intenta nuevamente.', 'error');
    }
}

// ========================================
// MODAL CONTROLS
// ========================================

globalThis.closeModal = function () {
    const modal = document.getElementById('requestModal');
    if (modal) {
        modal.classList.add('opacity-0');
        modal.querySelector('.modal-content').classList.remove('scale-100');
        modal.querySelector('.modal-content').classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }
    currentRequestId = null;
    // Clear editor to prevent conflicts
    const editorContainer = document.getElementById('adminEditorContainer');
    if (editorContainer) {
        editorContainer.style.display = 'none';
        document.getElementById('contentPreview').style.display = 'block';
        document.getElementById('toggleEditBtn').innerHTML = `<i class="fas fa-edit"></i> ${window.I18N_ADMIN?.modals?.detail?.edit_btn || 'Editar Contenido'}`;
    }
};

function openConfirmModal() {
    const modal = document.getElementById('confirmModal');
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('.modal-content').classList.remove('scale-95');
        modal.querySelector('.modal-content').classList.add('scale-100');
    });
}

globalThis.closeConfirmModal = function () {
    const modal = document.getElementById('confirmModal');
    if (modal) {
        modal.classList.add('opacity-0');
        modal.querySelector('.modal-content').classList.remove('scale-100');
        modal.querySelector('.modal-content').classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }
    const reasonInput = document.getElementById('rejectionReason');
    if (reasonInput) reasonInput.value = '';
};

function toggleAdminEditor() {
    const preview = document.getElementById('contentPreview');
    const editor = document.getElementById('adminEditorContainer');
    const btn = document.getElementById('toggleEditBtn');

    if (editor.style.display === 'none') {
        preview.style.display = 'none';
        editor.style.display = 'block';
        btn.innerHTML = `<i class="fas fa-eye"></i> ${window.I18N_ADMIN?.modals?.detail?.preview_btn || 'Ver Vista Previa'}`;
        // Refresh editor layout if needed
        globalThis.adminEditorInstance?.refresh();
    } else {
        preview.style.display = 'block';
        editor.style.display = 'none';
        btn.innerHTML = `<i class="fas fa-edit"></i> ${window.I18N_ADMIN?.modals?.detail?.edit_btn || 'Editar Contenido'}`;
    }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Escape HTML special characters to prevent XSS in innerHTML template literals.
 * @param {*} str
 * @returns {string}
 */
function escHtml(str) {
    return String(str ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function truncate(text, length) {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
}

function sanitizeHtml(html) {
    if (!html) return '';
    const tempDiv = document.createElement('div');
    tempDiv.textContent = html; // Simple escape

    // Low-tech sanitizer:
    // 1. Create a template element
    const template = document.createElement('template');
    template.innerHTML = html;

    // 2. Remove script tags and event handlers
    const scripts = template.content.querySelectorAll('script');
    scripts.forEach(script => script.remove());

    const allElements = template.content.querySelectorAll('*');
    allElements.forEach(el => {
        const attributes = el.attributes;
        for (let i = attributes.length - 1; i >= 0; i--) {
            if (attributes[i].name.startsWith('on') || attributes[i].value.startsWith('javascript:')) {
                el.removeAttribute(attributes[i].name);
            }
        }
    });

    return template.innerHTML;
}

function showToast(message, type = 'info') {
    if (globalThis.ToastSystem) {
        globalThis.ToastSystem.show({ message, type });
    } else if (globalThis.ToastManager) {
        globalThis.ToastManager.show(message, type);
    } else {
        // Tailwind toast fallback
        const div = document.createElement('div');
        let colors, icon;
        if (type === 'error') {
            colors = 'bg-red-500';
            icon = 'fa-exclamation-circle';
        } else if (type === 'success') {
            colors = 'bg-orange-500';
            icon = 'fa-check-circle';
        } else {
            colors = 'bg-stone-800';
            icon = 'fa-info-circle';
        }
        div.className = `fixed bottom-5 right-5 ${colors} text-white px-6 py-3 rounded-xl shadow-lg z-[100] flex items-center gap-3 animate-fade-in-up`;
        div.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
        document.body.appendChild(div);
        setTimeout(() => {
            div.style.transition = 'opacity 0.5s';
            div.style.opacity = '0';
            setTimeout(() => div.remove(), 500);
        }, 3000);
    }
}


// ========================================
// LESSONS MANAGEMENT
// ========================================

globalThis.loadPublishedLessons = async function () {
    const tableBody = document.getElementById('lessonsTableBody');
    const loading = document.getElementById('lessonsLoading');

    tableBody.innerHTML = '';
    loading.classList.remove('hidden');

    try {
        const lessons = await globalThis.ContributionService.getPublishedLessons();
        allPublishedLessons = lessons; // Cache
        renderLessonsTable(lessons);
    } catch (error) {
        console.error('Error loading lessons:', error);
        tableBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-500">${window.I18N_ADMIN?.lessons?.error_load || 'Error al cargar lecciones'}</td></tr>`;
    } finally {
        loading.classList.add('hidden');
    }
};

function renderLessonsTable(lessons) {
    const tableBody = document.getElementById('lessonsTableBody');

    if (lessons.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-stone-500">${window.I18N_ADMIN?.lessons?.empty || 'No hay lecciones publicadas.'}</td></tr>`;
        return;
    }

    tableBody.innerHTML = lessons.map(lesson => `
        <tr class="hover:bg-stone-50 dark:hover:bg-stone-700/30 transition-colors border-b border-stone-100 dark:border-stone-700 last:border-0">
            <td class="p-4">
                <div class="font-bold text-stone-800 dark:text-white">${lesson.title}</div>
                <div class="text-xs text-stone-500 font-mono mt-1 opacity-75">${lesson.id}</div>
            </td>
            <td class="p-4">
                <span class="px-2 py-1 rounded-md text-xs font-bold bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    ${lesson.level}
                </span>
            </td>
            <td class="p-4 text-sm text-stone-600 dark:text-stone-400">
                ${lesson.author || 'Sistema'}
            </td>
            <td class="p-4 text-sm text-stone-600 dark:text-stone-400">
                ${formatDate(lesson.publishedAt || lesson.updatedAt)}
            </td>
            <td class="p-4 text-right">
                <div class="flex items-center justify-end gap-2">
                    <a href="/Contribute/?editLesson=${lesson.id}" target="_blank"
                        class="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Editar">
                        <i class="fas fa-edit"></i>
                    </a>
                    <button data-id="${escHtml(lesson.id)}" data-title="${escHtml(lesson.title)}" onclick="showHistoryAdmin(this.dataset.id, this.dataset.title)"
                        class="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors" title="Historial y Versiones">
                        <i class="fas fa-history"></i>
                    </button>
                    <button onclick="deletePublishedLesson('${lesson.id}')"
                        class="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function filterLessonsTable(query) {
    if (!query) {
        renderLessonsTable(allPublishedLessons);
        return;
    }

    query = query.toLowerCase();
    const filtered = allPublishedLessons.filter(l =>
        l.title.toLowerCase().includes(query) ||
        l.level.toLowerCase().includes(query) ||
        l.author?.toLowerCase().includes(query) ||
        l.id.toLowerCase().includes(query)
    );
    renderLessonsTable(filtered);
}

// ========================================
// HISTORY & REVERT (ADMIN)
// ========================================

globalThis.showHistoryAdmin = async function (id, title) {
    // Reuse the Request Modal for History to verify it's working
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
    const modal = document.getElementById('requestModal');

    // Hide standard actions, show only close
    document.getElementById('approveBtn').style.display = 'none';
    document.getElementById('rejectBtn').style.display = 'none';

    modalTitle.innerHTML = `<i class="fas fa-history text-amber-500 mr-2"></i> Historial: ${escHtml(title)}`;
    modalBody.innerHTML = '<div class="text-center p-8"><i class="fas fa-spinner fa-spin text-3xl text-red-500"></i><p class="mt-2">Cargando historial...</p></div>';

    modal.classList.remove('hidden', 'opacity-0');

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/lessons/${id}/history`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Error fetching history');
        const history = await response.json();

        if (history.length === 0) {
            modalBody.innerHTML = `
                <div class="text-center p-12 bg-stone-50 dark:bg-stone-800 rounded-xl">
                    <i class="fas fa-history text-4xl text-stone-300 mb-4"></i>
                    <p class="text-stone-500">No hay versiones anteriores de esta lección.</p>
                </div>
            `;
            return;
        }

        modalBody.innerHTML = `
            <div class="space-y-4">
                ${history.map(v => `
                    <div class="flex items-center justify-between p-4 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl hover:shadow-md transition-all">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-700 flex items-center justify-center font-bold text-stone-600 dark:text-stone-300">
                                v${v.version}
                            </div>
                            <div>
                                <div class="font-bold text-stone-800 dark:text-white">Modificado por: ${escHtml(v.editedBy || 'Desconocido')}</div>
                                <div class="text-sm text-stone-500">${formatDate(v.editedAt)}</div>
                            </div>
                        </div>
                        <button onclick="revertLessonAdmin('${id}', ${v.version})" 
                            class="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-400 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">
                            <i class="fas fa-undo"></i> Restaurar
                        </button>
                    </div>
                `).join('')}
            </div>
        `;

    } catch (e) {
        modalBody.innerHTML = `<p class="text-red-500 text-center">Error al cargar historial: ${escHtml(e.message)}</p>`;
    }
};

                <div class="bg-white dark:bg-stone-800 p-6 rounded-2xl border border-stone-200 dark:border-stone-700">
                    <h3 class="flex items-center gap-2 mb-4 text-stone-800 dark:text-white font-bold">
                        <i class="fas fa-question-circle text-red-500"></i> ${window.I18N_ADMIN?.modals?.detail?.questions || 'Preguntas'}
                    </h3>
                    <div class="space-y-4">
                        ${(request.data.sections || []).flatMap(s => s.questions || []).map((q, idx) => `
                            <div class="p-4 bg-stone-50 dark:bg-stone-900/50 rounded-xl border border-stone-100 dark:border-stone-700/50">
                                <p class="font-bold text-stone-800 dark:text-white mb-2">${idx + 1}. ${escHtml(q.question)}</p>
                                <ul class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                    ${(q.options || []).map(opt => `
                                        <li class="flex items-center gap-2 ${opt === q.correct_answer ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-stone-500'}">
                                            <i class="fas ${opt === q.correct_answer ? 'fa-check-circle' : 'fa-circle text-[8px]'}"></i> ${escHtml(opt)}
                                        </li>
                                    `).join('')}
                                </ul>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    } else {
        modalBody.innerHTML = `
<p class="text-red-500 text-center">Error al cargar historial: ${escHtml(e.message)}</p>`;
    }
};

globalThis.revertLessonAdmin = async function (id, version) {
    if (!confirm(`¿Estás seguro de que deseas restaurar la versión ${version}? Esto creará una nueva versión con el contenido de ese momento.`)) return;

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/lessons/${id}/restore/${version}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to revert');

        showToast(`Versión ${version} restaurada con éxito`, 'success');
        closeModal();
        loadPublishedLessons(); // Refresh list

    } catch (e) {
        showToast('Error al restaurar: ' + e.message, 'error');
    }
};

globalThis.deletePublishedLesson = async function (id) {
    if (!confirm('¿ATENCIÓN: Estás seguro de eliminar esta lección PUBLICADA? Esta acción no se puede deshacer.')) return;

    try {
        await globalThis.ContributionService.deleteContribution(id);
        showToast('Lección eliminada correctamente', 'success');
        loadPublishedLessons(); // Refresh
    } catch (e) {
        showToast('Error al eliminar: ' + e.message, 'error');
    }
};


// ========================================
// USERS MANAGEMENT
// ========================================

globalThis.loadAdminUsers = async function () {
    const tableBody = document.getElementById('usersTableBody');
    const loading = document.getElementById('usersLoading');

    if (!tableBody) return;
    tableBody.innerHTML = '';
    loading.classList.remove('hidden');

    try {
        const users = await globalThis.ContributionService.getAdminUsers();
        allAdminUsers = users;
        renderUsersTable(users);
    } catch (error) {
        console.error('Error loading users:', error);
        tableBody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-red-500">Error al cargar usuarios</td></tr>';
    } finally {
        loading.classList.add('hidden');
    }
};

function renderUsersTable(users) {
    const tableBody = document.getElementById('usersTableBody');
    if (!tableBody) return;

    if (users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-stone-500">No se encontraron usuarios.</td></tr>';
        return;
    }

    tableBody.innerHTML = users.map(user => `
        <tr class="hover:bg-stone-50 dark:hover:bg-stone-700/30 transition-colors border-b border-stone-100 dark:border-stone-700 last:border-0">
            <td class="p-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-700 flex items-center justify-center text-stone-400">
                        ${user.profile?.avatar ? `<img src="${user.profile.avatar}" class="w-full h-full rounded-full object-cover">` : '<i class="fas fa-user"></i>'}
                    </div>
                    <div>
                        <div class="font-bold text-stone-800 dark:text-white">${escHtml(user.username)}</div>
                        <div class="text-xs text-stone-500 font-mono opacity-75">${user._id}</div>
                    </div>
                </div>
            </td>
            <td class="p-4 text-sm text-stone-600 dark:text-stone-400">
                ${escHtml(user.email)}
            </td>
            <td class="p-4">
                <select onchange="changeUserRole('${user._id}', this.value)" 
                    class="bg-stone-50 dark:bg-stone-800 border-none rounded-lg text-xs font-bold px-2 py-1 outline-none focus:ring-2 focus:ring-red-500
                    ${user.role === 'admin' ? 'text-red-700 dark:text-red-400' : 'text-stone-600 dark:text-stone-400'}">
                    <option value="user" ${user.role === 'user' ? 'selected' : ''}>USER</option>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>ADMIN</option>
                </select>
            </td>
            <td class="p-4">
                <div class="text-sm text-stone-800 dark:text-stone-200">🔥 ${user.stats?.streak?.current || 0} días</div>
                <div class="text-xs text-stone-500 mt-1">${formatDate(user.createdAt)}</div>
            </td>
            <td class="p-4 text-right">
                <div class="flex items-center justify-end gap-2">
                    <button onclick="deleteUserAdmin('${user._id}', '${escHtml(user.username)}')"
                        class="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Eliminar Usuario">
                        <i class="fas fa-user-slash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function filterUsersTable(query) {
    if (!query) {
        renderUsersTable(allAdminUsers);
        return;
    }

    query = query.toLowerCase();
    const filtered = allAdminUsers.filter(u =>
        u.username.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.role.toLowerCase().includes(query) ||
        u._id.toLowerCase().includes(query)
    );
    renderUsersTable(filtered);
}

globalThis.changeUserRole = async function (id, role) {
    const userToUpdate = allAdminUsers.find(u => u._id === id);
    if (!userToUpdate) return;
    
    if (!confirm(`¿Estás seguro de cambiar el rol de ${userToUpdate.username} a ${role.toUpperCase()}?`)) {
        renderUsersTable(allAdminUsers); // Reset selection
        return;
    }

    try {
        await globalThis.ContributionService.updateUserRole(id, role);
        showToast(`Rol de ${userToUpdate.username} actualizado a ${role}`, 'success');
        loadAdminUsers(); // Refresh
    } catch (error) {
        showToast('Error al actualizar rol: ' + error.message, 'error');
        renderUsersTable(allAdminUsers);
    }
};

globalThis.deleteUserAdmin = async function (id, username) {
    if (!confirm(`¿ATENCIÓN: Estás seguro de eliminar permanentemente al usuario ${username}? Esta acción no se puede deshacer.`)) return;

    try {
        await globalThis.ContributionService.deleteUser(id);
        showToast(`Usuario ${username} eliminado`, 'success');
        loadAdminUsers(); // Refresh
    } catch (error) {
        showToast('Error al eliminar usuario: ' + error.message, 'error');
    }
};

console.log('✅ Admin Contributions loaded (Tailwind Version)');
