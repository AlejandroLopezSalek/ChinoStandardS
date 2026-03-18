// ================================
// ANIMATIONS & SCROLL SYSTEM
// ================================

class AnimationSystem {
    constructor() {
        this.observers = [];
        this.init();
    }

    init() {
        this.injectStyles();
        this.setupSmoothScroll();
        this.setupScrollToTop();
        this.setupIntersectionObserver();
        this.setupParallax();
    }

    injectStyles() {
        if (document.getElementById('animation-styles')) return;

        const style = document.createElement('style');
        style.id = 'animation-styles';
        style.textContent = `
            /* Smooth scroll */
            /* Smooth scroll removed globally to prevent lag, applied only on anchors via JS */
            /* html { scroll-behavior: smooth; } */

            body.reduced-motion * {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }

            /* Fade in animations */
            .fade-in {
                opacity: 0;
                transform: translateY(30px);
                transition: opacity 0.6s ease, transform 0.6s ease;
            }

            .fade-in.visible {
                opacity: 1;
                transform: translateY(0);
            }

            .fade-in-left {
                opacity: 0;
                transform: translateX(-30px);
                transition: opacity 0.6s ease, transform 0.6s ease;
            }

            .fade-in-left.visible {
                opacity: 1;
                transform: translateX(0);
            }

            .fade-in-right {
                opacity: 0;
                transform: translateX(30px);
                transition: opacity 0.6s ease, transform 0.6s ease;
            }

            .fade-in-right.visible {
                opacity: 1;
                transform: translateX(0);
            }

            /* Scale animations */
            .scale-in {
                opacity: 0;
                transform: scale(0.9);
                transition: opacity 0.5s ease, transform 0.5s ease;
            }

            .scale-in.visible {
                opacity: 1;
                transform: scale(1);
            }

            /* Stagger animation delays */
            .stagger-1 { transition-delay: 0.1s; }
            .stagger-2 { transition-delay: 0.2s; }
            .stagger-3 { transition-delay: 0.3s; }
            .stagger-4 { transition-delay: 0.4s; }
            .stagger-5 { transition-delay: 0.5s; }

            /* Scroll to top button */
            .scroll-to-top {
                position: fixed;
                bottom: 30px;
                right: 30px;
                width: 50px;
                height: 50px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 1.2rem;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                opacity: 0;
                visibility: hidden;
                transform: scale(0.8);
                transition: all 0.3s ease;
                z-index: 1000;
            }

            .scroll-to-top.visible {
                opacity: 1;
                visibility: visible;
                transform: scale(1);
            }

            .scroll-to-top:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
            }

            body.dark-mode .scroll-to-top {
                background: linear-gradient(135deg, #818cf8 0%, #a78bfa 100%);
                box-shadow: 0 4px 15px rgba(129, 140, 248, 0.3);
            }

            body.dark-mode .scroll-to-top:hover {
                box-shadow: 0 6px 20px rgba(129, 140, 248, 0.4);
            }

            /* Parallax elements */
            .parallax {
                transition: transform 0.1s ease-out;
            }

            /* Hover effects */
            .hover-lift {
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }

            .hover-lift:hover {
                transform: translateY(-5px);
            }

            /* Loading shimmer */
            @keyframes shimmer {
                0% {
                    background-position: -1000px 0;
                }
                100% {
                    background-position: 1000px 0;
                }
            }

            .shimmer {
                animation: shimmer 2s infinite;
                background: linear-gradient(
                    to right,
                    #f6f7f8 0%,
                    #edeef1 20%,
                    #f6f7f8 40%,
                    #f6f7f8 100%
                );
                background-size: 1000px 100%;
            }

            body.dark-mode .shimmer {
                background: linear-gradient(
                    to right,
                    #1e293b 0%,
                    #334155 20%,
                    #1e293b 40%,
                    #1e293b 100%
                );
            }

            /* Pulse animation */
            @keyframes pulse {
                0%, 100% {
                    opacity: 1;
                }
                50% {
                    opacity: 0.5;
                }
            }

            .pulse {
                animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            }

            /* Bounce animation */
            @keyframes bounce {
                0%, 100% {
                    transform: translateY(0);
                }
                50% {
                    transform: translateY(-10px);
                }
            }

            .bounce {
                animation: bounce 1s infinite;
            }

            @media (max-width: 768px) {
                .scroll-to-top {
                    bottom: 20px;
                    right: 20px;
                    width: 45px;
                    height: 45px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Setup smooth scroll for anchor links
    setupSmoothScroll() {
        document.addEventListener('click', (e) => {
            const anchor = e.target.closest('a[href^="#"]');
            if (!anchor) return;

            const targetId = anchor.getAttribute('href');
            if (targetId === '#') return;

            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    }

    // Setup scroll to top button
    setupScrollToTop() {
        let button = document.getElementById('scrollToTop');

        if (!button) {
            button = document.createElement('button');
            button.id = 'scrollToTop';
            button.className = 'scroll-to-top';
            button.innerHTML = '<i class="fas fa-arrow-up"></i>';
            button.setAttribute('aria-label', 'Scroll to top');
            document.body.appendChild(button);

            button.addEventListener('click', () => {
                globalThis.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
        }

        // Show/hide on scroll
        let scrollTimeout;
        globalThis.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);

            scrollTimeout = setTimeout(() => {
                if (globalThis.scrollY > 300) {
                    button.classList.add('visible');
                } else {
                    button.classList.remove('visible');
                }
            }, 100);
        }, { passive: true });
    }

    // Setup intersection observer for fade-in animations
    setupIntersectionObserver() {
        const options = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');

                    // Optionally unobserve after animation
                    if (entry.target.dataset.once === 'true') {
                        observer.unobserve(entry.target);
                    }
                } else if (entry.target.dataset.repeat === 'true') {
                    entry.target.classList.remove('visible');
                }
            });
        }, options);

        // Observe all fade elements
        const animateElements = document.querySelectorAll(
            '.fade-in, .fade-in-left, .fade-in-right, .scale-in'
        );

        animateElements.forEach(el => observer.observe(el));

        this.observers.push(observer);

        // Watch for new elements
        this.watchForNewElements(observer);
    }

    // Watch for dynamically added elements
    watchForNewElements(observer) {
        const mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        // Check if the node itself should be observed
                        if (node.matches('.fade-in, .fade-in-left, .fade-in-right, .scale-in')) {
                            observer.observe(node);
                        }

                        // Check children
                        const children = node.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .scale-in');
                        children.forEach(child => observer.observe(child));
                    }
                });
            });
        });

        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        this.observers.push(mutationObserver);
    }

    // Setup parallax effect
    setupParallax() {
        const parallaxElements = document.querySelectorAll('.parallax');

        if (parallaxElements.length === 0) return;

        let ticking = false;

        globalThis.addEventListener('scroll', () => {
            if (!ticking) {
                globalThis.requestAnimationFrame(() => {
                    // Disable on mobile for performance
                    if (globalThis.innerWidth < 768) return;

                    parallaxElements.forEach(el => {
                        const speed = el.dataset.speed || 0.5;
                        const yPos = -(globalThis.scrollY * speed);
                        el.style.transform = `translateY(${yPos}px)`;
                    });
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    // Add entrance animation to element
    animateIn(element, animationType = 'fade-in', delay = 0) {
        element.classList.add(animationType);

        if (delay > 0) {
            element.style.transitionDelay = `${delay}s`;
        }

        // Trigger animation
        setTimeout(() => {
            element.classList.add('visible');
        }, 10);
    }

    // Add stagger animation to group
    staggerIn(elements, animationType = 'fade-in', delayBetween = 0.1) {
        elements.forEach((el, index) => {
            this.animateIn(el, animationType, index * delayBetween);
        });
    }

    // Remove all animations
    removeAnimation(element) {
        element.classList.remove('fade-in', 'fade-in-left', 'fade-in-right', 'scale-in', 'visible');
        element.style.transitionDelay = '';
    }

    // Cleanup observers
    destroy() {
        this.observers.forEach(observer => {
            if (observer.disconnect) {
                observer.disconnect();
            }
        });
        this.observers = [];
    }
}

// Initialize animation system
globalThis.AnimationSystem = new AnimationSystem();

// Helper functions
globalThis.animateIn = (element, type, delay) => globalThis.AnimationSystem.animateIn(element, type, delay);
globalThis.staggerIn = (elements, type, delay) => globalThis.AnimationSystem.staggerIn(elements, type, delay);

console.log('✅ Animation system initialized');
