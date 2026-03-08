// ================================
// PAGEVIEW TRACKING
// Lightweight — only tracks page visits
// ================================

(function () {
    'use strict';

    function trackPageView() {
        const base = (globalThis.API_BASE_URL || '').replace(/\/api\/?$/, '');
        const pageData = {
            type: 'pageview',
            path: globalThis.location.pathname,
            title: document.title,
            timestamp: new Date().toISOString()
        };

        fetch(`${base}/api/analytics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pageData)
        }).catch(() => {
            // Silently fail — never break the app
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', trackPageView);
    } else {
        trackPageView();
    }

    // Keep minimal global API for backward compatibility
    globalThis.analytics = {
        track: () => { } // no-op, WoD stats use /api/wod/attempt directly
    };
})();

