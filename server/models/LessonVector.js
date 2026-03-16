const mongoose = require('mongoose');

const lessonVectorSchema = new mongoose.Schema({
    lessonId: {
        type: String,
        required: true,
        index: true
    },
    chunkIndex: {
        type: Number,
        required: true
    },
    text: {
        type: String,
        required: true
    },
    vector: {
        type: [Number],
        required: true,
        validate: {
            validator: function (v) {
                // Xenova/all-MiniLM-L6-v2 outputs 384 dimensions
                return v?.length === 384;
            },
            message: 'Vector must be a 384-dimensional array'
        }
    },
    metadata: {
        title: String,
        author: String,
        level: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Since we are using standard arrays, we don't have native atlas vector search indexing here.
// The indexing is basic, and we will perform pure math cosine similarity in code.

module.exports = mongoose.model('LessonVector', lessonVectorSchema);
