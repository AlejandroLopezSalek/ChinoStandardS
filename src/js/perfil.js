// perfil.js - COMPLETE WORKING VERSION
// Full profile management with all features

document.addEventListener('DOMContentLoaded', function () {
    console.log('🔧 Profile page initializing...');

    // Check authentication
    if (!globalThis.AuthService?.isLoggedIn()) {
        console.warn('⚠️ User not logged in. Redirecting to login...');
        globalThis.location.href = '/login/';
        return;
    }

    initProfile();
});

async function initProfile() {
    console.log('✅ Initializing profile...');
    await loadUserProfile();
    await loadStreakData();
    setupEventListeners();
    setupAvatarUpload();
    console.log('✅ Profile initialized successfully');
}

// ================================
// AVATAR UPLOAD SETUP
// ================================
function setupAvatarUpload() {
    let fileInput = document.getElementById('avatarInput');
    if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'avatarInput';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
    }

    const avatarContainer = document.querySelector('.avatar-container');
    const changeAvatarBtn = document.querySelector('.change-avatar-btn');

    if (avatarContainer) {
        avatarContainer.addEventListener('click', function () {
            fileInput.click();
        });
    }

    if (changeAvatarBtn) {
        changeAvatarBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            fileInput.click();
        });
    }

    fileInput.addEventListener('change', handleAvatarUpload);

    console.log('✅ Avatar upload initialized');
}

async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        globalThis.toastError('Por favor selecciona una imagen válida');
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        globalThis.toastError('La imagen debe ser menor a 5MB');
        return;
    }

    try {
        const avatarContainer = document.querySelector('.avatar-container i');
        const originalClass = avatarContainer.className;
        avatarContainer.className = 'fas fa-spinner fa-spin';

        const reader = new FileReader();
        reader.onload = async function (e) {
            const base64Image = e.target.result;

            const response = await fetch(`${globalThis.APP_CONFIG.API_BASE_URL}/auth/profile`, {
                method: 'PUT',
                headers: globalThis.AuthService.getAuthHeaders(),
                body: JSON.stringify({
                    profile: {
                        avatar: base64Image
                    }
                })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                updateAvatarDisplay(base64Image);
                globalThis.toastSuccess('Foto de perfil actualizada');
            } else {
                throw new Error('Error al guardar la imagen');
            }

            avatarContainer.className = originalClass;
        };

        reader.onerror = function () {
            avatarContainer.className = originalClass;
            throw new Error('Error al leer la imagen');
        };

        reader.readAsDataURL(file);

    } catch (error) {
        console.error('Error uploading avatar:', error);
        globalThis.toastError('Error al subir la imagen');
    }
}

function updateAvatarDisplay(base64Image) {
    const avatarContainer = document.querySelector('.avatar-container');
    if (avatarContainer) {
        avatarContainer.innerHTML = `
            <img src="${base64Image}" alt="Avatar" style="
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 50%;
            ">
            <button class="change-avatar-btn" title="Cambiar foto">
                <i class="fas fa-camera"></i>
            </button>
        `;

        const changeBtn = avatarContainer.querySelector('.change-avatar-btn');
        if (changeBtn) {
            changeBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                document.getElementById('avatarInput').click();
            });
        }
    }
}

// ================================
// LOAD USER PROFILE
// ================================
// LOAD USER PROFILE
// ================================
async function loadUserProfile() {
    // 1. Verify Authentication
    const currentUser = globalThis.AuthService ? globalThis.AuthService.getCurrentUser() : null;

    if (!currentUser) {
        console.warn('⚠️ No user found in AuthService');
        // If we are on the profile page and no user, likely auth issue.
        // But check if we are just waiting for auth init.
        // For now, let's assume if this runs, we should have a user.
        return;
    }

    try {
        console.log('📥 Loading user data for:', currentUser.username);

        // Basic Info
        const userNameEl = document.getElementById('userName');
        if (userNameEl) userNameEl.textContent = currentUser.username || 'Usuario';

        const userEmailEl = document.getElementById('userEmail');
        if (userEmailEl) userEmailEl.textContent = currentUser.email || '';

        const userLevelEl = document.getElementById('userLevel');
        if (userLevelEl) userLevelEl.textContent = currentUser.profile?.level || 'A1';

        // Admin Panel Visibility
        const adminPanel = document.getElementById('adminPanel');
        if (adminPanel) {
            if (currentUser.role === 'admin') {
                adminPanel.classList.remove('hidden');
                console.log('🛡️ Admin panel enabled');
            } else {
                adminPanel.classList.add('hidden');
            }
        }

        // Load Avatar
        if (currentUser.profile?.avatar) {
            updateAvatarDisplay(currentUser.profile.avatar);
        }



        // Load Preferences
        if (currentUser.preferences) {
            const setChecked = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.checked = val;
            };
            const setValue = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.value = val;
            };

            // IMPORTANT: Check actual dark mode state from DOM, not just stored preference
            // This prevents dark mode from being disabled when opening profile
            const actualDarkMode = document.documentElement.classList.contains('dark-mode');
            setChecked('darkModePref', actualDarkMode);

            setChecked('notificationsPref', currentUser.preferences.notifications !== false);
            setChecked('soundPref', currentUser.preferences.sound !== false);
            setValue('languagePref', currentUser.preferences.language || 'es');
            setValue('fontSizePref', currentUser.preferences.fontSize || 'medium');
            setValue('dailyGoalPref', currentUser.preferences.dailyGoal || 30);

            // Don't apply preferences automatically - let the AppUtils.DarkMode handle it
            // This prevents the dark mode from being overwritten
            // applyPreferences(currentUser.preferences);
        }

        console.log('✅ User profile loaded successfully');
    } catch (error) {
        console.error('❌ Error loading profile:', error);
        globalThis.toastError('Error al cargar el perfil');
    }
}

// ================================
// LOAD STREAK DATA
// ================================
async function loadStreakData() {
    try {
        console.log('📊 Loading streak data...');


        // Mock data removed as requested


        const updateResponse = await fetch(`${globalThis.APP_CONFIG.API_BASE_URL}/auth/update-streak`, {
            method: 'POST',
            headers: globalThis.AuthService.getAuthHeaders()
        });

        let streakData;
        if (updateResponse.ok) {
            const data = await updateResponse.json();
            streakData = data.streak;
        } else {
            const getResponse = await fetch(`${globalThis.APP_CONFIG.API_BASE_URL}/auth/streak`, {
                headers: globalThis.AuthService.getAuthHeaders()
            });

            if (getResponse.ok) {
                const data = await getResponse.json();
                streakData = data.streak;
            } else {
                streakData = {
                    current: 0,
                    longest: 0,
                    totalDays: 0,
                    lastActivity: null
                };
            }
        }

        displayStreak(streakData);
        console.log('✅ Streak data loaded:', streakData);
    } catch (error) {
        console.error('❌ Error loading streak:', error);
        displayStreak({
            current: 0,
            longest: 0,
            totalDays: 0,
            lastActivity: null
        });
    }
}

function displayStreak(streakData) {
    const currentStreakEl = document.getElementById('currentStreak');
    if (currentStreakEl) {
        currentStreakEl.textContent = streakData.current || 0;
    }

    const longestStreakEl = document.getElementById('longestStreak');
    if (longestStreakEl) {
        longestStreakEl.textContent = streakData.longest || 0;
    }

    const totalDaysEl = document.getElementById('totalDays');
    if (totalDaysEl) {
        totalDaysEl.textContent = streakData.totalDays || 0;
    }

    const lastActivityEl = document.getElementById('lastActivity');
    if (lastActivityEl && streakData.lastActivity) {
        const lastDate = new Date(streakData.lastActivity);
        const today = new Date();
        const diffTime = today - lastDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            lastActivityEl.textContent = 'Hoy';
        } else if (diffDays === 1) {
            lastActivityEl.textContent = 'Ayer';
        } else {
            lastActivityEl.textContent = `Hace ${diffDays} días`;
        }
    } else if (lastActivityEl) {
        lastActivityEl.textContent = 'Hoy';
    }

    const messageEl = document.getElementById('streakMessage');
    if (messageEl) {
        const current = streakData.current || 0;
        const longest = streakData.longest || 0;

        let message = '';
        let icon = '🔥';

        if (current === 0) {
            message = '¡Empieza tu racha hoy! Cada día cuenta.';
            icon = '✨';
        } else if (current === 1) {
            message = '¡Comenzaste una nueva racha! Sigue así mañana.';
            icon = '🎉';
        } else if (current >= 7 && current < 30) {
            message = `¡Una semana completa! Llevas ${current} días seguidos.`;
            icon = '⭐';
        } else if (current >= 30 && current < 100) {
            message = `¡UN MES! ${current} días consecutivos. ¡Eres imparable!`;
            icon = '🏆';
        } else if (current >= 100) {
            message = `¡INCREÍBLE! ${current} días. Eres una leyenda del aprendizaje!`;
            icon = '💎';
        } else {
            message = `¡Vas muy bien! ${current} días seguidos.`;
            if (longest > current) {
                message += ` Tu récord es ${longest} días.`;
            }
        }

        messageEl.innerHTML = `${icon} ${message}`;
    }
}

// ================================
// EVENT LISTENERS
// ================================
function setupEventListeners() {
    console.log('🔗 Setting up event listeners...');

    // Preferences - Modified to check if elements exist
    const savePrefBtn = document.getElementById('savePreferencesBtn');
    if (savePrefBtn) {
        savePrefBtn.addEventListener('click', handlePreferencesSave);
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
        console.log('✅ Logout button connected');
    }

    // Change password
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', openChangePasswordModal);
        console.log('✅ Change password button connected');
    }

    // Dark mode toggle
    const darkModeToggle = document.getElementById('darkModePref');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', function () {
            if (globalThis.AppUtils && globalThis.AppUtils.DarkMode) {
                if (this.checked) {
                    globalThis.AppUtils.DarkMode.enable();
                } else {
                    globalThis.AppUtils.DarkMode.disable();
                }
            } else {
                // Fallback
                if (this.checked) {
                    document.documentElement.classList.add('dark-mode');
                    localStorage.setItem('darkMode', 'enabled');
                } else {
                    document.documentElement.classList.remove('dark-mode');
                    localStorage.setItem('darkMode', 'disabled');
                }
            }
        });
    }

    // Profile Save
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', handleProfileSave);
    }

    // Bio Char Count
    const bioInput = document.getElementById('bio');
    if (bioInput) {
        bioInput.addEventListener('input', updateCharCount);
    }

    console.log('✅ Event listeners set up');
}

function updateCharCount() {
    const bio = document.getElementById('bio');
    const count = document.getElementById('charCount');
    if (bio && count) {
        count.textContent = bio.value.length;
        if (bio.value.length >= 160) {
            count.classList.add('text-red-500');
        } else {
            count.classList.remove('text-red-500');
        }
    }
}

// handleProfileSave removed as Personal Info section was deleted

// ================================
// SAVE PREFERENCES
// ================================
async function handlePreferencesSave() {
    console.log('⚙️ Saving preferences...');

    const btn = document.getElementById('savePreferencesBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    try {
        const preferencesData = {
            preferences: {
                darkMode: document.getElementById('darkModePref').checked,
                notifications: document.getElementById('notificationsPref').checked,
                sound: document.getElementById('soundPref').checked,
                language: document.getElementById('languagePref').value,
                fontSize: document.getElementById('fontSizePref').value,
                dailyGoal: Number.parseInt(document.getElementById('dailyGoalPref').value)
            }
        };

        const response = await fetch(`${globalThis.APP_CONFIG.API_BASE_URL}/auth/profile`, {
            method: 'PUT',
            headers: globalThis.AuthService.getAuthHeaders(),
            body: JSON.stringify(preferencesData)
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            applyPreferences(preferencesData.preferences);
            globalThis.toastSuccess('Preferencias guardadas correctamente');
            console.log('✅ Preferences saved successfully');
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Error al guardar');
        }
    } catch (error) {
        console.error('❌ Error saving preferences:', error);
        globalThis.toastError(error.message || 'Error al guardar preferencias');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// ================================
// APPLY PREFERENCES
// ================================
function applyPreferences(preferences) {
    console.log('🎨 Applying preferences...', preferences);

    // Dark mode
    if (preferences.darkMode) {
        document.documentElement.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'enabled');
    } else {
        document.documentElement.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'disabled');
    }

    // Font size
    if (preferences.fontSize) {
        const sizes = {
            small: '14px',
            medium: '16px',
            large: '18px'
        };
        document.documentElement.style.fontSize = sizes[preferences.fontSize];
    }

    // Save to localStorage
    localStorage.setItem('notifications', preferences.notifications);
    localStorage.setItem('sound', preferences.sound);
    localStorage.setItem('language', preferences.language);
    localStorage.setItem('dailyGoal', preferences.dailyGoal);

    console.log('✅ Preferences applied');
}

// ================================
// LOGOUT HANDLER
// ================================
async function handleLogout() {
    console.log('🚪 Logout requested');

    // Create and show custom confirmation modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in';
    modal.id = 'logoutConfirmModal';

    modal.innerHTML = `
        <div class="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100 animate-slide-up border border-stone-100 dark:border-stone-700">
            <div class="text-center">
                <div class="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500 dark:text-red-400">
                    <i class="fas fa-sign-out-alt text-2xl"></i>
                </div>
                <h3 class="text-xl font-bold text-stone-800 dark:text-stone-100 mb-2">¿Cerrar Sesión?</h3>
                <p class="text-stone-500 dark:text-stone-400 mb-6">¿Estás seguro de que deseas salir de tu cuenta?</p>
                
                <div class="flex gap-3 justify-center">
                    <button id="cancelLogout" class="px-5 py-2.5 rounded-xl text-stone-600 dark:text-stone-300 font-medium hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors">
                        Cancelar
                    </button>
                    <button id="confirmLogout" class="px-5 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all hover:scale-105">
                        Sí, Cerrar Sesión
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Event Listeners
    const closeBtn = modal.querySelector('#cancelLogout');
    const confirmBtn = modal.querySelector('#confirmLogout');

    // Close logic
    const closeModal = () => {
        modal.classList.add('opacity-0');
        setTimeout(() => modal.remove(), 300);
    };

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Confirm logic
    confirmBtn.addEventListener('click', async () => {
        closeModal();
        await performLogout();
    });
}

async function performLogout() {
    try {
        console.log('🔄 Processing logout...');

        if (globalThis.AuthService && typeof globalThis.AuthService.logout === 'function') {
            await globalThis.AuthService.logout();
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            localStorage.removeItem('isLoggedIn');
            sessionStorage.clear();
        }

        console.log('✅ Logout successful');
        globalThis.toastSuccess('Sesión cerrada correctamente');

        setTimeout(() => {
            globalThis.location.href = '/';
        }, 1000);

    } catch (error) {
        console.error('❌ Error during logout:', error);
        localStorage.clear();
        sessionStorage.clear();
        globalThis.toastWarning('Error al cerrar sesión, pero se cerró de todas formas');

        setTimeout(() => {
            globalThis.location.href = '/';
        }, 1500);
    }
}

// ================================
// CHANGE PASSWORD MODAL
// ================================
function openChangePasswordModal() {
    console.log('🔐 Opening change password modal...');

    // Create modal if it doesn't exist
    let modal = document.getElementById('changePasswordModal');

    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'changePasswordModal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in';

        modal.innerHTML = `
            <div class="bg-white dark:bg-stone-800 rounded-2xl shadow-xl w-full max-w-md p-0 overflow-hidden transform transition-all scale-100 animate-slide-up border border-stone-100 dark:border-stone-700">
                <!-- Header -->
                <div class="px-6 py-4 border-b border-stone-100 dark:border-stone-700 flex justify-between items-center bg-stone-50 dark:bg-stone-700/50">
                    <h3 class="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                        <i class="fas fa-key text-red-500"></i> Cambiar Contraseña
                    </h3>
                    <button class="text-stone-400 hover:text-red-500 transition-colors bg-transparent border-0 cursor-pointer p-1" onclick="closeChangePasswordModal()">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>

                <!-- Body -->
                <div class="p-6">
                    <form id="changePasswordForm" class="flex flex-col gap-4">
                        <div class="space-y-1">
                            <label for="currentPassword" class="text-sm font-medium text-stone-700 dark:text-stone-300 block">
                                <i class="fas fa-lock w-5 text-red-500"></i> Contraseña Actual
                            </label>
                            <input 
                                type="password" 
                                id="currentPassword" 
                                required
                                placeholder="Ingresa tu contraseña actual"
                                class="w-full px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700/50 text-stone-800 dark:text-white focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none"
                            >
                        </div>
                        
                        <div class="space-y-1">
                            <label for="newPassword" class="text-sm font-medium text-stone-700 dark:text-stone-300 block">
                                <i class="fas fa-key w-5 text-red-500"></i> Nueva Contraseña
                            </label>
                            <input 
                                type="password" 
                                id="newPassword" 
                                required
                                minlength="8"
                                placeholder="Mínimo 8 caracteres"
                                class="w-full px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700/50 text-stone-800 dark:text-white focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none"
                            >
                            <p class="text-xs text-stone-500 dark:text-stone-400 pl-1">
                                Mínimo 8 caracteres, incluye mayúsculas, minúsculas y números
                            </p>
                        </div>
                        
                        <div class="space-y-1">
                            <label for="confirmPassword" class="text-sm font-medium text-stone-700 dark:text-stone-300 block">
                                <i class="fas fa-check w-5 text-red-500"></i> Confirmar Nueva Contraseña
                            </label>
                            <input 
                                type="password" 
                                id="confirmPassword" 
                                required
                                placeholder="Confirma tu nueva contraseña"
                                class="w-full px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700/50 text-stone-800 dark:text-white focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none"
                            >
                        </div>
                        
                        <div class="flex gap-3 pt-2 mt-2">
                            <button type="button" class="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-600 text-stone-600 dark:text-stone-300 font-medium hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors" onclick="closeChangePasswordModal()">
                                Cancelar
                            </button>
                            <button type="submit" class="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 shadow-lg shadow-red-500/30 transition-all hover:scale-[1.02]">
                                Cambiar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add form submit handler
        const form = document.getElementById('changePasswordForm');
        form.addEventListener('submit', handleChangePassword);

        // Close on click outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeChangePasswordModal();
        });
    }

    modal.classList.remove('hidden');
    // Animate in
    modal.classList.remove('opacity-0');
    modal.firstElementChild.classList.remove('scale-95', 'opacity-0');
}

globalThis.closeChangePasswordModal = function () {
    const modal = document.getElementById('changePasswordModal');
    if (modal) {
        // Animate out
        modal.classList.add('opacity-0');
        modal.firstElementChild.classList.add('scale-95', 'opacity-0');

        setTimeout(() => {
            modal.classList.add('hidden');
            const form = document.getElementById('changePasswordForm');
            if (form) form.reset();
        }, 300);
    }
};

async function handleChangePassword(e) {
    e.preventDefault();
    console.log('🔐 Changing password...');

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validations
    if (newPassword !== confirmPassword) {
        globalThis.toastError('Las contraseñas no coinciden');
        return;
    }

    if (newPassword.length < 8) {
        globalThis.toastError('La contraseña debe tener al menos 8 caracteres');
        return;
    }

    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
        globalThis.toastError('La contraseña debe incluir mayúsculas, minúsculas y números');
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cambiando...';

    try {
        const response = await fetch(`${globalThis.APP_CONFIG.API_BASE_URL}/auth/change-password`, {
            method: 'POST',
            headers: globalThis.AuthService.getAuthHeaders(),
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });

        if (response.ok) {
            globalThis.toastSuccess('Contraseña cambiada correctamente');
            closeChangePasswordModal();
            console.log('✅ Password changed successfully');
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Error al cambiar la contraseña');
        }
    } catch (error) {
        console.error('❌ Error changing password:', error);
        globalThis.toastError(error.message || 'Error al cambiar la contraseña');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// ================================
// NOTIFICATION SYSTEM
// ================================
function showNotification(message, type = 'info') {
    // Configuración de colores e iconos según el tipo
    const config = {
        success: { icon: 'check-circle', bg: 'bg-orange-500', color: 'text-white' },
        error: { icon: 'exclamation-circle', bg: 'bg-red-500', color: 'text-white' },
        warning: { icon: 'exclamation-triangle', bg: 'bg-amber-500', color: 'text-white' },
        info: { icon: 'info-circle', bg: 'bg-red-500', color: 'text-white' }
    };

    const style = config[type] || config.info;

    // Crear el contenedor de toasts si no existe top right
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-3';
        document.body.appendChild(toastContainer);
    }

    // Crear el elemento toast
    const toast = document.createElement('div');
    toast.className = `flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg transform transition-all duration-300 translate-x-10 opacity-0 ${style.bg} ${style.color} min-w-[300px]`;

    toast.innerHTML = `
        <i class="fas fa-${style.icon} text-xl"></i>
        <p class="font-medium text-sm leading-snug">${message}</p>
    `;

    toastContainer.appendChild(toast);

    // Animación de entrada
    requestAnimationFrame(() => {
        toast.classList.remove('translate-x-10', 'opacity-0');
    });

    // Auto eliminar después de 3 segundos
    setTimeout(() => {
        toast.classList.add('translate-x-10', 'opacity-0');
        setTimeout(() => {
            toast.remove();
            if (toastContainer.children.length === 0) {
                toastContainer.remove();
            }
        }, 300);
    }, 3000);
}

console.log('✅ Profile script loaded successfully');
