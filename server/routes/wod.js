const express = require('express');
const router = express.Router();
const WodStats = require('../models/WodStats');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper to get user info from JWT token (optional auth)
const getUserInfoFromRequest = async (req) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader?.split(' ')[1];
        if (!token) return null;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return await User.findById(String(decoded.userId)).select('username country');
    } catch {
        return null;
    }
};

// POST /api/wod/attempt — Save a WoD attempt (correct or incorrect)
router.post('/attempt', async (req, res) => {
    try {
        const { date, character, isCorrect } = req.body;

        if (!date || !character || typeof isCorrect !== 'boolean') {
            return res.status(400).json({ error: 'Missing required fields: date, character, isCorrect' });
        }

        // Get user info if logged in, otherwise use guest defaults
        const user = await getUserInfoFromRequest(req);
        const username = user?.username || req.body.username || 'guest';
        const country = user?.country || req.body.country || 'unknown';

        await WodStats.create({
            date,
            character,
            username,
            country,
            isCorrect,
            answeredAt: new Date()
        });

        res.status(201).json({ status: 'saved' });
    } catch (err) {
        console.error('[wod/attempt] Error:', err.message);
        res.status(500).json({ error: 'Could not save attempt' });
    }
});

// GET /api/wod/stats — Get aggregated stats (admin use / future dashboard)
// Returns: per-day summary of total attempts, correct, incorrect, by country
router.get('/stats', async (req, res) => {
    try {
        const { date } = req.query;

        const matchStage = date ? { $match: { date } } : { $match: {} };

        const stats = await WodStats.aggregate([
            matchStage,
            {
                $group: {
                    _id: { date: '$date', character: '$character' },
                    total: { $sum: 1 },
                    correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
                    incorrect: { $sum: { $cond: ['$isCorrect', 0, 1] } },
                    countries: { $addToSet: '$country' }
                }
            },
            { $sort: { '_id.date': -1 } },
            { $limit: 30 }
        ]);

        // Also get country breakdown
        const countryBreakdown = await WodStats.aggregate([
            matchStage,
            {
                $group: {
                    _id: '$country',
                    total: { $sum: 1 },
                    correct: { $sum: { $cond: ['$isCorrect', 1, 0] } }
                }
            },
            { $sort: { total: -1 } }
        ]);

        res.json({ stats, countryBreakdown });
    } catch (err) {
        console.error('[wod/stats] Error:', err.message);
        res.status(500).json({ error: 'Could not fetch stats' });
    }
});

module.exports = router;
