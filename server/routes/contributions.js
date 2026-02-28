const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Contribution = require('../models/Contribution');
const Lesson = require('../models/Lesson');
const LessonHistory = require('../models/LessonHistory');

const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET approved book uploads (Public — only exposes approved books for community display)
router.get('/approved-books', async (req, res) => {
    try {
        const books = await Contribution.find(
            { type: 'book_upload', status: 'approved' },
            { title: 1, description: 1, data: 1, submittedBy: 1, processedAt: 1 }
        ).sort({ processedAt: -1 });
        res.json(books);
    } catch (error) {
        console.error('Error fetching approved books:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET all requests (Admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const contributions = await Contribution.find().sort({ submittedAt: -1 });
        res.json(contributions);
    } catch (error) {
        console.error('Error fetching contributions:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET pending requests (Admin only)
router.get('/pending', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const contributions = await Contribution.find({ status: 'pending' }).sort({ submittedAt: -1 });
        res.json(contributions);
    } catch (error) {
        console.error('Error fetching pending contributions:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST new request
// POST new request
router.post('/', authenticateToken, async (req, res) => {
    try {
        const contributionData = req.body;

        // Force submittedBy to be the authenticated user
        contributionData.submittedBy = {
            id: req.user.id || req.user._id,
            username: req.user.username,
            email: req.user.email
        };

        const newContribution = new Contribution(contributionData);
        const savedContribution = await newContribution.save();
        res.status(201).json(savedContribution);
    } catch (error) {
        console.error('Error creating contribution:', error);
        res.status(400).json({ error: 'Invalid data' });
    }
});

// DELETE request (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid ID format' });
        }

        const result = await Contribution.findByIdAndDelete(req.params.id);

        if (!result) {
            return res.status(404).json({ error: 'Contribution not found' });
        }
        res.json({ success: true, message: 'Contribution deleted' });
    } catch (error) {
        console.error('Error deleting contribution:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT update status (Approve/Reject) (Admin only)
router.put('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['approved', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid ID format' });
        }

        const contribution = await Contribution.findByIdAndUpdate(
            req.params.id,
            {
                status: status,
                processedAt: new Date()
            },
            { new: true }
        );

        if (!contribution) {
            return res.status(404).json({ error: 'Contribution not found' });
        }

        // HANDLE APPROVED CONTRIBUTIONS
        if (status === 'approved') {
            // HANDLE LESSON EDITS
            if (contribution.type === 'lesson_edit') {
                const lessonId = contribution.data.lessonId;
                const existingLesson = await Lesson.findOne({ id: lessonId });

                if (existingLesson) {
                    // SAVE OLD VERSION TO HISTORY
                    await new LessonHistory({
                        lessonId: existingLesson.id,
                        version: existingLesson.version || 1,
                        title: existingLesson.title,
                        content: existingLesson.content,
                        description: existingLesson.description,
                        level: existingLesson.level,
                        author: existingLesson.author,
                        editedBy: contribution.submittedBy?.username || 'Unknown',
                        editedAt: existingLesson.editedAt || existingLesson.publishedAt
                    }).save();

                    // UPDATE EXISTING LESSON
                    await Lesson.findOneAndUpdate(
                        { id: lessonId },
                        {
                            title: contribution.data.lessonTitle,
                            content: contribution.data.newContent,
                            description: contribution.data.description,
                            editedAt: new Date(),
                            version: (existingLesson.version || 1) + 1
                        }
                    );
                } else {
                    // CREATE NEW LESSON
                    await new Lesson({
                        id: lessonId || 'lesson-' + Date.now(),
                        title: contribution.data.lessonTitle,
                        level: contribution.data.level,
                        author: contribution.submittedBy?.username || 'Community',
                        description: contribution.data.description,
                        content: contribution.data.newContent,
                        status: 'published',
                        publishedAt: new Date(),
                        source: contribution.data.source || 'community',
                        version: 1
                    }).save();
                }
            }

            // HANDLE BOOK UPLOADS
            if (contribution.type === 'book_upload') {
                // Book uploads are marked as approved
                // The PDF URL is stored in contribution.data.pdfUrl
                // Users can view approved book uploads from the contributions page
                console.log('Book upload approved:', contribution.title);
                console.log('PDF URL:', contribution.data?.pdfUrl);
            }
        }

        res.json({ success: true, contribution });
    } catch (error) {
        console.error('Error updating contribution:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;

