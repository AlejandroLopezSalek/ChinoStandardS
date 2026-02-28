const mongoose = require('mongoose');

const DailyWordSchema = new mongoose.Schema({
    date: {
        type: String,
        required: true,
        unique: true, // "YYYY-MM-DD"
        index: true
    },
    data: {
        type: Object,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60 * 60 * 24 * 7 // Cleanup after 7 days
    }
}, { collection: 'daily_words' });

module.exports = mongoose.models.DailyWord || mongoose.model('DailyWord', DailyWordSchema);
