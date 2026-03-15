// ================================
// APP INITIALIZATION - PandaLatam
// Main entry point for all systems
// ================================

(function () {
    'use strict';

    // ================================
    // APP CLASS
    // ================================
    class PandaLatamApp {
        version = '1.0.0';
        initialized = false;

        constructor() {
            this.systems = {};
            this.startTime = Date.now();
        }

        async init() {
            if (this.initialized) {
                console.warn('App already initialized');
                return;
            }



            try {
                // Initialize systems in order
                await this.initializeSystems();

                // Setup global error handlers
                this.setupErrorHandlers();

                // Register service worker
                await this.registerServiceWorker();

                // Setup PWA install prompt
                this.setupPWAInstall();

                // Initialize page-specific features
                this.initializePageFeatures();

                // Mark as initialized
                this.initialized = true;

                const initTime = Date.now() - this.startTime;

                // Track initialization
                if (globalThis.analytics) {
                    globalThis.analytics.track('app_initialized', {
                        version: this.version,
                        initTime: initTime
                    });
                }

            } catch (error) {
                console.error('❌ App initialization failed:', error);
                this.showInitError(error);
            }
        }

        async initializeSystems() {

            // All systems are already initialized via their individual scripts
            // Just verify they're available
            this.systems = {
                config: globalThis.APP_CONFIG,
                auth: globalThis.AuthService,
                loader: globalThis.LoaderSystem,
                toast: globalThis.ToastSystem,
                search: globalThis.SearchSystem,
                animation: globalThis.AnimationSystem,
                cache: globalThis.CacheSystem,
                analytics: globalThis.AnalyticsSystem,
                utils: globalThis.AppUtils
            };

            // Verify critical systems
            const criticalSystems = ['config', 'utils'];
            const missing = criticalSystems.filter(sys => !this.systems[sys]);

            if (missing.length > 0) {
                throw new Error(`Critical systems missing: ${missing.join(', ')}`);
            }
        }

        setupErrorHandlers() {
            // Global error handler
            globalThis.addEventListener('error', (event) => {
                console.error('Global error:', event.error);

                // Show user-friendly message for critical errors
                if (event.error?.message) {
                    this.handleError(event.error);
                }
            });

            // Unhandled promise rejection handler
            globalThis.addEventListener('unhandledrejection', (event) => {
                console.error('Unhandled promise rejection:', event.reason);
                this.handleError(event.reason);
            });
        }

        handleError(error) {
            // Don't show errors for minor issues
            const minorErrors = ['Failed to fetch', 'NetworkError', 'Load failed'];
            const isMinor = minorErrors.some(msg => error.message?.includes(msg));

            if (!isMinor && globalThis.ToastSystem) {
                globalThis.ToastSystem.error(
                    'Ha ocurrido un error. Por favor, intenta de nuevo.',
                    'Error'
                );
            }
        }

        async registerServiceWorker() {
            if (!('serviceWorker' in navigator)) {
                console.log('Service Worker not supported');
                return;
            }

            try {
                const registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/'
                });

                console.log('✅ Service Worker registered:', registration.scope);

                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New service worker available - Auto refresh
                            globalThis.location.reload();
                        }
                    });
                });

            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }

        showUpdateAvailable() {
            // Auto-refresh implementation replaces this
            globalThis.location.reload();
        }

        setupPWAInstall() {
            globalThis.addEventListener('beforeinstallprompt', (e) => {
                // Prevent Chrome 67 and earlier from automatically showing the prompt
                e.preventDefault();
                // Stash the event so it can be triggered later.
                globalThis.deferredPrompt = e;

                // Update UI notify the user they can add to home screen
                this.updateInstallButton();
            });

            globalThis.addEventListener('appinstalled', () => {
                console.log('✅ PWA installed');
                globalThis.deferredPrompt = null;
                if (globalThis.analytics) globalThis.analytics.track('pwa_installed');
                if (globalThis.ToastSystem) globalThis.ToastSystem.success('¡App instalada correctamente!');
            });
        }

        updateInstallButton() {
            const installBtn = document.getElementById('installAppBtn');
            if (installBtn && globalThis.deferredPrompt) {
                installBtn.style.display = 'flex'; // Use flex to match layouts
                const buttonElement = installBtn.querySelector('button') || installBtn;
                
                buttonElement.onclick = async () => {
                    const promptEvent = globalThis.deferredPrompt;
                    if (!promptEvent) return;

                    promptEvent.prompt();
                    const { outcome } = await promptEvent.userChoice;
                    console.log(`User response to the install prompt: ${outcome}`);

                    globalThis.deferredPrompt = null;
                    installBtn.style.display = 'none';
                };
            }
        }

        initializePageFeatures() {
            const path = globalThis.location.pathname;

            // Add animation classes to cards
            document.querySelectorAll('.level-card, .grammar-card, .channel-category').forEach((card, index) => {
                card.classList.add('fade-in', `stagger-${Math.min(index + 1, 5)}`);
            });

            // Initialize search on grammar page
            if (path.includes('Gramatica')) {
                this.initializeGrammarSearch();
            }

            // Initialize activity tracking on consejos page
            if (path.includes('Consejos')) {
                this.initializeActivityTracking();
            }

            // Initialize streak display on index
            if (path === '/' || path.includes('index')) {
                this.initializeStreakDisplay();
            }

            // Add hover effects to buttons
            document.querySelectorAll('.btn').forEach(btn => {
                btn.classList.add('hover-lift');
            });

            // Check if install button should be shown (for Dashboard)
            this.updateInstallButton();
        }

        initializeGrammarSearch() {
            const cardsContainer = document.querySelector('.grammar-cards');
            if (!cardsContainer) return;

            const searchContainer = document.createElement('div');
            cardsContainer.before(searchContainer);

            globalThis.SearchSystem.createSearchBar(searchContainer, {
                placeholder: 'Buscar temas de gramática...',
                onSearch: (query) => {
                    const cards = document.querySelectorAll('.grammar-card');

                    cards.forEach(card => {
                        const title = card.querySelector('h3')?.textContent || '';
                        const desc = card.querySelector('.card-description')?.textContent || '';
                        const searchText = `${title} ${desc}`.toLowerCase();

                        if (searchText.includes(query.toLowerCase())) {
                            card.style.display = 'block';
                        } else {
                            card.style.display = 'none';
                        }
                    });
                },
                onClear: () => {
                    document.querySelectorAll('.grammar-card').forEach(card => {
                        card.style.display = 'block';
                    });
                }
            });
        }

        initializeActivityTracking() {
            const activities = document.querySelectorAll('.activity-item');

            activities.forEach(activity => {
                activity.addEventListener('click', () => {
                    activity.classList.toggle('completed');

                    if (globalThis.analytics) {
                        globalThis.analytics.track('activity_toggled', {
                            activity: activity.querySelector('h4')?.textContent,
                            completed: activity.classList.contains('completed')
                        });
                    }
                });
            });
        }

        initializeStreakDisplay() {
            // This will be called by index.js
        }

        showInitError(error) {
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 30px;
                border-radius: 12px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                z-index: 10000;
                max-width: 400px;
                text-align: center;
            `;
            errorDiv.innerHTML = `
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ef4444; margin-bottom: 20px;"></i>
                <h2 style="margin-bottom: 10px; color: #1e293b;">Error de inicialización</h2>
                <p style="color: #64748b; margin-bottom: 20px;">
                    No se pudo inicializar la aplicación. Por favor, recarga la página.
                </p>
                <button onclick="globalThis.location.reload()" style="
                    padding: 12px 24px;
                    background: #667eea;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 1rem;
                    font-weight: 600;
                ">
                    Recargar
                </button>
            `;
            document.body.appendChild(errorDiv);
        }

        // Public API
        getVersion() {
            return this.version;
        }

        getSystem(name) {
            return this.systems[name];
        }

        isInitialized() {
            return this.initialized;
        }
    }

    // ================================
    // AUTO-INITIALIZE
    // ================================

    // Wait for DOM and all systems to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        initializeApp();
    }

    function initializeApp() {
        // Small delay to ensure all scripts are loaded
        setTimeout(() => {
            globalThis.PandaLatamApp = new PandaLatamApp();
            globalThis.PandaLatamApp.init();
        }, 100);
    }

    // ================================
    // PERFORMANCE MONITORING
    // ================================

    globalThis.addEventListener('load', () => {
        // Log performance metrics
        if (globalThis.performance && globalThis.APP_CONFIG?.isDevelopment()) {
            const perfData = performance.getEntriesByType('navigation')[0];

            console.group('⚡ Performance Metrics');
            console.log('Load Time:', Math.round(perfData.loadEventEnd - perfData.loadEventStart), 'ms');
            console.log('DOM Ready:', Math.round(perfData.domContentLoadedEventEnd - perfData.loadEventStart), 'ms');
            console.log('Transfer Size:', Math.round(perfData.transferSize / 1024), 'KB');
            console.groupEnd();
        }
    });

    // ================================
    // DEVELOPMENT HELPERS
    // ================================

    if (globalThis.APP_CONFIG?.isDevelopment()) {
        // Expose useful debugging functions
        globalThis.debug = {
            clearCache: () => globalThis.cache?.clear(),
            clearStorage: () => localStorage.clear(),
            getAnalytics: () => globalThis.analytics?.summary(),
            getCacheStats: () => globalThis.cache?.stats(),
            systems: () => globalThis.PandaLatamApp?.systems,
            reload: () => globalThis.location.reload(),
            version: () => globalThis.PandaLatamApp?.version
        };

        console.log('%c💡 Development Mode', 'color: #f59e0b; font-weight: bold;');
        console.log('Type debug in console for helper functions');
    }

})();

