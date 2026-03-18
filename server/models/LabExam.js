const mongoose = require('mongoose');

const LabExamSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['classic', 'custom'], default: 'classic' },
    level: { type: String },
    prompt: { type: String },
    exam_data: { type: Object, required: true },
    answers: { type: Object },
    results: { type: Object },
    panda_advice: { type: String },
    score: { type: Number },
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LabExam', LabExamSchema);
