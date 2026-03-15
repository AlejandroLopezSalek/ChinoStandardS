const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Configure web-push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        'mailto:contact@pandalatam.club',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
} else {
    console.warn("VAPID Keys not found. Push notifications will not work.");
}

// GET /api/notifications/public-key
router.get('/public-key', (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// POST /api/notifications/subscribe
router.post('/subscribe', async (req, res) => {
    try {
        const subscription = req.body;


        if (!subscription?.endpoint || typeof subscription.endpoint !== 'string') {
            return res.status(400).json({ error: 'Invalid subscription' });
        }

        // Validate endpoint is a valid URL
        try {
            new URL(subscription.endpoint);
        } catch {
            return res.status(400).json({ error: 'Invalid subscription endpoint URL' });
        }

        // Check if exists - use String() to prevent NoSQL injection
        const exists = await Subscription.findOne({ endpoint: String(subscription.endpoint) });
        if (exists) {
            // Update userId if available
            if (req.body.userId && !exists.userId) {
                exists.userId = String(req.body.userId);
                await exists.save();
            }
            return res.status(200).json({ message: 'Subscription updated' });
        }

        const newSub = new Subscription({
            endpoint: subscription.endpoint,
            keys: subscription.keys,
            // Allow other specific fields if needed, but avoid spread ...subscription for safety
            userId: req.body.userId || null,
            userAgent: req.get('User-Agent')
        });

        await newSub.save();
        res.status(201).json({ message: 'Subscribed successfully' });

    } catch (error) {
        console.error('Subscription Error:', error);
        res.status(500).json({ error: 'Failed to subscribe' });
    }
});

// POST /api/notifications/send (Admin only - protect this!)
router.post('/send', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Simple protection: Check for a secret header or just assume admin for now (MVP)
        // In production, use auth middleware!
        const { title, body, url } = req.body;

        const payload = JSON.stringify({ title, body, url });

        const subscriptions = await Subscription.find();

        const promises = subscriptions.map(sub => {
            return webpush.sendNotification({
                endpoint: sub.endpoint,
                keys: sub.keys
            }, payload).catch(err => {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    // Subscription is gone, delete it
                    return Subscription.deleteOne({ _id: sub._id });
                }
                console.error('Push Error:', err.message);
            });
        });

        await Promise.all(promises);

        res.status(200).json({ message: 'Notifications sent successfully' });
    } catch (error) {
        console.error('Notification Error:', error);
        res.status(500).json({ error: 'Failed to send notifications' });
    }
});

module.exports = router;
