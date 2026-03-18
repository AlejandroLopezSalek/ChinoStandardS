/**
 * Dark Mode Script
 * Handles theme toggling and persistence using localStorage.
 */

document.addEventListener('DOMContentLoaded', () => {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const html = document.documentElement;

    // Check saved preference
    const savedTheme = localStorage.getItem('darkMode');
    const prefersDark = globalThis.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'enabled' || (!savedTheme && prefersDark)) {
        html.classList.add('dark-mode');
        if (darkModeToggle) darkModeToggle.checked = true;
    }

    // Toggle Event Listener
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', () => {
            if (darkModeToggle.checked) {
                html.classList.add('dark-mode');
                localStorage.setItem('darkMode', 'enabled');
            } else {
                html.classList.remove('dark-mode');
                localStorage.setItem('darkMode', 'disabled');
            }
        });
    }
});
