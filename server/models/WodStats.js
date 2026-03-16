const mongoose = require('mongoose');

const WodStatsSchema = new mongoose.Schema({
    date: {
        type: String,
        required: true,
        index: true  // "YYYY-MM-DD"
    },
    character: {
        type: String,
        required: true
    },
    username: {
        type: String,
        default: 'guest'
    },
    country: {
        type: String,
        default: 'unknown'
    },
    isCorrect: {
        type: Boolean,
        required: true
    },
    answeredAt: {
        type: Date,
        default: Date.now
    }
}, { collection: 'wod_stats' });

module.exports = mongoose.models.WodStats || mongoose.model('WodStats', WodStatsSchema);
