// ========================================
// GENERAL.JS - FINAL VERSION (MODIFICADO para document.documentElement)
// Global utilities with proper initialization order
// ========================================

// Global namespace to avoid conflicts
globalThis.AppUtils = globalThis.AppUtils || {};

// ========================================
// DARK MODE SYSTEM
// ========================================
globalThis.AppUtils.DarkMode = {
    init() {
        // Apply saved theme immediately (before DOM is fully ready)
        const savedTheme = localStorage.getItem('darkMode');
        const prefersDark = globalThis.matchMedia('(prefers-color-scheme: dark)').matches;

        // Aplica el tema inicial al <html> inmediatamente, USANDO document.documentElement
        if (savedTheme === 'enabled' || (!savedTheme && prefersDark)) {
            document.documentElement.classList.add('dark-mode');
        } else {
            document.documentElement.classList.remove('dark-mode');
        }

        // Sincroniza la configuración de toggle una vez que el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupToggle());
        } else {
            this.setupToggle();
        }

        // Listeners for system preference and storage remain
        globalThis.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            // Solo cambia si el usuario no tiene una preferencia guardada (null)
            if (!localStorage.getItem('darkMode')) {
                e.matches ? this.enable() : this.disable();
            }
        });

        globalThis.addEventListener('storage', (e) => {
            if (e.key === 'darkMode') {
                // Siempre obedece el cambio de almacenamiento para sincronizar entre pestañas
                e.newValue === 'enabled' ? this.enable() : this.disable();
            }
        });
    },

    setupToggle() {
        const toggles = document.querySelectorAll('#darkModeToggle, #darkModePref');
        toggles.forEach(toggle => {
            if (toggle) {
                // Usa document.documentElement para verificar el estado
                toggle.checked = document.documentElement.classList.contains('dark-mode');
                toggle.addEventListener('change', () => {
                    toggle.checked ? this.enable() : this.disable();
                });
            }
        });
    },

    enable() {
        // Usa document.documentElement
        document.documentElement.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'enabled');
        this.updateToggleState(true);
    },

    disable() {
        // Usa document.documentElement
        document.documentElement.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'disabled');
        this.updateToggleState(false);
    },

    updateToggleState(isEnabled) {
        document.querySelectorAll('#darkModeToggle, #darkModePref').forEach(toggle => {
            if (toggle) {
                toggle.checked = isEnabled;
            }
        });
    }
};

// ========================================
// BUTTON RIPPLE/CLICK EFFECTS
// ========================================
globalThis.AppUtils.ButtonEffects = {
    init() {
        // Selecciona todos los elementos clicables, PERO EXCLUYE el que tiene id="settingsTab"
        const clickableElements = document.querySelectorAll(
            '.btn:not(#settingsTab):not(#closeSettings), .tab:not(#settingsTab), .level-card, .resource-link, .explanation-btn, .close-modal'
        );

        // Listeners directos en los elementos
        clickableElements.forEach(element => {
            element.addEventListener('click', (e) => {
                this.addClickEffect(element, e);
            }, { passive: true });
        });
    },

    addClickEffect(element, event) {
        // Asegura que el contenedor esté listo para el ripple
        if (element.style.position !== 'relative') {
            element.style.position = 'relative';
        }
        if (element.style.overflow !== 'hidden') {
            element.style.overflow = 'hidden';
        }

        // 1. Create the ripple element
        const ripple = document.createElement('span');
        ripple.className = 'ripple';

        // 2. Aplicar estilos inline al ripple para que no ocupe espacio
        ripple.style.position = 'absolute';
        ripple.style.pointerEvents = 'none';

        element.appendChild(ripple);

        // 3. Position the ripple
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - (size / 2);
        const y = event.clientY - rect.top - (size / 2);

        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;

        // 4. Trigger animation
        ripple.classList.add('active');

        // 5. Remove ripple after animation
        setTimeout(() => {
            ripple.remove();
        }, 400);
    }
};

// ========================================
// SETTINGS PANEL - FINAL FIX
// ========================================
globalThis.AppUtils.Settings = {
    initialized: false,

    init() {
        // Prevent double initialization


        // Use a small delay to ensure DOM is ready
        setTimeout(() => {
            const settingsTab = document.getElementById('settingsTab');
            const overlay = document.getElementById('settingsOverlay');
            const closeBtn = document.getElementById('closeSettingsBtn');


            if (!settingsTab || !overlay) {
                console.warn('[Settings] Required elements not found');
                return;
            }

            // Remove any existing listeners
            const newSettingsTab = settingsTab.cloneNode(true);
            settingsTab.parentNode.replaceChild(newSettingsTab, settingsTab);

            // Add click handler
            newSettingsTab.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                this.open(overlay);
            }, { capture: true });

            // Close button
            if (closeBtn) {
                const newCloseBtn = closeBtn.cloneNode(true);
                closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

                newCloseBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.close(overlay);
                });
            }

            // Overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.close(overlay);
                }
            });

            // Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && overlay.classList.contains('active')) {
                    this.close(overlay);
                }
            });

            this.initialized = true;
        }, 100);
    },

    open(overlay) {
        // Remove hidden immediately to put it in the DOM
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');

        // Add opacity transition after a small tick
        // (This allows the display change to register first)
        requestAnimationFrame(() => {
            overlay.classList.remove('opacity-0');
            overlay.classList.add('opacity-100');

            const panel = overlay.querySelector('.settings-panel');
            if (panel) {
                panel.classList.remove('scale-95');
                panel.classList.add('scale-100');
            }
        });

        document.body.classList.add('overflow-hidden'); // Tailwind compatible
    },

    close(overlay) {
        // Fade out first
        overlay.classList.remove('opacity-100');
        overlay.classList.add('opacity-0');

        const panel = overlay.querySelector('.settings-panel');
        if (panel) {
            panel.classList.remove('scale-100');
            panel.classList.add('scale-95');
        }

        document.body.classList.remove('overflow-hidden');

        // Hide display after transition finishes (300ms matches duration-300)
        setTimeout(() => {
            overlay.classList.remove('flex');
            overlay.classList.add('hidden');
        }, 300);
    }
};

// ========================================
// TAB ACTIVE STATE
// ========================================
globalThis.AppUtils.Tabs = {
    init() {
        const tabs = document.querySelectorAll('.tab:not(#settingsTab)');
        const currentPath = globalThis.location.pathname;

        tabs.forEach(tab => {
            const tabPath = tab.getAttribute('href');

            // Remove 'active' from all tabs first
            tab.classList.remove('active');

            // Handle index.html vs /
            if (currentPath === '/' || currentPath.endsWith('index.html')) {
                if (tabPath === 'index.html' || tabPath === '/') {
                    tab.classList.add('active');
                }
            }
            // Handle other pages
            else if (tabPath && currentPath.includes(tabPath)) {
                tab.classList.add('active');
            }
        });
    }
};

// ========================================
// ACCESSIBILITY & PREFERENCES
// ========================================
globalThis.AppUtils.Accessibility = {
    init() {
        this.applySavedPreferences();
        this.setupPreferenceListeners();
    },

    applySavedPreferences() {
        // Font Size
        const savedFontSize = localStorage.getItem('fontSize');
        if (savedFontSize) {
            this.updateFontSize(savedFontSize);
        }

        // Reduced Motion
        const prefersReducedMotion = globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            document.body.classList.add('reduced-motion');
        }
    },

    setupPreferenceListeners() {
        const fontSizeSelect = document.getElementById('fontSizePref');
        if (fontSizeSelect) {
            fontSizeSelect.value = localStorage.getItem('fontSize') || 'medium';
            fontSizeSelect.addEventListener('change', (e) => {
                this.updateFontSize(e.target.value);
            });
        }
    },

    updateFontSize(size) {
        const sizes = { small: '14px', medium: '16px', large: '18px' };
        document.documentElement.style.fontSize = sizes[size] || '16px';
        localStorage.setItem('fontSize', size);
    }
};

// ========================================
// PUSH NOTIFICATIONS
// ========================================
globalThis.AppUtils.Notifications = {
    async init() {
        if (!('serviceWorker' in navigator) || !('PushManager' in globalThis)) {
            console.log('Push messaging isn\'t supported.');
            return;
        }

        // Check permission status
        if (Notification.permission === 'granted') {
            // Check actual subscription
            try {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                this.updateUI(!!subscription);
            } catch (e) {
                console.error('Error checking subscription:', e);
                this.updateUI(false);
            }
        } else {
            this.updateUI(false);
        }
    },

    async subscribe() {
        try {
            // 1. Get Public Key
            const response = await fetch('/api/notifications/public-key');
            const data = await response.json();
            const publicKey = data.publicKey;

            if (!publicKey) throw new Error('No public key found');

            // 2. Register SW (ensure it is ready)
            const registration = await navigator.serviceWorker.ready;

            // 3. Subscribe
            const convertedKey = this.urlBase64ToUint8Array(publicKey);
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedKey
            });

            // 4. Send to Backend
            await fetch('/api/notifications/subscribe', {
                method: 'POST',
                body: JSON.stringify(subscription),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('Subscribed successfully!');
            this.updateUI(true);
            if (globalThis.toastSuccess) {
                globalThis.toastSuccess('¡Notificaciones activadas! Te avisaremos para que vuelvas a estudiar.', 'Éxito', 5000);
            } else {
                alert('¡Notificaciones activadas! Te avisaremos para que vuelvas a estudiar.');
            }

        } catch (error) {
            console.error('Subscription failed:', error);
            if (globalThis.toastError) {
                globalThis.toastError('No se pudo activar las notificaciones. Intenta más tarde.', 'Error', 5000);
            } else {
                alert('No se pudo activar las notificaciones. Intenta más tarde.');
            }
        }
    },

    async unsubscribe() {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
                // Optional: Call backend to remove subscription here
                console.log('Unsubscribed successfully');
            }
            this.updateUI(false);
            if (globalThis.toastInfo) {
                globalThis.toastInfo('Notificaciones desactivadas. Ya no recibirás alertas.', 'Desactivado', 4000);
            }
        } catch (error) {
            console.error('Error unsubscribing', error);
            if (globalThis.toastError) {
                globalThis.toastError('No se pudo desactivar. Intenta de nuevo.', 'Error', 4000);
            }
        }
    },

    updateUI(isSubscribed) {
        const toggle = document.getElementById('notificationsToggle');
        if (toggle) {
            // Remove previous listeners to avoid duplicates if re-initialized
            const newToggle = toggle.cloneNode(true);
            toggle.parentNode.replaceChild(newToggle, toggle);

            newToggle.checked = isSubscribed;

            newToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    // AUTH CHECK
                    if (globalThis.AuthService && !globalThis.AuthService.isLoggedIn()) {
                        e.target.checked = false;
                        if (globalThis.toastWarning) {
                            globalThis.toastWarning('Debes iniciar sesión para activar las notificaciones.', 'Solo Usuarios Registrados', 4000);
                        } else {
                            alert('Debes iniciar sesión para activar las notificaciones.');
                        }
                        return;
                    }
                    this.subscribe();
                } else {
                    this.unsubscribe();
                }
            });
        }
    },

    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replaceAll('-', '+')
            .replaceAll('_', '/');

        const rawData = globalThis.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.codePointAt(i);
        }
        return outputArray;
    }
};

// ========================================
// GENERIC UTILITIES
// ========================================
globalThis.AppUtils.Utils = {
    throttle(func, limit) {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    generateId() {
        // Use crypto.randomUUID() for cryptographically secure random IDs (fixes SonarCloud security hotspot)
        return Date.now().toString(36) + crypto.randomUUID().substring(0, 9);
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// ========================================
// INITIALIZATION
// ========================================
globalThis.AppUtils.init = function () {

    // 1. Initialize dark mode FIRST (before DOM ready). 
    // La detección inicial se hizo en el <head>, aquí solo se inicia el sistema completo.
    this.DarkMode.init();

    // 2. Initialize other systems when DOM is ready
    const initOtherSystems = () => {
        this.Tabs.init();
        this.Accessibility.init();
        this.ButtonEffects.init();

        // Settings LAST with extra delay
        setTimeout(() => {
            this.Settings.init();
            this.Notifications.init();
        }, 200);


    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initOtherSystems);
    } else {
        initOtherSystems();
    }
};

// ========================================
// AUTO-INITIALIZE
// ========================================
(function () {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => globalThis.AppUtils.init(), 50);
        });
    } else {
        setTimeout(() => globalThis.AppUtils.init(), 50);
    }
})();

