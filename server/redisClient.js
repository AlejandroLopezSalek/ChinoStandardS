const { createClient } = require('redis');

// Create a Redis client. By default, it connects to localhost:6379
const client = createClient({
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
});

// In development, Redis may not be running locally — suppress repeated error spam
let redisErrorLogged = false;
client.on('error', (err) => {
    if (!redisErrorLogged && process.env.NODE_ENV === 'production') {
        console.warn('[Redis] Connection error:', err.code || err.message);
        redisErrorLogged = true;
    }
});
client.on('connect', () => console.log('✅ Connected to Redis successfully.'));

// Self-invoking function to connect the client
(async () => {
    try {
        await client.connect();
    } catch (e) {
        console.warn('⚠️ Could not connect to Redis. Caching will gracefully fail or revert to MongoDB:', e.message);
    }
})();

module.exports = client;
