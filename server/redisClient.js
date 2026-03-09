const { createClient } = require('redis');

// Create a Redis client. By default, it connects to localhost:6379
const client = createClient({
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
});

client.on('error', (err) => console.log('Redis Client Error:', err));
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
