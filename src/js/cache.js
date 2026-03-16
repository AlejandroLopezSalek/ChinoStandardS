// ================================
// INTELLIGENT CACHE SYSTEM
// ================================

class CacheSystem {
    constructor() {
        this.cache = new Map();
        this.memoryCache = new Map();
        this.expirationTimes = new Map();
        this.maxMemoryCacheSize = 50; // Max items in memory
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.setupPeriodicCleanup();
        this.setupBeforeUnload();
    }

    // Set cache with expiration
    set(key, value, ttl = 3600000) { // Default 1 hour
        const now = Date.now();
        const expiresAt = now + ttl;

        const cacheItem = {
            value: value,
            timestamp: now,
            expiresAt: expiresAt,
            hits: 0
        };

        // Store in memory
        this.memoryCache.set(key, cacheItem);
        this.expirationTimes.set(key, expiresAt);

        // Manage memory size
        if (this.memoryCache.size > this.maxMemoryCacheSize) {
            this.evictLeastUsed();
        }

        // Store in localStorage for persistence
        try {
            const storageKey = this.getStorageKey(key);
            localStorage.setItem(storageKey, JSON.stringify(cacheItem));
        } catch (error) {
            console.warn('Cache: localStorage full, clearing old items');
            this.clearExpired();
        }

        return true;
    }

    // Get from cache
    get(key) {
        // Check memory first
        let cacheItem = this.memoryCache.get(key);

        // If not in memory, check localStorage
        if (!cacheItem) {
            try {
                const storageKey = this.getStorageKey(key);
                const stored = localStorage.getItem(storageKey);
                if (stored) {
                    cacheItem = JSON.parse(stored);
                    // Restore to memory
                    this.memoryCache.set(key, cacheItem);
                }
            } catch (error) {
                console.error('Cache: Error reading from storage', error);
                return null;
            }
        }

        if (!cacheItem) return null;

        // Check expiration
        if (Date.now() > cacheItem.expiresAt) {
            this.delete(key);
            return null;
        }

        // Update hit count
        cacheItem.hits++;

        return cacheItem.value;
    }

    // Delete from cache
    delete(key) {
        this.memoryCache.delete(key);
        this.expirationTimes.delete(key);

        try {
            const storageKey = this.getStorageKey(key);
            localStorage.removeItem(storageKey);
        } catch (error) {
            console.error('Cache: Error deleting from storage', error);
        }

        return true;
    }

    // Check if key exists and is valid
    has(key) {
        const item = this.get(key);
        return item !== null;
    }

    // Clear all cache
    clear() {
        this.memoryCache.clear();
        this.expirationTimes.clear();

        // Clear from localStorage
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('cache_')) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.error('Cache: Error clearing storage', error);
        }

        return true;
    }

    // Clear expired items
    clearExpired() {
        const now = Date.now();
        const expiredKeys = [];

        this.expirationTimes.forEach((expiresAt, key) => {
            if (now > expiresAt) {
                expiredKeys.push(key);
            }
        });

        expiredKeys.forEach(key => this.delete(key));

        return expiredKeys.length;
    }

    // Evict least recently used item
    evictLeastUsed() {
        let leastUsedKey = null;
        let minHits = Infinity;

        this.memoryCache.forEach((item, key) => {
            if (item.hits < minHits) {
                minHits = item.hits;
                leastUsedKey = key;
            }
        });

        if (leastUsedKey) {
            this.memoryCache.delete(leastUsedKey);
        }
    }

    // Load cache from localStorage
    loadFromStorage() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(storageKey => {
                if (storageKey.startsWith('cache_')) {
                    const key = storageKey.replace('cache_', '');
                    const stored = localStorage.getItem(storageKey);

                    if (stored) {
                        const cacheItem = JSON.parse(stored);

                        // Check if still valid
                        if (Date.now() <= cacheItem.expiresAt) {
                            this.cache.set(key, cacheItem);
                            this.expirationTimes.set(key, cacheItem.expiresAt);
                        } else {
                            localStorage.removeItem(storageKey);
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Cache: Error loading from storage', error);
        }
    }

    // Setup periodic cleanup
    setupPeriodicCleanup() {
        // Clean expired items every 5 minutes
        setInterval(() => {
            const cleared = this.clearExpired();
            if (cleared > 0) {
                console.log(`Cache: Cleared ${cleared} expired items`);
            }
        }, 5 * 60 * 1000);
    }

    // Setup beforeunload handler
    setupBeforeUnload() {
        globalThis.addEventListener('beforeunload', () => {
            // Save cache stats
            this.saveStats();
        });
    }

    // Get cache statistics
    getStats() {
        const now = Date.now();
        let totalSize = 0;
        let expiredCount = 0;
        let validCount = 0;

        this.memoryCache.forEach((item, key) => {
            totalSize += JSON.stringify(item).length;
            if (now > item.expiresAt) {
                expiredCount++;
            } else {
                validCount++;
            }
        });

        return {
            totalItems: this.memoryCache.size,
            validItems: validCount,
            expiredItems: expiredCount,
            estimatedSize: `${(totalSize / 1024).toFixed(2)} KB`,
            memoryUsage: `${this.memoryCache.size}/${this.maxMemoryCacheSize}`
        };
    }

    // Save stats to console
    saveStats() {
        if (globalThis.APP_CONFIG?.isDevelopment()) {
            console.log('Cache Stats:', this.getStats());
        }
    }

    // Get storage key
    getStorageKey(key) {
        return `cache_${key}`;
    }

    // Wrap fetch with cache
    async cachedFetch(url, options = {}, ttl = 3600000) {
        const cacheKey = `fetch_${url}_${JSON.stringify(options)}`;

        // Check cache first
        const cached = this.get(cacheKey);
        if (cached) {
            console.log('Cache hit:', url);
            return Promise.resolve(cached);
        }

        // Fetch from network
        try {
            const response = await fetch(url, options);
            const data = await response.json();

            // Cache the response
            this.set(cacheKey, data, ttl);

            return data;
        } catch (error) {
            console.error('Cached fetch error:', error);
            throw error;
        }
    }

    // Memoize function results
    memoize(fn, keyGenerator, ttl = 3600000) {
        return (...args) => {
            const cacheKey = keyGenerator ? keyGenerator(...args) : `memo_${fn.name}_${JSON.stringify(args)}`;

            const cached = this.get(cacheKey);
            if (cached !== null) {
                return cached;
            }

            const result = fn(...args);
            this.set(cacheKey, result, ttl);

            return result;
        };
    }
}

// ================================
// REQUEST DEDUPLICATION
// ================================

class RequestDeduplicator {
    constructor() {
        this.pendingRequests = new Map();
    }

    // Execute request with deduplication
    async request(key, requestFn) {
        // Check if request is already pending
        if (this.pendingRequests.has(key)) {
            console.log('Deduplicating request:', key);
            return this.pendingRequests.get(key);
        }

        // Execute request
        const promise = requestFn()
            .finally(() => {
                // Remove from pending once complete
                this.pendingRequests.delete(key);
            });

        this.pendingRequests.set(key, promise);
        return promise;
    }

    // Clear all pending requests
    clear() {
        this.pendingRequests.clear();
    }
}

// Initialize systems
globalThis.CacheSystem = new CacheSystem();
globalThis.RequestDeduplicator = new RequestDeduplicator();

// Helper functions
globalThis.cache = {
    set: (key, value, ttl) => globalThis.CacheSystem.set(key, value, ttl),
    get: (key) => globalThis.CacheSystem.get(key),
    delete: (key) => globalThis.CacheSystem.delete(key),
    has: (key) => globalThis.CacheSystem.has(key),
    clear: () => globalThis.CacheSystem.clear(),
    stats: () => globalThis.CacheSystem.getStats(),
    fetch: (url, options, ttl) => globalThis.CacheSystem.cachedFetch(url, options, ttl),
    memoize: (fn, keyGen, ttl) => globalThis.CacheSystem.memoize(fn, keyGen, ttl)
};

globalThis.dedupeRequest = (key, fn) => globalThis.RequestDeduplicator.request(key, fn);

