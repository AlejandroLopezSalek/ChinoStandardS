const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Define flexible schema for Analytics events
const AnalyticsSchema = new mongoose.Schema({
    type: String,
    timestamp: { type: Date, default: Date.now },
    sessionId: String,
    url: String,
    // Allow any other properties
}, { strict: false, collection: 'analytics' });

// Create model (or use existing)
const Analytics = mongoose.models.Analytics || mongoose.model('Analytics', AnalyticsSchema);

// POST /api/analytics
router.post('/', async (req, res) => {
    try {
        const eventData = req.body;

        const sanitizedData = {};
        for (const key of Object.keys(eventData)) {
            if (!key.startsWith('$')) {
                sanitizedData[key] = eventData[key];
            }
        }

        // Add server-side timestamp
        const record = {
            ...sanitizedData,
            serverTimestamp: new Date()
        };

        // Save to MongoDB asynchronously (fire and forget to not slow down client)
        await Analytics.create(record).catch(err => console.error('Error saving analytics:', err.message));

        // Respond immediately
        res.status(200).json({ status: 'received' });
    } catch (error) {
        console.error('Analytics Endpoint Error:', error);
        // Still return 200 to not break client
        res.status(200).json({ status: 'error', message: 'partial failure' });
    }
});

module.exports = router;
