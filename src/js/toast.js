// ================================
// ADVANCED TOAST NOTIFICATION SYSTEM
// ================================

class ToastSystem {
    constructor() {
        this.toasts = [];
        this.maxToasts = 5;
        this.init();
    }

    init() {
        this.injectStyles();
        this.createContainer();
    }

    injectStyles() {
        if (document.getElementById('toast-styles')) return;

        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            .toast-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 12px;
                pointer-events: none;
            }

                .toast {
                    background: rgba(255, 255, 255, 0.85);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border-radius: 16px;
                    padding: 16px 20px;
                    min-width: 320px;
                    max-width: 420px;
                    box-shadow: 
                        0 4px 6px -1px rgba(0, 0, 0, 0.1),
                        0 2px 4px -1px rgba(0, 0, 0, 0.06),
                        0 0 0 1px rgba(255, 255, 255, 0.5) inset;
                    display: flex;
                    align-items: flex-start;
                    gap: 15px;
                    pointer-events: all;
                    animation: toastSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    position: relative;
                    overflow: hidden;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }
    
                body.dark-mode .toast {
                    background: rgba(30, 41, 59, 0.85);
                    border-color: rgba(255, 255, 255, 0.1);
                    box-shadow: 
                        0 10px 40px rgba(0, 0, 0, 0.4),
                        0 0 0 1px rgba(255, 255, 255, 0.05) inset;
                }
    
                .toast.closing {
                    animation: toastSlideOut 0.3s ease-in forwards;
                }
    
                @keyframes toastSlideIn {
                    from {
                        transform: translateX(120%) scale(0.95);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0) scale(1);
                        opacity: 1;
                    }
                }
    
                @keyframes toastSlideOut {
                    to {
                        transform: translateX(120%) scale(0.95);
                        opacity: 0;
                    }
                }
    
                .toast-icon {
                    flex-shrink: 0;
                    width: 32px;
                    height: 32px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
    
                .toast.success .toast-icon {
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                }
    
                .toast.error .toast-icon {
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    color: white;
                }
    
                .toast.warning .toast-icon {
                    background: linear-gradient(135deg, #f59e0b, #d97706);
                    color: white;
                }
    
                .toast.info .toast-icon {
                    background: linear-gradient(135deg, #3b82f6, #2563eb);
                    color: white;
                }

            .toast-content {
                flex: 1;
            }

            .toast-title {
                font-weight: 600;
                margin-bottom: 4px;
                color: #1e293b;
                font-size: 14px;
            }

            body.dark-mode .toast-title {
                color: #f1f5f9;
            }

            .toast-message {
                font-size: 13px;
                color: #64748b;
                line-height: 1.5;
            }

            body.dark-mode .toast-message {
                color: #cbd5e1;
            }

            .toast-close {
                flex-shrink: 0;
                background: none;
                border: none;
                color: #94a3b8;
                cursor: pointer;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.2s;
            }

            .toast-close:hover {
                background: #f1f5f9;
                color: #64748b;
            }

            body.dark-mode .toast-close:hover {
                background: #334155;
                color: #cbd5e1;
            }

            .toast-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: rgba(0, 0, 0, 0.1);
                transition: width linear;
            }

            body.dark-mode .toast-progress {
                background: rgba(255, 255, 255, 0.1);
            }

            .toast.success .toast-progress {
                background: #10b981;
            }

            .toast.error .toast-progress {
                background: #ef4444;
            }

            .toast.warning .toast-progress {
                background: #f59e0b;
            }

            .toast.info .toast-progress {
                background: #3b82f6;
            }

            @media (max-width: 640px) {
                .toast-container {
                    right: 10px;
                    left: 10px;
                    top: 10px;
                }

                .toast {
                    min-width: unset;
                    max-width: unset;
                }
            }
        `;
        document.head.appendChild(style);
    }

    createContainer() {
        if (document.getElementById('toastContainer')) return;

        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    show(options) {
        const {
            type = 'info',
            title = '',
            message = '',
            duration = 4000,
            closable = true
        } = options;

        // Remove oldest toast if limit reached
        if (this.toasts.length >= this.maxToasts) {
            this.remove(this.toasts[0]);
        }

        const toast = this.createToast(type, title, message, duration, closable);
        const container = document.getElementById('toastContainer');
        container.appendChild(toast);

        this.toasts.push(toast);

        // Auto remove
        if (duration > 0) {
            toast.timeout = setTimeout(() => {
                this.remove(toast);
            }, duration);
        }

        return toast;
    }

    createToast(type, title, message, duration, closable) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: 'fa-check',
            error: 'fa-times',
            warning: 'fa-exclamation',
            info: 'fa-info'
        };

        const titles = {
            success: title || '¡Éxito!',
            error: title || 'Error',
            warning: title || 'Advertencia',
            info: title || 'Información'
        };

        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${icons[type]}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${titles[type]}</div>
                <div class="toast-message">${message}</div>
            </div>
            ${closable ? `
                <button class="toast-close">
                    <i class="fas fa-times"></i>
                </button>
            ` : ''}
        `;

        // Add progress bar
        if (duration > 0) {
            const progress = document.createElement('div');
            progress.className = 'toast-progress';
            progress.style.width = '100%';
            progress.style.transition = `width ${duration}ms linear`;
            toast.appendChild(progress);

            // Animate progress
            setTimeout(() => {
                progress.style.width = '0%';
            }, 10);
        }

        // Close button handler
        if (closable) {
            const closeBtn = toast.querySelector('.toast-close');
            closeBtn.addEventListener('click', () => {
                this.remove(toast);
            });
        }

        return toast;
    }

    remove(toast) {
        if (!toast || !toast.parentElement) return;

        clearTimeout(toast.timeout);

        toast.classList.add('closing');

        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
            this.toasts = this.toasts.filter(t => t !== toast);
        }, 300);
    }

    // Helper methods
    success(message, title, duration) {
        return this.show({ type: 'success', title, message, duration });
    }

    error(message, title, duration) {
        return this.show({ type: 'error', title, message, duration });
    }

    warning(message, title, duration) {
        return this.show({ type: 'warning', title, message, duration });
    }

    info(message, title, duration) {
        return this.show({ type: 'info', title, message, duration });
    }

    // Clear all toasts
    clearAll() {
        this.toasts.forEach(toast => this.remove(toast));
    }
}

// Initialize toast system
globalThis.ToastSystem = new ToastSystem();

// Global shortcuts
globalThis.toast = (message, type = 'info', duration) => {
    return globalThis.ToastSystem.show({ type, message, duration });
};


globalThis.toastSuccess = (message, title, duration) => globalThis.ToastSystem.success(message, title, duration);
globalThis.toastError = (message, title, duration) => globalThis.ToastSystem.error(message, title, duration);
globalThis.toastWarning = (message, title, duration) => globalThis.ToastSystem.warning(message, title, duration);
globalThis.toastInfo = (message, title, duration) => globalThis.ToastSystem.info(message, title, duration);

