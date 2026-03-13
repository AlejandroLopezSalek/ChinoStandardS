const mongoose = require('mongoose');

const DailyWordSchema = new mongoose.Schema({
    date: {
        type: String,
        required: true,
        unique: true, // "YYYY-MM-DD"
        index: true
    },
    translations: {
        type: Map,
        of: Object, // { character, pinyin, word_translation, ... }
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60 * 60 * 24 * 30 // Cleanup after 30 days
    }
}, { collection: 'daily_words' });

module.exports = mongoose.models.DailyWord || mongoose.model('DailyWord', DailyWordSchema);
