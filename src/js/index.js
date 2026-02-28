// ========================================
// INDEX.JS - Homepage specific functionality
// ========================================

// Check authentication status on page load
document.addEventListener('DOMContentLoaded', function () {
    // Initialize auth system
    if (globalThis.AuthService !== undefined) {
        checkAuthenticationStatus();
    }

    // Check registration status and hide notice if user is registered/logged in
    updateUIBasedOnAuth();
});

// ========================================
// AUTHENTICATION CHECK
// ========================================
function checkAuthenticationStatus() {
    const token = localStorage.getItem('authToken');
    const currentUser = localStorage.getItem('currentUser');

    if (token && currentUser) {
        try {
            const user = JSON.parse(currentUser);
            globalThis.userDataManager?.setCurrentUser(user);
            updateUIBasedOnAuth();
        } catch (error) {
            console.error('Error parsing user data:', error);
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
        }
    }
}

// ========================================
// UI UPDATE BASED ON AUTHENTICATION
// ========================================
function updateUIBasedOnAuth() {
    const notice = document.querySelector('#noticeBar');
    const authButtonContainer = document.getElementById('authButton');
    const token = localStorage.getItem('authToken');
    const currentUserStr = localStorage.getItem('currentUser');

    const isLoggedIn = token && currentUserStr;

    // ADD/REMOVE BODY CLASS
    if (isLoggedIn) {
        document.body.classList.add('user-logged-in');
    } else {
        document.body.classList.remove('user-logged-in');
    }

    if (isLoggedIn) {
        try {
            const currentUser = JSON.parse(currentUserStr);

            // Hide the registration notice
            if (notice) {
                notice.style.display = 'none';
                notice.classList.add('hidden');
            }

            // Update auth buttons - ONLY show welcome message, NO LOGOUT BUTTON
            if (authButtonContainer) {
                authButtonContainer.innerHTML = `
                    <span style="color: #E0E0E0; font-weight: 500;">
                        Bienvenido, ${currentUser.username || currentUser.email}
                    </span>
                `;
            }

            // Enable flashcard generation button
            enableRegisteredUserFeatures();

        } catch (error) {
            console.error('Error parsing user data:', error);
            showLoginState();
        }
    } else {
        showLoginState();
    }
}

// ========================================
// SHOW LOGIN STATE (NOT LOGGED IN)
// ========================================
function showLoginState() {
    const notice = document.querySelector('#noticeBar');
    const authButtonContainer = document.getElementById('authButton');

    // Remove logged-in class
    document.body.classList.remove('user-logged-in');

    // Show registration notice
    if (notice) {
        notice.style.display = 'flex';
        notice.classList.remove('hidden');
    }

    // Show login link
    if (authButtonContainer) {
        authButtonContainer.innerHTML = `
            <a href="/login/" 
               style="color: #ffffff; text-decoration: underline;">
                Inicia Sesión
            </a>
        `;
    }
}

// ========================================
// LOGOUT HANDLER (NOT USED IN INDEX - ONLY IN PERFIL)
// ========================================
function handleLogout() {
    // Clear authentication data
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');

    // Show logout message
    globalThis.AppUtils?.Notification?.success('Sesión cerrada correctamente');

    // Update UI
    setTimeout(() => {
        showLoginState();

        // Reload page to reset state
        location.reload();
    }, 1000);
}

// ========================================
// ENABLE REGISTERED USER FEATURES
// ========================================
function enableRegisteredUserFeatures() {
    // Placeholder for future features
    console.log('✅ Registered user features enabled');
}

// ========================================
// EVENT LISTENERS
// ========================================

// Listen for storage changes (cross-tab synchronization)
globalThis.addEventListener('storage', function (e) {
    if (e.key === 'authToken' || e.key === 'currentUser') {
        updateUIBasedOnAuth();
    }
});

// Listen for authentication events
globalThis.addEventListener('authStateChanged', function (event) {
    if (event.detail?.isLoggedIn) {
        updateUIBasedOnAuth();
    } else {
        showLoginState();
    }
});

// ========================================
// CHECK AUTH ON VISIBILITY CHANGE
// ========================================
document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
        // Page became visible, check auth status
        updateUIBasedOnAuth();
    }
});

// ========================================
// GLOBAL EXPORTS
// ========================================
globalThis.registrationManager = {
    checkStatus: updateUIBasedOnAuth,
    enableFeatures: enableRegisteredUserFeatures,
    showLoginState: showLoginState
};

// Make handleLogout available globally (for Perfil.html)
globalThis.handleLogout = handleLogout;

console.log('📋 Index page initialized successfully!');
console.log('🔒 Authentication system ready!');