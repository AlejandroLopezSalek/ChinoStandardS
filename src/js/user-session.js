// Clase para manejar la sesión del usuario en la interfaz
class UserSession {
    constructor() {
        this.authService = globalThis.AuthService;
        this.init();
    }

    init() {
        // Verificar si el usuario ya está logueado al cargar la página
        this.updateNavigation();
        this.setupEventListeners();
        this.checkAuthStatus();
    }

    // Verificar estado de autenticación
    async checkAuthStatus() {
        if (this.authService && this.authService.isLoggedIn()) {
            // Usuario está logueado, verificar si el token sigue siendo válido
            try {
                const response = await fetch(`${globalThis.location.origin}/api/auth/verify`, {
                    headers: this.authService.getAuthHeaders()
                });

                if (!response.ok) {
                    // Token inválido, hacer logout
                    this.authService.logout();
                    this.updateNavigation();
                }
            } catch (error) {
                console.error('Error verificando token:', error);
            }
        }
    }

    // Actualizar navegación según estado de login
    updateNavigation() {
        if (!this.authService) {
            console.error('AuthService no está disponible');
            return;
        }

        const isLoggedIn = this.authService.isLoggedIn();
        
        // Elementos de navegación
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const userInfo = document.getElementById('userInfo');
        const registerBtn = document.getElementById('registerBtn');

        if (isLoggedIn) {
            const currentUser = this.authService.getCurrentUser();
            
            // Ocultar elementos para usuarios no logueados
            if (loginBtn) loginBtn.style.display = 'none';
            if (registerBtn) registerBtn.style.display = 'none';
            
            // Mostrar elementos para usuarios logueados
            if (logoutBtn) logoutBtn.style.display = 'block';
            if (userInfo) {
                userInfo.style.display = 'block';
                userInfo.textContent = currentUser && currentUser.username 
                    ? `¡Hola, ${currentUser.username}!` 
                    : '¡Hola!';
            }

            // Ocultar formularios de auth si están en la página
            this.hideAuthForms();

        } else {
            // Mostrar elementos para usuarios no logueados
            if (loginBtn) loginBtn.style.display = 'block';
            if (registerBtn) registerBtn.style.display = 'block';
            
            // Ocultar elementos para usuarios logueados
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (userInfo) userInfo.style.display = 'none';
        }
    }

    // Ocultar formularios de autenticación cuando el usuario ya está logueado
    hideAuthForms() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const authContainer = document.querySelector('.auth-container');

        if (loginForm || registerForm) {
            // Si estamos en una página de auth y el usuario ya está logueado
            if (authContainer) {
                authContainer.innerHTML = `
                    <div class="auth-card" style="text-align: center;">
                        <h2>¡Ya estás conectado!</h2>
                        <p>Bienvenido/a de vuelta, ${this.authService.getCurrentUser()?.username || 'usuario'}</p>
                        <div style="margin-top: 20px;">
                            <a href="/" style="
                                display: inline-block;
                                background-color: #007bff;
                                color: white;
                                padding: 10px 20px;
                                text-decoration: none;
                                border-radius: 5px;
                                margin: 5px;
                            ">Ir al inicio</a>
                        </div>
                    </div>
                `;

                // Agregar event listener para logout desde página de auth
                const logoutFromAuth = document.getElementById('logoutFromAuth');
                if (logoutFromAuth) {
                    logoutFromAuth.addEventListener('click', () => {
                        this.logout();
                    });
                }
            }
        }
    }

    // Configurar event listeners
    setupEventListeners() {
        // Botón de logout en la navegación principal
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }

        // Botón de login en la navegación
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                globalThis.location.href = '/login/';
            });
        }

        // Botón de registro en la navegación
        const registerBtn = document.getElementById('registerBtn');
        if (registerBtn) {
            registerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                globalThis.location.href = './auth/register.html';
            });
        }
    }

    // Función de logout
    async logout() {
        if (this.authService) {
            try {
                await this.authService.logout();
                this.updateNavigation();
                
                // Mostrar mensaje de confirmación
                this.showMessage('Sesión cerrada correctamente', 'success');
                
                // Redirigir a la página principal después de un momento
                setTimeout(() => {
                    globalThis.location.href = '/';
                }, 1500);
                
            } catch (error) {
                console.error('Error al cerrar sesión:', error);
                this.showMessage('Error al cerrar sesión', 'error');
            }
        }
    }

    // Mostrar mensajes al usuario
    showMessage(message, type = 'info', duration = 3000) {
        const messageDiv = document.createElement('div');
        messageDiv.textContent = message;
        
        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            info: '#2196F3',
            warning: '#ff9800'
        };

        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: ${colors[type] || colors.info};
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 1000;
            font-family: Arial, sans-serif;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            animation: slideInMessage 0.3s ease-out;
        `;

        // Agregar estilos de animación si no existen
        if (!document.getElementById('message-animation-styles')) {
            const style = document.createElement('style');
            style.id = 'message-animation-styles';
            style.textContent = `
                @keyframes slideInMessage {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(messageDiv);

        // Remover mensaje después del tiempo especificado
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.style.animation = 'slideOutMessage 0.3s ease-in';
                setTimeout(() => messageDiv.remove(), 300);
            }
        }, duration);
    }

    // Verificar si se requiere autenticación para la página actual
    requireAuth() {
        if (!this.authService || !this.authService.isLoggedIn()) {
            this.showMessage('Debes iniciar sesión para acceder a esta página', 'warning');
            setTimeout(() => {
                globalThis.location.href = '/login/';
            }, 2000);
            return false;
        }
        return true;
    }

    // Método para proteger páginas que requieren login
    static protectPage() {
        document.addEventListener('DOMContentLoaded', () => {
            const userSession = new UserSession();
            return userSession.requireAuth();
        });
    }
}

// Inicializar UserSession cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    if (!globalThis.userSession) {
        globalThis.userSession = new UserSession();
    }
});

// Hacer disponible globalmente
globalThis.UserSession = UserSession;