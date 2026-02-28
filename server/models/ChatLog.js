const mongoose = require('mongoose');

const ChatLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Can be anonymous
    },
    username: {
        type: String,
        default: 'Guest'
    },
    userMessage: {
        type: String,
        required: true
    },
    aiResponse: {
        type: String,
        required: true
    },
    context: {
        type: mongoose.Schema.Types.Mixed, // Can be object or string
        default: {}
    },
    lessonContext: {
        type: String,
        default: ''
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    metadata: {
        ip: String,
        userAgent: String
    }
});

module.exports = mongoose.model('ChatLog', ChatLogSchema);
