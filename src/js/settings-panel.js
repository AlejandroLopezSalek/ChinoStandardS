// ========================================
// SETTINGS PANEL - Overlay and Controls
// ========================================

// Helper function to handle TurkBot enable
function enableTurkBot() {
    localStorage.setItem('turkbot_disabled', 'false');
    if (globalThis.initTurkBot) {
        globalThis.initTurkBot();
    } else {
        // If script loaded but function not globally avail yet, reload might be needed
        location.reload();
    }

    // Show nice notification
    if (globalThis.ToastSystem) {
        globalThis.ToastSystem.success('¡TurkBot activado! Estoy aquí para ayudarte.', 'Asistente Integrado');
    }
}

// Helper function to handle TurkBot disable
function disableTurkBot() {
    localStorage.setItem('turkbot_disabled', 'true');

    // Clear chat history to prevent old messages from reappearing when re-enabled
    sessionStorage.removeItem('capi_chat_history');
    sessionStorage.removeItem('capi_chat_open');

    if (globalThis.removeMascotUI) {
        globalThis.removeMascotUI();
    } else {
        // Fallback to manual removal if function missing
        const btn = document.getElementById('turkbot-btn');
        const chat = document.getElementById('turkbot-chat');
        if (btn) btn.remove();
        if (chat) chat.remove();
    }

    if (globalThis.ToastSystem) {
        globalThis.ToastSystem.info('TurkBot desactivado. Puedes reactivarlo aquí cuando quieras.', 'Asistente Pausado');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const settingsOverlay = document.getElementById('settingsOverlay');
    const resetSettingsBtn = document.getElementById('resetSettingsBtn');
    const notificationsToggle = document.getElementById('notificationsToggle');
    const languageSelect = document.querySelector('.setting-select');

    // --- Open/Close Logic ---
    // Handled by general.js (AppUtils.Settings)

    // --- Notifications Logic ---
    // Handled by general.js (AppUtils.Notifications)

    // --- TurkBot Logic ---
    const turkbotToggle = document.getElementById('turkbotToggle');
    if (turkbotToggle) {
        // Load saved state (default enabled)
        const isDisabled = localStorage.getItem('turkbot_disabled') === 'true';
        turkbotToggle.checked = !isDisabled;

        turkbotToggle.addEventListener('change', () => {
            if (turkbotToggle.checked) {
                enableTurkBot();
            } else {
                disableTurkBot();
            }
        });
    }

    // --- Language Logic ---
    if (languageSelect) {
        // Load saved language
        const savedLang = localStorage.getItem('language');
        if (savedLang) {
            languageSelect.value = savedLang;
        }

        // Save on change
        languageSelect.addEventListener('change', () => {
            const lang = languageSelect.value;
            localStorage.setItem('language', lang);
            console.log(`🌐 Language set to: ${lang}`);
            // Here you would trigger a translation function or reload
            // location.reload(); // Optional: reload to apply language
        });
    }

    // --- Reset Logic (Tailwind Modal) ---
    if (resetSettingsBtn) {
        // Create custom confirm modal with Tailwind classes
        const confirmOverlay = document.createElement('div');
        confirmOverlay.className = 'fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm opacity-0 pointer-events-none transition-opacity duration-300';
        confirmOverlay.id = 'confirmResetOverlay';

        confirmOverlay.innerHTML = `
            <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 transform scale-95 transition-transform duration-300 border border-slate-200 dark:border-slate-700">
                <h3 class="text-xl font-bold text-slate-800 dark:text-white mb-2">Restaurar Valores</h3>
                <p class="text-slate-600 dark:text-slate-300 mb-6 text-sm">¿Estás seguro de que quieres restaurar todos los ajustes a sus valores predeterminados?</p>
                <div class="flex gap-3 justify-end">
                    <button class="btn-confirm-cancel px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-medium">Cancelar</button>
                    <button class="btn-confirm-ok px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 transition-all transform hover:-translate-y-0.5 font-bold">Restaurar</button>
                </div>
            </div>
        `;
        document.body.appendChild(confirmOverlay);

        const cancelBtn = confirmOverlay.querySelector('.btn-confirm-cancel');
        const okBtn = confirmOverlay.querySelector('.btn-confirm-ok');
        const modalContent = confirmOverlay.querySelector('div');

        function openModal() {
            confirmOverlay.classList.remove('opacity-0', 'pointer-events-none');
            modalContent.classList.remove('scale-95');
            modalContent.classList.add('scale-100');
        }

        function closeModal() {
            confirmOverlay.classList.add('opacity-0', 'pointer-events-none');
            modalContent.classList.remove('scale-100');
            modalContent.classList.add('scale-95');
        }

        resetSettingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal();
        });

        // Cancel button
        cancelBtn.addEventListener('click', closeModal);

        // Click outside to close
        confirmOverlay.addEventListener('click', (e) => {
            if (e.target === confirmOverlay) {
                closeModal();
            }
        });

        // OK button - perform reset
        okBtn.addEventListener('click', () => {
            // Clear settings from localStorage
            localStorage.removeItem('darkMode');
            localStorage.removeItem('notifications');
            localStorage.removeItem('language');

            // Reset UI
            document.documentElement.classList.remove('dark-mode');
            if (document.getElementById('darkModeToggle')) {
                document.getElementById('darkModeToggle').checked = false;
            }
            if (notificationsToggle) notificationsToggle.checked = true;
            if (languageSelect) languageSelect.value = 'es';

            // Close both modals
            if (settingsOverlay) settingsOverlay.classList.remove('active');
            closeModal();

            console.log('🔄 Settings reset to default');

            // Optional: Show a success toast if available
            if (globalThis.showToast) {
                globalThis.showToast('Ajustes restaurados correctamente', 'success');
            } else if (globalThis.toastSuccess) {
                globalThis.toastSuccess('Ajustes restaurados correctamente');
            }
        });
    }

    console.log('⚙️ Settings Panel loaded');
});
