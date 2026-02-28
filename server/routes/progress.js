const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

// POST /api/progress/view
// Updates the user's last viewed lesson
router.post('/view', authenticateToken, async (req, res) => {
    try {
        const { lessonId, title, url } = req.body;

        if (!lessonId || !title || !url) {
            return res.status(400).json({ message: 'Missing lesson data' });
        }

        await User.findByIdAndUpdate(req.user._id, {
            'stats.lastViewedLesson': {
                id: lessonId,
                title: title,
                url: url,
                timestamp: new Date()
            },
            'stats.lastActivity': new Date()
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating progress:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
