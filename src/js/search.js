// ================================
// SEARCH & FILTER SYSTEM
// ================================

class SearchSystem {
    constructor() {
        this.init();
    }

    init() {
        this.injectStyles();
        this.setupKeyboardShortcuts();
    }

    injectStyles() {
        if (document.getElementById('search-styles')) return;

        const style = document.createElement('style');
        style.id = 'search-styles';
        style.textContent = `
            /* Search Bar */
            .search-bar {
                position: relative;
                margin-bottom: 30px;
            }

            .search-input {
                width: 100%;
                padding: 14px 50px 14px 50px;
                border: 2px solid var(--border-color);
                border-radius: 12px;
                font-size: 1rem;
                background: var(--bg-primary);
                color: var(--text-primary);
                transition: all 0.3s ease;
            }

            .search-input:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
            }

            body.dark-mode .search-input:focus {
                border-color: #818cf8;
                box-shadow: 0 0 0 4px rgba(129, 140, 248, 0.1);
            }

            .search-icon {
                position: absolute;
                left: 18px;
                top: 50%;
                transform: translateY(-50%);
                color: var(--text-muted);
                pointer-events: none;
            }

            .search-clear {
                position: absolute;
                right: 18px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                color: var(--text-muted);
                cursor: pointer;
                padding: 4px;
                display: none;
                border-radius: 4px;
                transition: all 0.2s;
            }

            .search-clear.visible {
                display: block;
            }

            .search-clear:hover {
                background: var(--bg-secondary);
                color: var(--text-primary);
            }

            .search-shortcut {
                position: absolute;
                right: 18px;
                top: 50%;
                transform: translateY(-50%);
                background: var(--bg-secondary);
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 0.75rem;
                color: var(--text-muted);
                pointer-events: none;
            }

            /* Filter Bar */
            .filter-bar {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
                flex-wrap: wrap;
            }

            .filter-chip {
                padding: 8px 16px;
                border: 2px solid var(--border-color);
                border-radius: 20px;
                background: var(--bg-primary);
                color: var(--text-primary);
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 0.9rem;
                font-weight: 500;
            }

            .filter-chip:hover {
                border-color: #667eea;
                transform: translateY(-2px);
            }

            .filter-chip.active {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-color: transparent;
            }

            body.dark-mode .filter-chip.active {
                background: linear-gradient(135deg, #818cf8 0%, #a78bfa 100%);
            }

            /* Search Results */
            .search-results {
                margin-top: 20px;
            }

            .no-results {
                text-align: center;
                padding: 60px 20px;
                color: var(--text-secondary);
            }

            .no-results i {
                font-size: 4rem;
                margin-bottom: 20px;
                opacity: 0.3;
            }

            .no-results h3 {
                font-size: 1.5rem;
                margin-bottom: 10px;
                color: var(--text-primary);
            }

            .no-results p {
                font-size: 1rem;
            }

            /* Highlight */
            .highlight {
                background: #fef08a;
                color: #854d0e;
                padding: 2px 4px;
                border-radius: 3px;
                font-weight: 600;
            }

            body.dark-mode .highlight {
                background: #713f12;
                color: #fef08a;
            }

            /* Search Modal (Ctrl+K style) */
            .search-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(8px);
                z-index: 10000;
                display: none;
                align-items: flex-start;
                justify-content: center;
                padding-top: 10vh;
            }

            .search-modal.active {
                display: flex;
            }

            .search-modal-content {
                background: var(--bg-primary);
                border-radius: 16px;
                width: 90%;
                max-width: 600px;
                max-height: 70vh;
                overflow: hidden;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                display: flex;
                flex-direction: column;
            }

            .search-modal-input {
                padding: 20px;
                border-bottom: 1px solid var(--border-color);
            }

            .search-modal-input input {
                width: 100%;
                padding: 12px 16px;
                border: none;
                background: var(--bg-secondary);
                border-radius: 8px;
                font-size: 1rem;
                color: var(--text-primary);
            }

            .search-modal-input input:focus {
                outline: none;
            }

            .search-modal-results {
                flex: 1;
                overflow-y: auto;
                padding: 10px;
            }

            .search-result-item {
                padding: 12px 16px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .search-result-item:hover {
                background: var(--bg-secondary);
            }

            .search-result-icon {
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                flex-shrink: 0;
            }

            .search-result-text {
                flex: 1;
            }

            .search-result-title {
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 4px;
            }

            .search-result-description {
                font-size: 0.85rem;
                color: var(--text-secondary);
            }

            @media (max-width: 640px) {
                .search-modal {
                    padding-top: 5vh;
                }

                .search-modal-content {
                    width: 95%;
                    max-height: 80vh;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Create search bar
    createSearchBar(container, options = {}) {
        const {
            placeholder = 'Buscar...',
            showShortcut = true,
            onSearch = () => {},
            onClear = () => {}
        } = options;

        const searchBar = document.createElement('div');
        searchBar.className = 'search-bar';
        searchBar.innerHTML = `
            <i class="fas fa-search search-icon"></i>
            <input 
                type="text" 
                class="search-input" 
                placeholder="${placeholder}"
                autocomplete="off"
            >
            <button class="search-clear">
                <i class="fas fa-times"></i>
            </button>
            ${showShortcut ? '<span class="search-shortcut">Ctrl+K</span>' : ''}
        `;

        const input = searchBar.querySelector('.search-input');
        const clearBtn = searchBar.querySelector('.search-clear');
        const shortcut = searchBar.querySelector('.search-shortcut');

        // Input event
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            
            if (value) {
                clearBtn.classList.add('visible');
                if (shortcut) shortcut.style.display = 'none';
            } else {
                clearBtn.classList.remove('visible');
                if (shortcut) shortcut.style.display = 'block';
            }

            onSearch(value);
        });

        // Clear button
        clearBtn.addEventListener('click', () => {
            input.value = '';
            clearBtn.classList.remove('visible');
            if (shortcut) shortcut.style.display = 'block';
            input.focus();
            onClear();
        });

        if (container) {
            container.appendChild(searchBar);
        }

        return searchBar;
    }

    // Create filter chips
    createFilters(container, filters, onFilterChange) {
        const filterBar = document.createElement('div');
        filterBar.className = 'filter-bar';

        filters.forEach(filter => {
            const chip = document.createElement('button');
            chip.className = 'filter-chip';
            chip.textContent = filter.label;
            chip.dataset.value = filter.value;

            if (filter.active) {
                chip.classList.add('active');
            }

            chip.addEventListener('click', () => {
                chip.classList.toggle('active');
                
                const activeFilters = Array.from(filterBar.querySelectorAll('.filter-chip.active'))
                    .map(c => c.dataset.value);
                
                onFilterChange(activeFilters);
            });

            filterBar.appendChild(chip);
        });

        if (container) {
            container.appendChild(filterBar);
        }

        return filterBar;
    }

    // Search and filter items
    searchAndFilter(items, query, filters = []) {
        let results = items;

        // Apply search query
        if (query) {
            const lowerQuery = query.toLowerCase();
            results = results.filter(item => {
                const searchableText = [
                    item.title,
                    item.description,
                    item.tags?.join(' ')
                ].filter(Boolean).join(' ').toLowerCase();

                return searchableText.includes(lowerQuery);
            });
        }

        // Apply filters
        if (filters.length > 0) {
            results = results.filter(item => {
                return filters.some(filter => {
                    if (item.category) {
                        return item.category === filter;
                    }
                    if (item.level) {
                        return item.level === filter;
                    }
                    return false;
                });
            });
        }

        return results;
    }

    // Highlight matches
    highlightMatches(text, query) {
        if (!query) return text;

        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
    }

    // Setup keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+K or Cmd+K to open search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.openSearchModal();
            }

            // Escape to close search
            if (e.key === 'Escape') {
                this.closeSearchModal();
            }
        });
    }

    // Open search modal
    openSearchModal() {
        let modal = document.getElementById('searchModal');
        
        if (!modal) {
            modal = this.createSearchModal();
        }

        modal.classList.add('active');
        const input = modal.querySelector('input');
        if (input) input.focus();
    }

    // Close search modal
    closeSearchModal() {
        const modal = document.getElementById('searchModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // Create search modal
    createSearchModal() {
        const modal = document.createElement('div');
        modal.id = 'searchModal';
        const lang = localStorage.getItem('language') || 'es';
        const searchPlaceholder = {
            es: 'Buscar en PandaLatam...',
            en: 'Search in PandaLatam...',
            tr: 'PandaLatam\'da ara...'
        };

        modal.innerHTML = `
            <div class="search-modal-content">
                <div class="search-modal-input">
                    <input type="text" placeholder="${searchPlaceholder[lang] || searchPlaceholder.es}" autocomplete="off">
                </div>
                <div class="search-modal-results" id="modalSearchResults">
                    <div class="no-results">
                        <i class="fas fa-search"></i>
                        <h3>${lang === 'tr' ? 'Bir şey ara' : (lang === 'en' ? 'Search something' : 'Busca algo')}</h3>
                        <p>${lang === 'tr' ? 'Aramak için yazmaya başlayın' : (lang === 'en' ? 'Start typing to search' : 'Empieza a escribir para buscar')}</p>
                    </div>
                </div>
            </div>
        `;

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeSearchModal();
            }
        });

        // Search input handler
        const input = modal.querySelector('input');
        input.addEventListener('input', (e) => {
            this.performModalSearch(e.target.value);
        });

        document.body.appendChild(modal);
        return modal;
    }

    // Perform modal search
    performModalSearch(query) {
        const resultsContainer = document.getElementById('modalSearchResults');
        const lang = localStorage.getItem('language') || 'es';
        const langPrefix = lang === 'es' ? '' : `/${lang}`;
        
        if (!query) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h3>${lang === 'tr' ? 'Bir şey ara' : (lang === 'en' ? 'Search something' : 'Busca algo')}</h3>
                    <p>${lang === 'tr' ? 'Aramak için yazmaya başlayın' : (lang === 'en' ? 'Start typing to search' : 'Empieza a escribir para buscar')}</p>
                </div>
            `;
            return;
        }

        // Dynamic search data with localized labels
        const searchData = [
            { es: 'Nivel A1', en: 'Level A1', tr: 'Seviye A1', desc_es: 'Fundamentos básicos del idioma chino', desc_en: 'Basic foundations of Chinese language', desc_tr: 'Çince dilinin temel temelleri', icon: 'book', url: `${langPrefix}/NivelA1/` },
            { es: 'Gramática', en: 'Grammar', tr: 'Gramatik', desc_es: 'Recursos de gramática china', desc_en: 'Chinese grammar resources', desc_tr: 'Çince dilbilgisi kaynakları', icon: 'language', url: `${langPrefix}/Gramatica/` },
            { es: 'Consejos', en: 'Tips', tr: 'İpuçları', desc_es: 'Tips y recursos de estudio', desc_en: 'Study tips and resources', desc_tr: 'Çalışma ipuçları ve kaynakları', icon: 'lightbulb', url: `${langPrefix}/Consejos/` },
            { es: 'Mi Perfil', en: 'My Profile', tr: 'Profilim', desc_es: 'Ver tu racha y configuración', desc_en: 'See your streak and settings', desc_tr: 'Serinizi ve ayarlarınızı görün', icon: 'user', url: `${langPrefix}/Perfil/` }
        ];

        const results = searchData.filter(item => {
            const title = item[lang] || item.es;
            const desc = item[`desc_${lang}`] || item.desc_es;
            const searchText = `${title} ${desc}`.toLowerCase();
            return searchText.includes(query.toLowerCase());
        });

        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h3>${lang === 'tr' ? 'Sonuç yok' : (lang === 'en' ? 'No results' : 'Sin resultados')}</h3>
                    <p>${lang === 'tr' ? `"${query}" için sonuç bulunamadı` : (lang === 'en' ? `No results found for "${query}"` : `No se encontraron resultados para "${query}"`)}</p>
                </div>
            `;
            return;
        }

        resultsContainer.innerHTML = results.map(item => {
            const title = item[lang] || item.es;
            const desc = item[`desc_${lang}`] || item.desc_es;
            return `
            <div class="search-result-item" onclick="globalThis.location.href='${item.url}'">
                <div class="search-result-icon">
                    <i class="fas fa-${item.icon}"></i>
                </div>
                <div class="search-result-text">
                    <div class="search-result-title">${this.highlightMatches(title, query)}</div>
                    <div class="search-result-description">${this.highlightMatches(desc, query)}</div>
                </div>
            </div>
        `;}).join('');
    }
}

// Initialize search system
globalThis.SearchSystem = new SearchSystem();

console.log('✅ Search system initialized');