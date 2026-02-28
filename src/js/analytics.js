// ================================
// ANALYTICS & TRACKING SYSTEM
// Privacy-first, lightweight analytics
// ================================

class AnalyticsSystem {
    constructor() {
        // Use crypto.randomUUID() for secure random ID generation (fixes SonarCloud security hotspot)
        this.sessionId = this.sessionId || `${Date.now()}_${crypto.randomUUID().substring(0, 9)}`;
        this.init();
    }

    init() {
        this.trackPageView();
        this.setupErrorTracking();
    }

    // Track page view
    trackPageView() {
        const pageData = {
            type: 'pageview',
            timestamp: Date.now(),
            url: globalThis.location.href,
            path: globalThis.location.pathname,
            title: document.title,
            sessionId: this.sessionId
        };

        this.send(pageData);
    }

    // Track custom event
    track(eventName, properties = {}) {
        const event = {
            type: 'event',
            name: eventName,
            properties: properties,
            timestamp: Date.now(),
            sessionId: this.sessionId
        };

        this.send(event);
    }

    // Setup essential error tracking
    setupErrorTracking() {
        globalThis.addEventListener('error', (e) => {
            this.track('error', {
                message: e.message,
                filename: e.filename,
                line: e.lineno
            });
        });
    }

    // Send data to backend analytics endpoint
    send(data) {
        // Send pageview and event data to backend for traffic analysis
        // Strip any trailing /api from API_BASE_URL to avoid double /api/api paths
        const base = (globalThis.API_BASE_URL || '').replace(/\/api\/?$/, '');
        const apiUrl = `${base}/api/analytics`;

        fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).catch(() => {
            // Silently fail - don't disrupt user experience with errors
            // Analytics should never break the app
        });
    }
}

// Initialize
globalThis.AnalyticsSystem = new AnalyticsSystem();

// Simple global API
globalThis.analytics = {
    track: (name, props) => globalThis.AnalyticsSystem.track(name, props)
};
