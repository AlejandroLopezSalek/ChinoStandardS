/**
 * Auth Gate - Protection for specific Lab pages
 * Blocks UI and redirects to login if user is not authenticated.
 */
(function() {
    const checkAuth = () => {
        const isLoggedIn = globalThis.AuthService ? globalThis.AuthService.isLoggedIn() : !!localStorage.getItem('authToken');
        
        if (!isLoggedIn) {
            console.warn("AuthGate: Access denied. User not logged in.");
            blockUI();
        }
    };

    const blockUI = () => {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'auth-gate-overlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 9999;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(8px);
            color: white; padding: 2rem; text-align: center;
        `;

        const lang = window.location.pathname.startsWith('/en/') ? 'en' : (window.location.pathname.startsWith('/tr/') ? 'tr' : 'es');
        
        const messages = {
            'es': {
                'title': 'Acceso Restringido',
                'desc': 'Vení, no te quedés afuera. LabPanda requiere que inicies sesión para usar estas herramientas experimentales.',
                'login': 'Iniciar Sesión',
                'back': 'Volver al Inicio'
            },
            'en': {
                'title': 'Access Restricted',
                'desc': 'Hey, don\'t stay out! LabPanda requires you to log in to use these experimental tools.',
                'login': 'Log In',
                'back': 'Go Home'
            },
            'tr': {
                'title': 'Erişim Kısıtlandı',
                'desc': 'Hey, dışarıda kalma! LabPanda bu deneysel araçları kullanmak için giriş yapmanı gerektirir.',
                'login': 'Giriş Yap',
                'back': 'Ana Sayfaya Dön'
            }
        };

        const m = messages[lang] || messages['es'];

        overlay.innerHTML = `
            <div class="max-w-md w-full animate-fadeIn">
                <div class="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-500/50">
                    <i class="fas fa-lock text-3xl text-red-500"></i>
                </div>
                <h2 class="text-3xl font-black mb-4">${m.title}</h2>
                <p class="text-slate-400 mb-8 leading-relaxed">${m.desc}</p>
                <div class="flex flex-col gap-4">
                    <a href="/${lang === 'es' ? '' : lang + '/'}login/?returnUrl=${encodeURIComponent(location.pathname)}" 
                       class="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-600/20">
                        ${m.login}
                    </a>
                    <a href="/${lang === 'es' ? '' : lang + '/'}LabPanda/" class="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all">
                        ${m.back}
                    </a>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        // Block scrolling
        document.body.style.overflow = 'hidden';
    };

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAuth);
    } else {
        checkAuth();
    }
})();
