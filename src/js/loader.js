// ================================
// LOADER & SKELETON SYSTEM
// ================================

class LoaderSystem {
    constructor() {
        this.loadingCount = 0;
        this.init();
    }

    init() {
        this.injectStyles();
        this.createGlobalLoader();
        this.setupInterceptors();
    }

    // Inject loader styles
    injectStyles() {
        if (document.getElementById('loader-styles')) return;

        const style = document.createElement('style');
        style.id = 'loader-styles';
        style.textContent = `
            /* Global Loader Overlay */
            .global-loader {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(8px);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s, visibility 0.3s;
            }

            .global-loader.active {
                opacity: 1;
                visibility: visible;
            }

            body.dark-mode .global-loader {
                background: rgba(0, 0, 0, 0.85);
            }

            /* Spinner */
            .loader-spinner {
                width: 60px;
                height: 60px;
                border: 4px solid rgba(255, 255, 255, 0.2);
                border-top-color: #667eea;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
            }

            body.dark-mode .loader-spinner {
                border-color: rgba(255, 255, 255, 0.1);
                border-top-color: #818cf8;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            /* Skeleton Loaders */
            .skeleton {
                background: linear-gradient(
                    90deg,
                    #f0f0f0 25%,
                    #e0e0e0 50%,
                    #f0f0f0 75%
                );
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
                border-radius: 8px;
            }

            body.dark-mode .skeleton {
                background: linear-gradient(
                    90deg,
                    #2d2d2d 25%,
                    #3d3d3d 50%,
                    #2d2d2d 75%
                );
                background-size: 200% 100%;
            }

            @keyframes shimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }

            .skeleton-text {
                height: 16px;
                margin-bottom: 12px;
            }

            .skeleton-title {
                height: 24px;
                width: 60%;
                margin-bottom: 16px;
            }

            .skeleton-avatar {
                width: 60px;
                height: 60px;
                border-radius: 50%;
            }

            .skeleton-card {
                height: 200px;
                margin-bottom: 20px;
            }

            /* Inline Loader */
            .inline-loader {
                display: inline-block;
                width: 16px;
                height: 16px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-top-color: white;
                border-radius: 50%;
                animation: spin 0.6s linear infinite;
                vertical-align: middle;
                margin-left: 8px;
            }

            /* Progress Bar */
            .progress-bar {
                position: fixed;
                top: 0;
                left: 0;
                width: 0%;
                height: 3px;
                background: linear-gradient(90deg, #667eea, #764ba2);
                z-index: 10000;
                transition: width 0.3s ease;
            }

            body.dark-mode .progress-bar {
                background: linear-gradient(90deg, #818cf8, #a78bfa);
            }

            /* Button Loading State */
            .btn.loading {
                position: relative;
                color: transparent !important;
                pointer-events: none;
            }

            .btn.loading::after {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                width: 16px;
                height: 16px;
                margin: -8px 0 0 -8px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-top-color: white;
                border-radius: 50%;
                animation: spin 0.6s linear infinite;
            }
        `;
        document.head.appendChild(style);
    }

    // Create global loader element
    createGlobalLoader() {
        if (document.getElementById('globalLoader')) return;

        const loader = document.createElement('div');
        loader.id = 'globalLoader';
        loader.className = 'global-loader';
        loader.innerHTML = '<div class="loader-spinner"></div>';
        document.body.appendChild(loader);

        // Create progress bar
        const progressBar = document.createElement('div');
        progressBar.id = 'progressBar';
        progressBar.className = 'progress-bar';
        document.body.appendChild(progressBar);
    }

    // Show global loader
    show() {
        this.loadingCount++;
        const loader = document.getElementById('globalLoader');
        if (loader) {
            loader.classList.add('active');
        }
    }

    // Hide global loader
    hide() {
        this.loadingCount--;
        if (this.loadingCount <= 0) {
            this.loadingCount = 0;
            const loader = document.getElementById('globalLoader');
            if (loader) {
                loader.classList.remove('active');
            }
        }
    }

    // Update progress bar
    setProgress(percent) {
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            progressBar.style.width = `${percent}%`;
            if (percent >= 100) {
                setTimeout(() => {
                    progressBar.style.width = '0%';
                }, 300);
            }
        }
    }

    // Add loading state to button
    buttonLoading(button, loading = true) {
        if (loading) {
            button.classList.add('loading');
            button.disabled = true;
            button.dataset.originalText = button.textContent;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
            if (button.dataset.originalText) {
                button.textContent = button.dataset.originalText;
            }
        }
    }

    // Create skeleton loader
    createSkeleton(type = 'text', count = 1) {
        const container = document.createElement('div');

        for (let i = 0; i < count; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = `skeleton skeleton-${type}`;
            container.appendChild(skeleton);
        }

        return container;
    }

    // Setup fetch interceptor
    setupInterceptors() {
        const originalFetch = globalThis.fetch;

        globalThis.fetch = async (...args) => {
            // Check URL to determine if we should show loader
            const [resource] = args;
            // Handle both string URL and Request object
            const url = (resource instanceof Request ? resource.url : resource.toString() || '');

            // ⚡ EXCLUDE CHAT & ADS from global loader
            if (url.includes('/api/chat') ||
                url.includes('googlesyndication') ||
                url.includes('doubleclick') ||
                url.includes('googleads') ||
                url.includes('adtrafficquality')) {
                return originalFetch(...args);
            }

            this.show();
            this.setProgress(30);

            try {
                const response = await originalFetch(...args);
                this.setProgress(70);

                // Clone response for reading
                const clonedResponse = response.clone();

                // Read the response
                clonedResponse.json().catch(() => { }).finally(() => {
                    this.setProgress(100);
                    this.hide();
                });

                return response;
            } catch (error) {
                this.setProgress(100);
                this.hide();
                throw error;
            }
        };
    }
}

// Initialize loader system
globalThis.LoaderSystem = new LoaderSystem();

// Helper functions
globalThis.showLoader = () => globalThis.LoaderSystem.show();
globalThis.hideLoader = () => globalThis.LoaderSystem.hide();
globalThis.setProgress = (percent) => globalThis.LoaderSystem.setProgress(percent);
globalThis.buttonLoading = (button, loading) => globalThis.LoaderSystem.buttonLoading(button, loading);

