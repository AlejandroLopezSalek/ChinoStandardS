// ================================
// CONSEJOS PAGE - Toggle System compatible con 11ty
// ================================

(function () {
    'use strict';

    const CONFIG = {
        STORAGE_KEY: 'consejosProgress',
        ROTATION_KEY: 'consejosRotationDate',
        ENABLE_DAILY_ROTATION: true,
    };

    // -------------------------
    // Utilities
    // -------------------------
    // -------------------------
    // Utilities
    // -------------------------
    function getTodayDateString() {
        return new Date().toDateString();
    }

    // Parse time string "HH:MM - HH:MM" to minutes for sorting
    function parseStartTime(timeStr) {
        if (!timeStr) return 9999;
        const start = timeStr.split('-')[0].trim(); // "7:30"
        const [hours, minutes] = start.split(':').map(Number);
        return hours * 60 + minutes;
    }

    function sortChronologically(items) {
        return items.sort((a, b) => {
            const timeA = parseStartTime(a.querySelector('.time-slot')?.textContent);
            const timeB = parseStartTime(b.querySelector('.time-slot')?.textContent);
            return timeA - timeB;
        });
    }

    function applyDailyRotation() {
        const containers = document.querySelectorAll('.activities');
        if (!containers.length) return;

        containers.forEach(container => {
            const items = Array.from(container.querySelectorAll('.activity-item'));
            if (!items.length) return;

            // Remove random shuffle, use chronological sort instead
            const sorted = sortChronologically(items);

            // Re-append in order
            items.forEach(i => i.remove());
            sorted.forEach(i => container.appendChild(i));
        });

        console.log('✅ Schedule sorted chronologically');
    }

    // -------------------------
    // Toggle Buttons
    // -------------------------
    function addToggleButtonsToItem(item) {
        const iconContainer = item.querySelector('.activity-icon');
        if (!iconContainer) return;

        // Save original icon class if not already saved
        if (!iconContainer.dataset.originalIcon) {
            const icon = iconContainer.querySelector('i');
            if (icon) {
                iconContainer.dataset.originalIcon = icon.className;
            }
        }

        const title = item.querySelector('h4')?.textContent?.trim() || 'activity';
        const timeSlot = item.querySelector('.time-slot')?.textContent?.trim() || '';
        const activityId = `${timeSlot}-${title}`.replaceAll(/\s+/g, '-').toLowerCase();

        // Set ID on the item itself for easier access
        item.dataset.activityId = activityId;
        item.style.cursor = 'pointer';

        // Initialize state
        const savedProgress = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY) || '{}');
        const isCompleted = savedProgress[activityId]?.completed || false;
        updateItemState(item, isCompleted);

        // Unified Interaction: Click anywhere on the card
        item.onclick = (e) => {
            // Check if click was on a toggle link to avoid multiple triggers
            if (e.target.closest('a')?.href) {
                return; // Let links handle themselves
            }
            e.preventDefault();
            handleToggle(item);
        };

        // Ensure child elements don't block the click
        const iconBtn = item.querySelector('.activity-icon');
        if (iconBtn) {
            iconBtn.style.pointerEvents = 'none'; // Click passes through to the card
        }
    }

    function updateItemState(item, isCompleted) {
        const button = item.querySelector('.activity-icon');
        const icon = button?.querySelector('i');
        const originalIconClass = button?.dataset.originalIcon;

        // Base classes that change on toggle
        // We toggle generic borders/bg classes off when completed, and specific orange ones on.
        const baseClasses = ['bg-white', 'dark:bg-stone-700', 'border-stone-200', 'dark:border-stone-600', 'hover:border-orange-300', 'hover:shadow-md'];
        const completedClasses = ['bg-orange-50', 'dark:bg-orange-900/20', 'border-orange-500', 'dark:border-orange-500', 'shadow-md', 'shadow-orange-500/20'];

        if (isCompleted) {
            // Mark as completed
            item.classList.add('completed');
            item.classList.remove(...baseClasses);
            item.classList.add(...completedClasses);

            if (button) {
                button.classList.add('completed');
                // Tailwind for button completion
                button.classList.remove('bg-orange-600', 'text-white');
                button.classList.add('bg-orange-500', 'text-white', 'scale-110');
            }
            if (icon) icon.className = 'fas fa-check';
        } else {
            // Remove completion
            item.classList.remove('completed', ...completedClasses);
            item.classList.add(...baseClasses);

            if (button) {
                button.classList.remove('completed', 'bg-orange-500', 'scale-110');
                button.classList.add('bg-orange-600', 'text-white');
            }
            if (icon && originalIconClass) icon.className = originalIconClass;
        }
    }

    function handleToggle(item) {
        const activityId = item.dataset.activityId;
        const savedProgress = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY) || '{}');
        const isCompleted = !savedProgress[activityId]?.completed;

        savedProgress[activityId] = {
            completed: isCompleted,
            timestamp: new Date().toISOString()
        };

        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(savedProgress));
        updateItemState(item, isCompleted);
        updateProgressStats();
    }

    function updateProgressStats() {
        const totalItems = document.querySelectorAll('.activity-item').length;
        if (totalItems === 0) return;

        const savedProgress = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY) || '{}');
        const completedCount = Object.values(savedProgress).filter(i => i.completed).length;

        console.log(`Progress: ${completedCount}/${totalItems}`);
        // Here you could update a UI element if one existed
    }


    // -------------------------
    // Main Init con polling
    // -------------------------
    // -------------------------
    // Main Init con polling
    // -------------------------
    function initWithPolling() {
        const interval = setInterval(() => {
            const items = document.querySelectorAll('.activity-item');
            if (items.length > 0) {
                clearInterval(interval);

                // Always apply rotation based on date seed
                // This ensures the order is consistent for the day, but different from the static HTML
                if (CONFIG.ENABLE_DAILY_ROTATION) {
                    applyDailyRotation();
                    // Update rotation date in storage just for tracking/potential future features
                    const today = getTodayDateString();
                    localStorage.setItem(CONFIG.ROTATION_KEY, today);
                }

                items.forEach(item => addToggleButtonsToItem(item));
                updateProgressStats();

                console.log('✅ Consejos page initialized with polling');
            }
        }, 100);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWithPolling);
    } else {
        initWithPolling();
    }

})();
