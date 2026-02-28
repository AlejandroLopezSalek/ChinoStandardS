const mongoose = require('mongoose');

const contributionSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['lesson_edit', 'book_upload']
    },
    title: {
        type: String,
        required: true
    },
    description: String,
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    submittedBy: {
        id: String,
        username: String,
        email: String
    },
    data: {
        type: mongoose.Schema.Types.Mixed, // Flexible for different request types
        default: {}
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    processedAt: Date
});

module.exports = mongoose.model('Contribution', contributionSchema);
