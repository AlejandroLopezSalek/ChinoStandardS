/**
 * Auth Check Script
 * Handles user session validation and UI updates based on auth state.
 */

document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
});

function checkAuthState() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (token && user) {
        // User is logged in
        updateUIForLoggedInUser(user);
    } else {
        // User is logged out
        updateUIForLoggedOutUser();
    }
}

function updateUIForLoggedInUser(user) {
    // Update Auth Buttons in Header
    const authButtons = document.querySelector('.auth-buttons');
    if (authButtons) {
        authButtons.innerHTML = `
            <a href="/Dashboard/" class="btn-dashboard">
                <i class="fas fa-user-circle"></i> Mi Panel
            </a>
        `;
    }

    // Update Notice Bar (Optional: Hide or change message)
    const notice = document.querySelector('#noticeBar');
    if (notice) {
        notice.style.display = 'none'; // Hide login notice
    }

    // Show Admin Tab if user is admin
    if (user.role === 'admin') {
        const adminTab = document.getElementById('adminTab');
        if (adminTab) {
            adminTab.style.display = 'flex';
        }
    }
}

function updateUIForLoggedOutUser() {
    // Ensure default state
    const authButtons = document.querySelector('.auth-buttons');
    if (authButtons) {
        authButtons.innerHTML = `
            <a href="/login/">Iniciar Sesión</a>
        `;
    }
}

// Global logout function
globalThis.logout = function () {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    globalThis.location.href = '/login/';
};
