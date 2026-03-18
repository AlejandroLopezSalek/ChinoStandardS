const ENABLE_MOCK = false;

if (ENABLE_MOCK) {
    const mockUsers = JSON.parse(localStorage.getItem('mockUsers') || '[{"id":1,"username":"demo","email":"demo@test.com","password":"demo123"}]');

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function (url, options = {}) {
        if (url.includes('/register') || url.includes('/api/register')) {
            const body = JSON.parse(options.body);
            const exists = mockUsers.find(u => u.username === body.username || u.email === body.email);

            if (exists) {
                return {
                    ok: false,
                    json: async () => ({ message: 'Usuario o email ya registrado' })
                };
            }

            const newUser = { id: Date.now(), username: body.username, email: body.email, password: body.password };
            mockUsers.push(newUser);
            localStorage.setItem('mockUsers', JSON.stringify(mockUsers));

            return {
                ok: true,
                json: async () => ({
                    token: 'mock-token-' + Date.now(),
                    user: { id: newUser.id, username: newUser.username, email: newUser.email }
                })
            };
        }

        if (url.includes('/login') || url.includes('/api/login')) {
            const body = JSON.parse(options.body);
            const user = mockUsers.find(u =>
                (u.username === body.identifier || u.email === body.identifier) &&
                u.password === body.password
            );

            if (user) {
                return {
                    ok: true,
                    json: async () => ({
                        token: 'mock-token-' + Date.now(),
                        user: { id: user.id, username: user.username, email: user.email }
                    })
                };
            } else {
                return {
                    ok: false,
                    json: async () => ({ message: 'Usuario o contraseña incorrectos' })
                };
            }
        }

        if (url.includes('/verify') || url.includes('/api/verify')) {
            const token = options.headers?.Authorization?.replace('Bearer ', '');
            if (token && token.startsWith('mock-token-')) {
                return {
                    ok: true,
                    json: async () => ({ user: { id: 1, username: 'demo', email: 'demo@test.com' } })
                };
            }
            return { ok: false, json: async () => ({ message: 'Token inválido' }) };
        }

        return originalFetch(url, options);
    };
}

// ================================
// AUTHENTICATION SERVICE
// ================================
class AuthService {
    constructor() {
        this.token = localStorage.getItem(globalThis.APP_CONFIG?.AUTH.TOKEN_KEY || 'authToken');
        this.currentUser = JSON.parse(localStorage.getItem(globalThis.APP_CONFIG?.AUTH.USER_KEY || 'currentUser') || 'null');
    }

    isLoggedIn() {
        return this.token !== null && this.currentUser !== null;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    async register(userData) {
        try {
            const API_URL = globalThis.APP_CONFIG
                ? globalThis.APP_CONFIG.getFullApiUrl(globalThis.APP_CONFIG.ENDPOINTS.AUTH_REGISTER)
                : `${globalThis.location.origin}/api/auth/register`;

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: userData.name,
                    email: userData.email,
                    password: userData.password,
                    country: userData.country
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error en el registro');
            }

            this.token = data.token;
            this.currentUser = data.user;

            localStorage.setItem(globalThis.APP_CONFIG?.AUTH.TOKEN_KEY || 'authToken', this.token);
            localStorage.setItem(globalThis.APP_CONFIG?.AUTH.USER_KEY || 'currentUser', JSON.stringify(this.currentUser));

            this.dispatchAuthEvent(true);

            return { success: true, user: this.currentUser };

        } catch (error) {
            console.error('Error en registro:', error);
            return { success: false, error: error.message };
        }
    }

    async login(identifier, password) {
        try {
            const API_URL = globalThis.APP_CONFIG
                ? globalThis.APP_CONFIG.getFullApiUrl(globalThis.APP_CONFIG.ENDPOINTS.AUTH_LOGIN)
                : `${globalThis.location.origin}/api/auth/login`;

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error en el inicio de sesión');
            }

            this.token = data.token;
            this.currentUser = data.user;

            localStorage.setItem(globalThis.APP_CONFIG?.AUTH.TOKEN_KEY || 'authToken', this.token);
            localStorage.setItem(globalThis.APP_CONFIG?.AUTH.USER_KEY || 'currentUser', JSON.stringify(this.currentUser));

            this.dispatchAuthEvent(true);

            return { success: true, user: this.currentUser };

        } catch (error) {
            console.error('Error en login:', error);
            return { success: false, error: error.message };
        }
    }

    async loginWithGoogle(credential) {
        try {
            const API_URL = `${globalThis.location.origin}/api/auth/google`;

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: credential })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error en Google Login');
            }

            this.token = data.token;
            this.currentUser = data.user;

            localStorage.setItem(globalThis.APP_CONFIG?.AUTH.TOKEN_KEY || 'authToken', this.token);
            localStorage.setItem(globalThis.APP_CONFIG?.AUTH.USER_KEY || 'currentUser', JSON.stringify(this.currentUser));

            this.dispatchAuthEvent(true);

            return { success: true, user: this.currentUser };

        } catch (error) {
            console.error('Error en Google login:', error);
            return { success: false, error: error.message };
        }
    }

    async logout() {
        try {
            if (this.token && !ENABLE_MOCK) {
                const API_URL = globalThis.APP_CONFIG
                    ? globalThis.APP_CONFIG.getFullApiUrl(globalThis.APP_CONFIG.ENDPOINTS.AUTH_LOGOUT)
                    : `${globalThis.location.origin}/api/auth/logout`;

                await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json',
                    }
                });
            }
        } catch (error) {
            console.error('Error en logout:', error);
        } finally {
            this.token = null;
            this.currentUser = null;
            localStorage.removeItem(globalThis.APP_CONFIG?.AUTH.TOKEN_KEY || 'authToken');
            localStorage.removeItem(globalThis.APP_CONFIG?.AUTH.USER_KEY || 'currentUser');
            
            // Clear LabPanda state
            localStorage.removeItem('lab_story_history_panda');
            localStorage.removeItem('last_story_panda_date');
            localStorage.removeItem('last_dna_date');
            localStorage.removeItem('last_exam_panda_date');

            this.dispatchAuthEvent(false);
        }
    }

    async verifyToken() {
        if (!this.token) return false;

        try {
            const API_URL = globalThis.APP_CONFIG
                ? globalThis.APP_CONFIG.getFullApiUrl(globalThis.APP_CONFIG.ENDPOINTS.AUTH_VERIFY)
                : `${globalThis.location.origin}/api/auth/verify`;

            const response = await fetch(API_URL, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                await this.logout();
                return false;
            }

            const data = await response.json();
            this.currentUser = data.user;
            localStorage.setItem(globalThis.APP_CONFIG?.AUTH.USER_KEY || 'currentUser', JSON.stringify(this.currentUser));

            return true;
        } catch (error) {
            console.error('Error verificando token:', error);
            await this.logout();
            return false;
        }
    }

    dispatchAuthEvent(isLoggedIn) {
        const event = new CustomEvent('authStateChanged', {
            detail: { isLoggedIn: isLoggedIn, user: this.currentUser }
        });
        globalThis.dispatchEvent(event);
    }

    getAuthHeaders() {
        if (!this.token) return { 'Content-Type': 'application/json' };
        // If token already has 'Bearer ', don't duplicate it. 
        // Our server expects 'Bearer <token>'
        const cleanToken = this.token.startsWith('Bearer ') ? this.token.substring(7) : this.token;
        return {
            'Authorization': `Bearer ${cleanToken}`,
            'Content-Type': 'application/json',
        };
    }
}

globalThis.AuthService = new AuthService();

// ================================
// VALIDATION FUNCTIONS
// ================================
function validateEmail(email) {
    const pattern = globalThis.APP_CONFIG?.VALIDATION.EMAIL.PATTERN || /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
}

function validateUsername(username) {
    if (!username) return false;
    const config = globalThis.APP_CONFIG?.VALIDATION.USERNAME;
    if (!config) return username.length >= 3 && username.length <= 20;

    return username.length >= config.MIN_LENGTH &&
        username.length <= config.MAX_LENGTH &&
        config.PATTERN.test(username);
}

function validatePassword(password) {
    if (!password) return false;
    const config = globalThis.APP_CONFIG?.VALIDATION.PASSWORD;
    if (!config) return password.length >= 6;

    return password.length >= config.MIN_LENGTH &&
        password.length <= config.MAX_LENGTH;
}

// ================================
// MESSAGE DISPLAY
// ================================
function showSuccessMessage(message, duration = 3000) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `<i class="fas fa-check-circle"></i>${message}`;
    successDiv.style.cssText = `
        position: fixed; top: 20px; right: 20px; background-color: #10b981;
        color: white; padding: 15px 25px; border-radius: 10px; z-index: 10000;
        font-weight: 500; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
        animation: slideInRight 0.3s ease-out; font-family: 'Inter', sans-serif;
        display: flex; align-items: center; gap: 10px;
    `;

    if (!document.getElementById('message-styles')) {
        const style = document.createElement('style');
        style.id = 'message-styles';
        style.textContent = `
            @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(successDiv);
    setTimeout(() => {
        successDiv.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => successDiv.remove(), 300);
    }, duration);
}

function showErrorMessage(message, duration = 5000) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message-toast';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i>${message}`;
    errorDiv.style.cssText = `
        position: fixed; top: 20px; right: 20px; background-color: #ef4444;
        color: white; padding: 15px 25px; border-radius: 10px; z-index: 10000;
        font-weight: 500; box-shadow: 0 10px 25px rgba(239, 68, 68, 0.3);
        animation: slideInRight 0.3s ease-out; font-family: 'Inter', sans-serif;
        display: flex; align-items: center; gap: 10px;
    `;

    document.body.appendChild(errorDiv);
    setTimeout(() => {
        errorDiv.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => errorDiv.remove(), 300);
    }, duration);
}

// ================================
// FORM HANDLERS
// ================================
document.addEventListener('DOMContentLoaded', () => {
    // REGISTER FORM
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('username')?.value.trim();
            const email = document.getElementById('email')?.value.trim();
            const password = document.getElementById('password')?.value;
            const confirmPassword = document.getElementById('confirmPassword')?.value;
            const errorDiv = document.getElementById('errorMessage');

            if (errorDiv) {
                errorDiv.style.display = 'none';
                errorDiv.textContent = '';
            }

            try {
                if (!validateUsername(username)) {
                    throw new Error(window.I18N_MESSAGES?.register_error || 'El nombre de usuario debe tener entre 3 y 20 caracteres');
                }
                if (!validateEmail(email)) {
                    throw new Error(window.I18N_MESSAGES?.register_error || 'Email inválido');
                }
                if (!validatePassword(password)) {
                    throw new Error(window.I18N_MESSAGES?.register_error || 'La contraseña debe tener al menos 6 caracteres');
                }
                if (password !== confirmPassword) {
                    throw new Error(window.I18N_MESSAGES?.passwords_mismatch || 'Las contraseñas no coinciden');
                }

                const country = document.getElementById('country')?.value;

                if (!country) {
                    throw new Error(window.I18N_MESSAGES?.register_error || 'Por favor selecciona tu país');
                }

                const submitBtn = registerForm.querySelector('button[type="submit"]');
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ...';

                const result = await globalThis.AuthService.register({ name: username, email, password, country });

                if (result.success) {
                    showSuccessMessage(window.I18N_MESSAGES?.register_success || '¡Registro exitoso! Bienvenido/a');
                    const noticeBar = document.getElementById('noticeBar');
                    if (noticeBar) noticeBar.style.display = 'none';
                    setTimeout(() => globalThis.location.href = '/', 1500);
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                if (errorDiv) {
                    errorDiv.textContent = error.message;
                    errorDiv.style.display = 'block';
                }
                showErrorMessage(error.message);
            } finally {
                const submitBtn = registerForm.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Registrarse';
                }
            }
        });
    }

    // LOGIN FORM
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('username')?.value.trim();
            const password = document.getElementById('password')?.value;
            const errorDiv = document.getElementById('errorMessage');

            if (errorDiv) {
                errorDiv.style.display = 'none';
                errorDiv.textContent = '';
            }

            try {
                if (!username) throw new Error(window.I18N_MESSAGES?.login_error || 'Por favor ingresa tu usuario o email');
                if (!password) throw new Error(window.I18N_MESSAGES?.login_error || 'Por favor ingresa tu contraseña');

                const submitBtn = loginForm.querySelector('button[type="submit"]');
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ...';

                const result = await globalThis.AuthService.login(username, password);

                if (result.success) {
                    showSuccessMessage(window.I18N_MESSAGES?.login_success || '¡Login exitoso! Bienvenido/a de vuelta');
                    const noticeBar = document.getElementById('noticeBar');
                    if (noticeBar) noticeBar.style.display = 'none';
                    setTimeout(() => globalThis.location.href = '/', 1500);
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                if (errorDiv) {
                    errorDiv.textContent = error.message;
                    errorDiv.style.display = 'block';
                }
                showErrorMessage(error.message);
            } finally {
                const submitBtn = loginForm.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Entrar';
                }
            }
        });
    }
    // UPDATE UI BASED ON AUTH STATE
    function updateAuthUI(isLoggedIn, user) {
        const authButton = document.getElementById('authButton');
        const adminTab = document.getElementById('adminTab');

        if (authButton) {
            if (isLoggedIn && user) {
                authButton.innerHTML = `
                    <div class="user-menu">
                        <span class="username"><i class="fas fa-user-circle"></i> ${user.username}</span>
                        <button id="logoutBtn" class="btn-logout" title="Cerrar Sesión">
                            <i class="fas fa-sign-out-alt"></i>
                        </button>
                    </div>
                `;

                // Add logout handler
                document.getElementById('logoutBtn')?.addEventListener('click', () => {
                    globalThis.AuthService.logout();
                });

                // Show admin tab if user is admin (Check role directly or via service)
                const isAdmin = (user.role === 'admin') ||
                    (globalThis.ContributionService && globalThis.ContributionService.isAdmin());

                if (adminTab && isAdmin) {
                    adminTab.style.setProperty('display', 'inline-flex', 'important');
                } else if (adminTab) {
                    adminTab.style.setProperty('display', 'none', 'important');
                }

            } else {
                const loginLabel = (window.I18N_COMMON && window.I18N_COMMON.nav.login) || 'Inicia Sesión';
                const registerLabel = (window.I18N_COMMON && window.I18N_COMMON.nav.register) || 'Registrarme';
                
                authButton.innerHTML = `
                    <div class="auth-buttons-container">
                        <a href="/login/" class="btn-auth-dark">${loginLabel}</a>
                        <a href="/register/" class="btn-auth-dark">${registerLabel}</a>
                    </div>
                `;
                if (adminTab) adminTab.style.setProperty('display', 'none', 'important');
            }
        }
    }

    // Listen for auth changes
    globalThis.addEventListener('authStateChanged', (e) => {
        updateAuthUI(e.detail.isLoggedIn, e.detail.user);
    });

    // Initial check
    const currentUser = globalThis.AuthService.getCurrentUser();
    updateAuthUI(globalThis.AuthService.isLoggedIn(), currentUser);
});

