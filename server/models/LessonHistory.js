const mongoose = require('mongoose');

const lessonHistorySchema = new mongoose.Schema({
    lessonId: {
        type: String,
        required: true,
        index: true
    },
    version: {
        type: Number,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    content: String,
    description: String,
    level: String,
    author: String,
    editedBy: String,
    editedAt: {
        type: Date,
        default: Date.now
    },
    reason: String  // Optional: why this edit was made
});

// Compound index for efficient queries
lessonHistorySchema.index({ lessonId: 1, version: -1 });

module.exports = mongoose.model('LessonHistory', lessonHistorySchema);
