const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    endpoint: {
        type: String,
        required: true,
        unique: true
    },
    keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true }
    },
    userAgent: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Subscription', SubscriptionSchema);
