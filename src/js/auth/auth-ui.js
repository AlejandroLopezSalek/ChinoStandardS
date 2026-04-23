// Auth UI Logic

document.addEventListener('DOMContentLoaded', () => {
    // Expose i18n messages from the JSON script tag
    const i18nScript = document.getElementById('i18n-messages');
    if (i18nScript) {
        try {
            window.I18N_MESSAGES = JSON.parse(i18nScript.textContent);
        } catch (e) {
            console.error('Error parsing I18N messages:', e);
            window.I18N_MESSAGES = {};
        }
    } else {
        window.I18N_MESSAGES = {};
    }
});

// Helper functions to reduce cognitive complexity
function updatePasswordStrengthUI(strength, strengthBar, strengthLabel) {
    strengthBar.style.width = strength + '%';

    if (strength < 30) {
        strengthBar.className = 'h-full transition-all duration-300 bg-red-500';
        strengthLabel.textContent = window.I18N_MESSAGES?.strength?.weak || 'Débil';
        strengthLabel.className = 'text-red-500 font-bold';
    } else if (strength < 70) {
        strengthBar.className = 'h-full transition-all duration-300 bg-yellow-500';
        strengthLabel.textContent = window.I18N_MESSAGES?.strength?.medium || 'Media';
        strengthLabel.className = 'text-yellow-500 font-bold';
    } else {
        strengthBar.className = 'h-full transition-all duration-300 bg-green-500';
        strengthLabel.textContent = window.I18N_MESSAGES?.strength?.strong || 'Fuerte';
        strengthLabel.className = 'text-green-500 font-bold';
    }
}

function updateLengthRequirement(pass, reqLength) {
    if (!reqLength) return;

    const icon = reqLength.querySelector('i');
    if (pass.length >= 8) {
        if (icon) icon.className = 'fas fa-check-circle text-[8px] mr-1 text-green-500';
        reqLength.classList.add('text-green-600');
    } else {
        if (icon) icon.className = 'fas fa-circle text-[8px] mr-1 text-stone-300';
        reqLength.classList.remove('text-green-600');
    }
}

function updateMatchText(pass, confirm, matchText) {
    if (!matchText) return false;

    if (confirm.length === 0) {
        matchText.classList.add('hidden');
        return pass.length === 0;
    }

    if (pass !== confirm) {
        matchText.textContent = window.I18N_MESSAGES?.match?.mismatch || 'Las contraseñas no coinciden';
        matchText.className = 'text-xs mt-1 font-medium text-red-500';
        matchText.classList.remove('hidden');
        return false;
    }

    matchText.textContent = window.I18N_MESSAGES?.match?.match || '¡Coinciden!';
    matchText.className = 'text-xs mt-1 font-medium text-green-500';
    matchText.classList.remove('hidden');
    return true;
}

function updateSubmitButton(isValid, submitBtn) {
    if (!submitBtn) return;

    if (isValid) {
        submitBtn.disabled = false;
        submitBtn.className = 'w-full py-3 mt-4 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg font-bold shadow-lg transform transition hover:-translate-y-0.5 hover:shadow-red-500/30 active:scale-[0.98] cursor-pointer';
    } else {
        submitBtn.disabled = true;
        submitBtn.className = 'w-full py-3 mt-4 bg-stone-300 dark:bg-stone-700 text-stone-500 cursor-not-allowed rounded-lg font-bold transition';
    }
}

// Expose globally for onclick events
globalThis.togglePassword = function (inputId) {
    console.log('Toggling password for:', inputId);
    const input = document.getElementById(inputId);
    const icon = document.getElementById(inputId + '-icon');
    if (input && icon) {
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    } else {
        console.error('Input or Icon not found:', inputId);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    initStrengthMeter();
});

function initStrengthMeter() {
    const passwordInput = document.getElementById('password');
    const confirmInput = document.getElementById('confirmPassword');
    const strengthBar = document.getElementById('strengthBar');
    const strengthLabel = document.getElementById('strengthLabel');
    const submitBtn = document.getElementById('submitBtn');
    const reqLength = document.getElementById('req-length');
    const matchText = document.getElementById('matchText');

    // Only run if elements exist (Register page)
    if (!passwordInput || !strengthBar) return;

    function updateStrength() {
        const pass = passwordInput.value;
        let strength = 0;

        // Calculate strength
        if (pass.length >= 6) strength += 30;
        if (pass.length >= 8) strength += 20;
        if (/\d/.test(pass)) strength += 25;
        if (/[^A-Za-z0-9]/.test(pass)) strength += 25;

        // Update UI
        updatePasswordStrengthUI(strength, strengthBar, strengthLabel);
        updateLengthRequirement(pass, reqLength);
        validateForm();
    }

    function validateForm() {
        const pass = passwordInput.value;
        const confirm = confirmInput ? confirmInput.value : '';

        // Check password length
        const hasValidLength = pass.length >= 6;

        // Check password match
        let passwordsMatch = true;
        if (confirmInput && confirm.length > 0) {
            passwordsMatch = updateMatchText(pass, confirm, matchText);
        } else if (matchText) {
            matchText.classList.add('hidden');
            if (pass.length > 0 && confirmInput) passwordsMatch = false;
        }

        const isValid = hasValidLength && passwordsMatch;
        updateSubmitButton(isValid, submitBtn);
    }

    passwordInput.addEventListener('input', updateStrength);
    if (confirmInput) confirmInput.addEventListener('input', validateForm);

    // Initial validation check to enable button if fields are pre-filled
    if (passwordInput.value.length > 0) validateForm();
}

// Google Sign-In Callback
globalThis.handleCredentialResponse = async function (response) {
    if (!response?.credential) {
        globalThis.toastError?.('No credential received', 'Error', 4000);
        return;
    }

    // Send JWT to backend
    const result = await globalThis.AuthService.loginWithGoogle(response.credential);

    if (result.success) {
        // Show success message
        globalThis.toastSuccess?.('Login con Google exitoso', 'Bienvenido', 3000);
        
        // ONLY redirect if the profile completion modal is NOT present
        // If it is present, the modal's own logic will handle redirection after saving
        setTimeout(() => {
            if (!document.getElementById('profile-completion-modal')) {
                globalThis.location.href = '/';
            }
        }, 1500);
    } else {
        globalThis.toastError?.(result.error, 'Error', 4000);
    }
};
