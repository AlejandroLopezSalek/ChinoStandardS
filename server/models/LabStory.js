const mongoose = require('mongoose');

const LabStorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    storyId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    title: {
        type: String,
        default: 'Historia en Chino'
    },
    genre: String,
    charName: String,
    level: String,
    lang: {
        type: String,
        default: 'zh'
    },
    history: [
        {
            role: { type: String, enum: ['user', 'assistant'] },
            content_data: Object,
            timestamp: { type: Date, default: Date.now }
        }
    ],
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('LabStory', LabStorySchema);
