// ========================================
// COMMUNITY LESSONS - BOOKS AND LESSONS DISPLAY
// ========================================

// ---- Constants ----
const ITEMS_PER_PAGE = 6;
const ALL_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

// ---- State ----
let currentLevel = 'all';
let currentType = 'all'; // 'all' | 'books' | 'lessons'
let currentBooksPage = 1;
let currentLessonsPage = 1;
let allLessons = []; // cached lessons

// ---- Static Books Data ----
const booksData = {
    'A1': [
        {
            title: 'İstanbul A1 Ders Kitabı',
            url: '/assets/docs/A1.pdf',
            size: '~8 MB',
            pages: '104',
            description: 'Libro oficial de texto para nivel A1',
            level: 'A1'
        }
    ],
    'A2': [
        {
            title: 'A2 Türkçe Kitabı',
            url: '/assets/docs/A2.pdf',
            size: '~10 MB',
            pages: '120',
            description: 'Libro de texto para nivel A2',
            level: 'A2'
        }
    ],
    'B1': [
        {
            title: 'B1 Ders Kitabı',
            url: '/assets/docs/B1.pdf',
            size: '~12 MB',
            pages: '150',
            description: 'Libro de texto para nivel B1',
            level: 'B1'
        }
    ],
    'B2': [
        {
            title: 'B2 Ders Kitabı',
            url: '/assets/docs/B2.pdf',
            size: '~14 MB',
            pages: '160',
            description: 'Libro de texto para nivel B2',
            level: 'B2'
        }
    ],
    'C1': [
        {
            title: 'C1 Ders Kitabı',
            url: '/assets/docs/C1.pdf',
            size: '~15 MB',
            pages: '180',
            description: 'Libro de texto para nivel C1',
            level: 'C1'
        }
    ]
};

// ========================================
// INITIALISATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initTypeFilterTabs();
    initLevelFilterTabs();
    initSearch();
    initModalHoist();
    initModalClose();

    if (globalThis.ContributionService) {
        loadInitialData();
    } else {
        // Retry once after short delay if script order was off
        setTimeout(() => {
            if (globalThis.ContributionService) {
                loadInitialData();
            } else {
                console.error('ContributionService not available');
            }
        }, 500);
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.relative.inline-block')) {
            document.querySelectorAll('.dropdown-menu-active').forEach(menu => {
                menu.classList.add('hidden');
                menu.classList.remove('dropdown-menu-active');
            });
        }
    });

    console.log('✅ Community JS loaded');
});

function initTypeFilterTabs() {
    document.querySelectorAll('.type-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const clicked = e.currentTarget;
            const wasActive = clicked.classList.contains('active');
            // Deselect all
            document.querySelectorAll('.type-tab').forEach(t => t.classList.remove('active'));
            if (wasActive) {
                // Toggle off → show all
                currentType = 'all';
            } else {
                clicked.classList.add('active');
                currentType = clicked.dataset.type;
            }
            currentBooksPage = 1;
            currentLessonsPage = 1;
            filterContent(getSearchValue());
        });
    });
}

function initLevelFilterTabs() {
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const clicked = e.currentTarget;
            const wasActive = clicked.classList.contains('active');
            // Deselect all
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            if (wasActive) {
                // Toggle off → show all levels
                currentLevel = 'all';
            } else {
                clicked.classList.add('active');
                currentLevel = clicked.dataset.level;
            }
            currentBooksPage = 1;
            currentLessonsPage = 1;

            const searchInput = document.getElementById('communitySearch');
            if (searchInput) searchInput.value = '';

            updateContributeButton();
            filterContent('');
        });
    });
}

const SEARCH_DEBOUNCE_MS = 300;

function debounce(fn, delay) {
    let timer = null;
    return function debounced(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

function initSearch() {
    const searchInput = document.getElementById('communitySearch');
    if (!searchInput) return;
    const onSearch = debounce((e) => {
        currentBooksPage = 1;
        currentLessonsPage = 1;
        filterContent(e.target.value);
    }, SEARCH_DEBOUNCE_MS);
    searchInput.addEventListener('input', onSearch);
}

function initModalHoist() {
    const modal = document.getElementById('universalLessonModal');
    if (modal && modal.parentElement !== document.body) {
        document.body.appendChild(modal);
        console.log('✅ Community Modal moved to body root');
    }
}

function initModalClose() {
    const closeBtn = document.getElementById('closeUniversalModalBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeLessonModal);

    const modal = document.getElementById('universalLessonModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeLessonModal();
        });
    }
}

// ========================================
// DATA LOADING
// ========================================

async function loadInitialData() {
    try {
        allLessons = await globalThis.ContributionService.getPublishedLessons();
        // Apply URL search param ONCE after data loads (prevents flash/double render)
        const urlParams = new URLSearchParams(globalThis.location.search);
        const searchParam = urlParams.get('search');
        const searchInput = document.getElementById('communitySearch');
        if (searchParam && searchInput) {
            searchInput.value = searchParam;
            filterContent(searchParam);
        } else {
            filterContent('');
        }
    } catch (e) {
        console.error('Error loading lessons:', e);
    }
}

// ========================================
// FILTER / RENDER ORCHESTRATION
// ========================================

function getSearchValue() {
    return document.getElementById('communitySearch')?.value ?? '';
}

function filterContent(searchTerm = '') {
    const term = searchTerm.toLowerCase().trim();
    if (currentType !== 'lessons') loadBooks(term);
    if (currentType !== 'books') loadLessons(term);

    // Hide sections not relevant to the selected type
    const booksSection = document.getElementById('booksSection');
    const separator = document.getElementById('lessonsSeparator');
    const lessonsList = document.getElementById('lessonsList');
    const lessonsPag = document.getElementById('lessonsPagination');

    if (currentType === 'books') {
        if (separator) separator.classList.add('hidden');
        if (lessonsList) lessonsList.innerHTML = '';
        if (lessonsPag) lessonsPag.innerHTML = '';
    } else if (currentType === 'lessons') {
        if (booksSection) booksSection.style.display = 'none';
        if (separator) separator.classList.add('hidden');
    }
}

// ========================================
// BOOKS
// ========================================

async function loadBooks(searchTerm = '') {
    const booksSection = document.getElementById('booksSection');
    const booksGrid = document.getElementById('booksGrid');

    // Gather static books
    let levelBooks = gatherStaticBooks();

    // Fetch dynamic community books
    levelBooks = await appendDynamicBooks(levelBooks);

    // Apply search filter
    if (searchTerm) {
        levelBooks = levelBooks.filter(book =>
            book.title.toLowerCase().includes(searchTerm) ||
            book.description.toLowerCase().includes(searchTerm)
        );
    }

    if (levelBooks.length === 0) {
        booksSection.style.display = 'none';
        document.getElementById('booksPagination').innerHTML = '';
        return;
    }

    // Pagination slice
    const totalBooks = levelBooks.length;
    const totalPages = Math.ceil(totalBooks / ITEMS_PER_PAGE);
    if (currentBooksPage > totalPages) currentBooksPage = 1;
    const start = (currentBooksPage - 1) * ITEMS_PER_PAGE;
    const pageBooks = levelBooks.slice(start, start + ITEMS_PER_PAGE);

    booksSection.style.display = 'block';
    booksGrid.innerHTML = '';
    pageBooks.forEach(book => booksGrid.appendChild(buildBookCard(book)));

    renderPagination('booksPagination', totalBooks, currentBooksPage, (page) => {
        currentBooksPage = page;
        loadBooks(searchTerm);
    });
}

function gatherStaticBooks() {
    if (currentLevel === 'all') {
        return ALL_LEVELS.flatMap(lvl => booksData[lvl] || []);
    }
    return [...(booksData[currentLevel] || [])];
}

async function appendDynamicBooks(existingBooks) {
    try {
        const response = await fetch('/api/contributions/approved-books');
        if (!response.ok) return existingBooks;
        const allRequests = await response.json();
        const dynamicBooks = allRequests
            .filter(req =>
                currentLevel === 'all' || req.data?.level === currentLevel
            )
            .map(req => ({
                title: req.title,
                url: req.data.fileUrl || req.data.url,
                size: req.data.fileSize || 'PDF',
                pages: null,
                description: req.description,
                level: req.data?.level || '',
                isCommunity: true,
                author: req.submittedBy?.username || 'Comunidad'
            }));
        return [...existingBooks, ...dynamicBooks];
    } catch (e) {
        console.error('Error fetching dynamic books:', e);
        return existingBooks;
    }
}


function buildBookCard(book) {
    const card = document.createElement('div');
    card.className = 'group bg-white dark:bg-stone-800 rounded-xl p-6 shadow-sm border border-stone-200 dark:border-stone-700 flex flex-col items-center text-center gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-red-300 dark:hover:border-stone-600 h-full relative';

    if (book.isCommunity) {
        const badge = document.createElement('span');
        badge.className = 'absolute top-3 right-3 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs px-2 py-1 rounded-full font-bold';
        badge.textContent = 'Comunidad';
        card.appendChild(badge);
    }

    const icon = document.createElement('div');
    icon.className = 'w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-2 flex items-center justify-center text-red-600 dark:text-red-400 transition-transform group-hover:scale-110 duration-300';
    icon.innerHTML = '<i class="fas fa-file-pdf text-3xl"></i>';

    const titleEl = document.createElement('h3');
    titleEl.className = 'text-xl font-bold text-stone-800 dark:text-stone-100 m-0';
    titleEl.textContent = book.title;

    const descEl = document.createElement('p');
    descEl.className = 'text-stone-600 dark:text-stone-400 text-sm leading-relaxed m-0 flex-grow';
    descEl.textContent = book.description;

    const meta = document.createElement('div');
    meta.className = 'flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-stone-500 dark:text-stone-500 uppercase tracking-wide mt-2';
    meta.innerHTML = buildBookMetaHtml(book);

    const actions = document.createElement('div');
    actions.className = 'flex gap-3 w-full mt-4';
    actions.appendChild(buildBookViewBtn(book.url));
    actions.appendChild(buildBookDownloadBtn(book.url));

    card.appendChild(icon);
    card.appendChild(titleEl);
    card.appendChild(descEl);
    card.appendChild(meta);
    card.appendChild(actions);
    return card;
}

function buildBookMetaHtml(book) {
    let html = `<span class="flex items-center gap-1"><i class="fas fa-hdd"></i> ${book.size}</span>`;
    if (book.pages) {
        html = `<span class="flex items-center gap-1"><i class="fas fa-file-alt"></i> ${book.pages} pág.</span>` + html;
    }
    if (book.level && currentLevel === 'all') {
        html += `<span class="flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">${book.level}</span>`;
    }
    if (book.author) {
        html += `<span class="flex items-center gap-1"><i class="fas fa-user"></i> ${book.author}</span>`;
    }
    return html;
}

function buildBookViewBtn(url) {
    const btn = document.createElement('a');
    btn.href = /\.(pdf|pptx?|docx?)$/i.test(url)
        ? `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=false`
        : url;
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.className = 'flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600';
    btn.innerHTML = '<i class="fas fa-eye"></i> Ver';
    return btn;
}

function buildBookDownloadBtn(url) {
    const btn = document.createElement('a');
    btn.href = url;
    btn.download = '';
    btn.className = 'flex-1 py-2.5 px-4 rounded-md font-semibold text-sm flex items-center justify-center gap-2 transition-colors bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/50';
    btn.innerHTML = '<i class="fas fa-download"></i> Descargar';
    return btn;
}

// ========================================
// LESSONS
// ========================================

function loadLessons(searchTerm = '') {
    const container = document.getElementById('lessonsList');
    let lessons = [...allLessons];

    // Only community lessons
    lessons = lessons.filter(l => !l.source || l.source === 'community');

    // Filter by level
    if (currentLevel !== 'all') {
        lessons = lessons.filter(l => l.level === currentLevel);
    }

    // Filter by search term
    if (searchTerm) {
        lessons = lessons.filter(l =>
            l.title.toLowerCase().includes(searchTerm) ||
            l.description.toLowerCase().includes(searchTerm) ||
            l.author.toLowerCase().includes(searchTerm)
        );
    }

    // Sort newest first
    lessons.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    const separator = document.getElementById('lessonsSeparator');

    if (lessons.length === 0) {
        container.innerHTML = '';
        container.appendChild(buildEmptyState());
        if (separator) separator.classList.add('hidden');
        document.getElementById('lessonsPagination').innerHTML = '';
        return;
    }

    if (separator) separator.classList.remove('hidden');

    // Pagination slice
    const totalLessons = lessons.length;
    const totalPages = Math.ceil(totalLessons / ITEMS_PER_PAGE);
    if (currentLessonsPage > totalPages) currentLessonsPage = 1;
    const start = (currentLessonsPage - 1) * ITEMS_PER_PAGE;
    const pageLessons = lessons.slice(start, start + ITEMS_PER_PAGE);

    container.innerHTML = '';
    pageLessons.forEach(lesson => container.appendChild(buildLessonCard(lesson)));

    renderPagination('lessonsPagination', totalLessons, currentLessonsPage, (page) => {
        currentLessonsPage = page;
        loadLessons(searchTerm);
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

function buildEmptyState() {
    const el = document.createElement('div');
    el.className = 'col-span-3 text-center py-20 text-stone-400 dark:text-stone-500';
    el.innerHTML = `
        <i class="fas fa-book-open text-6xl mb-4 opacity-50"></i>
        <p class="text-xl">No hay lecciones encontradas</p>
    `;
    return el;
}

function buildLessonCard(lesson) {
    const card = document.createElement('div');
    card.className = 'group bg-white dark:bg-stone-800 rounded-xl p-6 shadow-sm border border-stone-200 dark:border-stone-700 flex flex-col gap-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-red-300 dark:hover:border-red-600/50 relative h-full';

    const header = document.createElement('div');
    header.className = 'flex justify-between items-start';
    header.innerHTML = `
        <div class="flex items-center gap-2 px-3 py-1 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-bold">
            <i class="fas fa-book-open"></i>
            <span>Lección ${lesson.level}</span>
        </div>
        <span class="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Publicada
        </span>
    `;

    const titleEl = document.createElement('h3');
    titleEl.className = 'text-xl font-bold text-stone-800 dark:text-stone-100 m-0 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors';
    titleEl.textContent = lesson.title;

    const descEl = document.createElement('p');
    descEl.className = 'text-stone-600 dark:text-stone-400 text-base leading-relaxed m-0 line-clamp-2';
    descEl.textContent = lesson.description;

    const meta = document.createElement('div');
    meta.className = 'flex items-center justify-between pt-4 mt-auto border-t border-stone-100 dark:border-stone-700/50 text-sm text-stone-500';
    meta.innerHTML = `
        <span class="flex items-center gap-2"><i class="fas fa-user text-stone-400"></i> ${lesson.author}</span>
        <span class="flex items-center gap-2"><i class="fas fa-calendar text-stone-400"></i> ${formatDate(lesson.publishedAt)}</span>
    `;

    const actions = buildLessonActions(lesson);

    card.appendChild(header);
    card.appendChild(titleEl);
    card.appendChild(descEl);
    card.appendChild(meta);
    card.appendChild(actions);
    return card;
}

function buildLessonActions(lesson) {
    const actions = document.createElement('div');
    actions.className = 'flex gap-2 w-full mt-2';

    const viewBtn = document.createElement('button');
    viewBtn.className = 'flex-grow py-2.5 px-4 rounded-lg font-semibold bg-red-600 text-white hover:bg-red-700 shadow-md hover:shadow-red-500/30 transition-all flex items-center justify-center gap-2';
    viewBtn.innerHTML = '<i class="fas fa-eye"></i> Ver Lección';
    viewBtn.onclick = () => viewLesson(lesson.id);
    actions.appendChild(viewBtn);

    const dropdownContainer = document.createElement('div');
    dropdownContainer.className = 'relative inline-block';

    const moreBtn = document.createElement('button');
    moreBtn.className = 'w-12 h-full rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-600 transition-colors flex items-center justify-center';
    moreBtn.innerHTML = '<i class="fas fa-ellipsis-v"></i>';
    moreBtn.setAttribute('aria-label', 'Más opciones');

    const dropdownMenu = document.createElement('div');
    dropdownMenu.className = 'absolute right-0 top-full mt-2 w-48 bg-white dark:bg-stone-800 rounded-xl shadow-xl border border-stone-200 dark:border-stone-700 z-20 hidden overflow-hidden flex-col';

    moreBtn.onclick = (e) => {
        e.stopPropagation();
        document.querySelectorAll('.dropdown-menu-active').forEach(menu => {
            if (menu !== dropdownMenu) menu.classList.add('hidden');
        });
        dropdownMenu.classList.toggle('hidden');
        dropdownMenu.classList.toggle('dropdown-menu-active');
    };

    const editBtn = buildDropdownItem('<i class="fas fa-edit text-red-500"></i> Sugerir Edición', false, () => {
        editPublishedLesson(lesson.id);
    });
    dropdownMenu.appendChild(editBtn);

    if (globalThis.ContributionService?.isAdmin()) {
        const deleteBtn = buildDropdownItem('<i class="fas fa-trash"></i> Eliminar', true, () => {
            deleteLesson(lesson.id);
        });
        dropdownMenu.appendChild(deleteBtn);
    }

    dropdownContainer.appendChild(moreBtn);
    dropdownContainer.appendChild(dropdownMenu);
    actions.appendChild(dropdownContainer);
    return actions;
}

function buildDropdownItem(innerHtml, isDanger, onClick) {
    const btn = document.createElement('button');
    const baseClass = 'w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition-colors border-b border-stone-100 dark:border-stone-700 last:border-0';
    const colorClass = isDanger
        ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
        : 'text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700';
    btn.className = `${baseClass} ${colorClass}`;
    btn.innerHTML = innerHtml;
    btn.onclick = (e) => { e.stopPropagation(); onClick(); };
    return btn;
}

// ========================================
// PAGINATION
// ========================================

/**
 * Renders HuggingFace-style pagination into a container element.
 * @param {string} containerId
 * @param {number} totalItems
 * @param {number} currentPage
 * @param {Function} onPageChange - called with the new page number
 */
function renderPagination(containerId, totalItems, currentPage, onPageChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (totalPages <= 1) return;

    const pageNumbers = buildPageNumbers(totalPages, currentPage);

    // Previous button
    container.appendChild(buildPaginationBtn(
        '<i class="fas fa-chevron-left"></i> Prev',
        currentPage <= 1,
        () => onPageChange(currentPage - 1)
    ));

    // Page number buttons
    pageNumbers.forEach(entry => {
        if (entry === '...') {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'px-3 py-2 text-stone-400 font-semibold select-none';
            ellipsis.textContent = '…';
            container.appendChild(ellipsis);
        } else {
            container.appendChild(buildPaginationBtn(
                String(entry),
                false,
                () => onPageChange(entry),
                entry === currentPage
            ));
        }
    });

    // Next button
    container.appendChild(buildPaginationBtn(
        'Next <i class="fas fa-chevron-right"></i>',
        currentPage >= totalPages,
        () => onPageChange(currentPage + 1)
    ));
}

/**
 * Builds the list of page numbers / ellipsis markers to show.
 * Always shows first, last, and ±1 page around current.
 */
function buildPageNumbers(totalPages, currentPage) {
    const pages = [];
    const always = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
    let prev = null;

    for (let i = 1; i <= totalPages; i++) {
        if (always.has(i)) {
            if (prev !== null && i - prev > 1) pages.push('...');
            pages.push(i);
            prev = i;
        }
    }
    return pages;
}

function buildPaginationBtn(html, disabled, onClick, isActive = false) {
    const btn = document.createElement('button');
    const activeClass = isActive
        ? 'bg-red-600 text-white shadow-md cursor-default'
        : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700';
    btn.className = `inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${activeClass} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`;
    btn.innerHTML = html;
    btn.disabled = disabled || isActive;
    if (!disabled && !isActive) btn.addEventListener('click', onClick);
    return btn;
}

// ========================================
// LESSON MODAL
// ========================================

async function viewLesson(id) {
    try {
        const lesson = await globalThis.ContributionService.getLessonById(id);
        if (!lesson) return;

        const modal = document.getElementById('universalLessonModal');
        const titleEl = document.getElementById('universalModalTitle');
        const contentEl = document.getElementById('universalModalContent');
        const actionsEl = document.getElementById('universalModalActions');

        if (!modal || !titleEl || !contentEl) return;

        titleEl.textContent = lesson.title;
        contentEl.innerHTML = buildLessonModalContent(lesson);
        buildModalActions(actionsEl, lesson);

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';

        if (globalThis.PronunciationSystem) {
            setTimeout(() => globalThis.PronunciationSystem.scanAndInject(contentEl), 100);
        }
    } catch (e) {
        console.error('Error viewing lesson:', e);
    }
}

function buildLessonModalContent(lesson) {
    let contentHtml = lesson.content || '';
    if (!contentHtml.trim().startsWith('<')) {
        contentHtml = globalThis.marked ? globalThis.marked.parse(contentHtml) : contentHtml;
    }

    return `
        <div class="mb-8 p-4 bg-stone-50 dark:bg-stone-700/50 rounded-xl border border-stone-200 dark:border-stone-700">
            <h3 class="text-sm font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3 flex items-center gap-2">
                <i class="fas fa-info-circle"></i> Información
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                    <strong class="text-stone-700 dark:text-stone-300 block mb-1">Nivel:</strong>
                    <span class="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded font-semibold">${lesson.level || 'N/A'}</span>
                </div>
                <div>
                    <strong class="text-stone-700 dark:text-stone-300 block mb-1">Autor:</strong>
                    <span class="text-stone-600 dark:text-stone-400">${lesson.author || 'Anónimo'}</span>
                </div>
                <div>
                    <strong class="text-stone-700 dark:text-stone-300 block mb-1">Fecha:</strong>
                    <span class="text-stone-600 dark:text-stone-400">${formatDate(lesson.publishedAt)}</span>
                </div>
            </div>
        </div>
        <div>
            <h3 class="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4 flex items-center gap-2 border-b border-stone-200 dark:border-stone-700 pb-2">
                <i class="fas fa-book text-red-600 dark:text-red-400"></i> Contenido
            </h3>
            <div class="prose dark:prose-invert max-w-none lesson-content">${contentHtml}</div>
        </div>
    `;
}

function buildModalActions(actionsEl, lesson) {
    if (!actionsEl) return;
    actionsEl.innerHTML = '';

    const lessonId = lesson.id || lesson._id;
    if (!lessonId) return;

    const editBtn = document.createElement('button');
    editBtn.className = 'bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg text-sm transition-colors flex items-center gap-2';
    editBtn.innerHTML = '<i class="fas fa-edit"></i> <span class="hidden sm:inline">Sugerir Edición</span>';
    editBtn.onclick = () => editPublishedLesson(lessonId);
    actionsEl.appendChild(editBtn);

    if (globalThis.ContributionService?.isAdmin()) {
        const historyBtn = document.createElement('button');
        historyBtn.className = 'bg-amber-500/80 hover:bg-amber-600 text-white px-3 py-1 rounded-lg text-sm transition-colors flex items-center gap-2';
        historyBtn.innerHTML = '<i class="fas fa-history"></i> <span class="hidden sm:inline">Historial</span>';
        historyBtn.onclick = () => showLessonHistory(lessonId);
        actionsEl.appendChild(historyBtn);
    }
}

function closeLessonModal() {
    const modal = document.getElementById('universalLessonModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = '';
    }
}

// ========================================
// LESSON HISTORY & REVERT
// ========================================

async function showLessonHistory(id) {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/lessons/${id}/history`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to fetch history');
        const history = await response.json();

        const contentEl = document.getElementById('universalModalContent');
        if (!contentEl) return;

        if (history.length === 0) {
            contentEl.innerHTML = '<p class="text-stone-500 text-center py-8">No hay historial de versiones.</p>';
            return;
        }

        const historyItems = history.map(v => `
            <div class="border-b border-stone-200 dark:border-stone-700 py-3 flex justify-between items-center">
                <div>
                    <span class="font-bold text-stone-700 dark:text-stone-300">v${v.version}</span>
                    <span class="text-xs text-stone-500 ml-2">${new Date(v.editedAt).toLocaleString()}</span>
                    <div class="text-xs text-stone-500">Editor: ${v.editedBy || 'Desconocido'}</div>
                </div>
                <button onclick="revertLesson('${id}', ${v.version})" class="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded hover:bg-amber-200">
                    Restaurar
                </button>
            </div>
        `).join('');

        contentEl.innerHTML = `
            <div class="mb-4">
                <button onclick="viewLesson('${id}')" class="text-sm text-red-500 hover:underline mb-2"><i class="fas fa-arrow-left"></i> Volver a la lección</button>
                <h3 class="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4">Historial de Versiones</h3>
                <div class="bg-stone-50 dark:bg-stone-800 rounded-lg p-4 max-h-96 overflow-y-auto">${historyItems}</div>
            </div>
        `;
    } catch (e) {
        console.error(e);
        alert('Error al cargar historial: ' + e.message);
    }
}

globalThis.revertLesson = async function (id, version) {
    if (!confirm(`¿Estás seguro de restablecer a la versión ${version}?`)) return;
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/lessons/${id}/revert`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ version })
        });
        if (!response.ok) throw new Error('Failed to revert');
        alert('Lección restaurada correctamente.');
        viewLesson(id);
    } catch (e) {
        alert('Error: ' + e.message);
    }
};

// ========================================
// DELETE LESSON
// ========================================

let lessonToDeleteId = null;

function deleteLesson(id) {
    lessonToDeleteId = id;
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('confirmDeleteBtn').onclick = confirmDeleteLesson;
    } else if (confirm('¿Confirmar eliminación?')) {
        performDelete(id);
    }
}

function closeDeleteModal() {
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) modal.style.display = 'none';
    lessonToDeleteId = null;
}

async function confirmDeleteLesson() {
    if (!lessonToDeleteId) return;
    performDelete(lessonToDeleteId);
    closeDeleteModal();
}

async function performDelete(id) {
    try {
        await globalThis.ContributionService.deleteContribution(id);
        if (globalThis.toastSuccess) {
            globalThis.toastSuccess('Lección eliminada correctamente', 'Éxito', 3000);
        } else {
            alert('Lección eliminada');
        }
        setTimeout(() => loadLessons(getSearchValue()), 500);
    } catch (e) {
        if (globalThis.toastError) {
            globalThis.toastError('Error al eliminar: ' + e.message, 'Error', 4000);
        } else {
            alert('Error al eliminar: ' + e.message);
        }
    }
}

// ========================================
// HELPERS
// ========================================

function editPublishedLesson(id) {
    globalThis.location.href = `/Contribute/?editLesson=${id}`;
}

function updateContributeButton() {
    const btn = document.getElementById('communityCreateBtn');
    if (!btn) return;
    btn.href = currentLevel === 'all' ? '/Contribute/' : `/Contribute/?level=${currentLevel}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const diffDays = Math.ceil(Math.abs(Date.now() - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;

    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
}

console.log('✅ Community Lessons JS loaded');