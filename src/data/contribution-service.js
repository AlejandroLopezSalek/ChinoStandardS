// ========================================
// CONTRIBUTION SYSTEM - Lightweight Request Management
// Handles lesson edits and book upload requests
// ========================================

class ContributionService {
    constructor() {
        this.STORAGE_KEY = 'contribution_requests';
        this.ADMIN_KEY = 'isAdmin';
    }

    // ========================================
    // ADMIN MANAGEMENT
    // ========================================

    isAdmin() {
        // Check if current user is admin
        const adminFlag = localStorage.getItem(this.ADMIN_KEY);
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

        // Admin by flag OR by username (you can add admin usernames here)
        const adminUsernames = ['admin', 'administrator', 'LatinCTC'];

        return adminFlag === 'true' || adminUsernames.includes(currentUser.username);
    }

    setAdmin(isAdmin) {
        localStorage.setItem(this.ADMIN_KEY, isAdmin ? 'true' : 'false');
    }

    // ========================================
    // CONTRIBUTION REQUEST MANAGEMENT
    // ========================================

    /**
     * Submit a contribution request (lesson edit or book upload)
     * @param {Object} requestData - The contribution request data
     * @returns {Object} The created request with ID
     */
    submitRequest(requestData) {
        const requests = this.getAllRequests();

        const newRequest = {
            id: this.generateId(),
            type: requestData.type, // 'lesson_edit' or 'book_upload'
            title: requestData.title,
            description: requestData.description,
            submittedBy: this.getCurrentUserInfo(),
            submittedAt: new Date().toISOString(),
            status: 'pending',
            data: requestData.data // Specific data based on type
        };

        requests.push(newRequest);
        this.saveRequests(requests);

        return newRequest;
    }

    /**
     * Submit a lesson edit request
     * @param {Object} lessonEdit - Lesson edit details
     */
    submitLessonEdit(lessonEdit) {
        return this.submitRequest({
            type: 'lesson_edit',
            title: lessonEdit.lessonTitle,
            description: lessonEdit.description,
            data: {
                lessonId: lessonEdit.lessonId,
                level: lessonEdit.level,
                changes: lessonEdit.changes, // Array of change descriptions
                newContent: lessonEdit.newContent, // Optional: new content blocks
                source: lessonEdit.source || 'community' // 'community' or 'nivel-edit'
            }
        });
    }

    /**
     * Submit a book upload request (metadata only, no file)
     * @param {Object} bookData - Book metadata
     */
    submitBookUpload(bookData) {
        return this.submitRequest({
            type: 'book_upload',
            title: bookData.title,
            description: bookData.description,
            data: {
                author: bookData.author,
                level: bookData.level,
                category: bookData.category,
                language: bookData.language,
                fileUrl: bookData.fileUrl, // URL to file (external hosting)
                fileSize: bookData.fileSize,
                format: bookData.format // pdf, epub, etc.
            }
        });
    }

    /**
     * Get all requests (admin only) or user's own requests
     */
    getAllRequests() {
        const requests = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');

        if (this.isAdmin()) {
            return requests;
        }

        // Non-admin: only see own requests
        const currentUser = this.getCurrentUserInfo();
        return requests.filter(req => req.submittedBy.username === currentUser.username);
    }

    /**
     * Get pending requests (admin only)
     */
    getPendingRequests() {
        if (!this.isAdmin()) {
            throw new Error('Unauthorized: Admin access required');
        }

        return this.getAllRequests().filter(req => req.status === 'pending');
    }

    /**
     * Get request by ID
     */
    getRequestById(id) {
        const requests = this.getAllRequests();
        return requests.find(req => req.id === id);
    }

    /**
     * Approve a request and auto-publish
     * @param {string} id - Request ID
     * @param {Object} editedData - Optional: admin-edited data before publishing
     * @returns {Object} Published lesson or book data
     */
    approveRequest(id, editedData = null) {
        if (!this.isAdmin()) {
            throw new Error('Unauthorized: Admin access required');
        }

        const requests = this.getAllRequests();
        const request = requests.find(req => req.id === id);

        if (!request) {
            throw new Error('Request not found');
        }

        let publishedItem = null;

        // Auto-publish based on type and source
        if (request.type === 'lesson_edit') {
            // Use edited data if provided, otherwise use original
            const lessonData = editedData || request.data;

            // Only publish to Community Lessons if it's from the community page
            if (lessonData.source === 'community') {
                publishedItem = this.publishLesson({
                    id: lessonData.lessonId || this.generateId(),
                    title: request.title,
                    level: lessonData.level,
                    description: request.description,
                    content: lessonData.newContent || '',
                    changes: lessonData.changes || [],
                    author: request.submittedBy.username,
                    publishedAt: new Date().toISOString(),
                    status: 'published'
                });
            } else {
                // For nivel edits, we just approve without publishing to community
                // The JSON update would need to be manual or via a different flow
                publishedItem = {
                    id: lessonData.lessonId,
                    title: request.title,
                    level: lessonData.level,
                    note: 'Nivel edit approved - JSON file needs manual update'
                };
            }
        } else if (request.type === 'book_upload') {
            const bookData = editedData || request.data;
            publishedItem = this.publishBook({
                id: this.generateId(),
                title: request.title,
                author: bookData.author,
                level: bookData.level,
                category: bookData.category,
                language: bookData.language,
                fileUrl: bookData.fileUrl,
                fileSize: bookData.fileSize,
                format: bookData.format,
                description: request.description,
                addedBy: request.submittedBy.username,
                addedAt: new Date().toISOString()
            });
        }

        // Log the approval
        this.logAction({
            action: 'approved',
            requestId: id,
            requestType: request.type,
            requestTitle: request.title,
            publishedItemId: publishedItem?.id,
            timestamp: new Date().toISOString()
        });

        // Delete the request
        const updatedRequests = requests.filter(req => req.id !== id);
        this.saveRequests(updatedRequests);

        return publishedItem;
    }

    /**
     * Reject a request and delete it
     * @param {string} id - Request ID
     * @param {string} reason - Rejection reason
     */
    rejectRequest(id, reason = '') {
        if (!this.isAdmin()) {
            throw new Error('Unauthorized: Admin access required');
        }

        const requests = this.getAllRequests();
        const request = requests.find(req => req.id === id);

        if (!request) {
            throw new Error('Request not found');
        }

        // Log the rejection
        this.logAction({
            action: 'rejected',
            requestId: id,
            requestType: request.type,
            requestTitle: request.title,
            reason: reason,
            timestamp: new Date().toISOString()
        });

        // Delete the request
        const updatedRequests = requests.filter(req => req.id !== id);
        this.saveRequests(updatedRequests);

        return true;
    }

    /**
     * Update request data before approval (admin edit)
     * @param {string} id - Request ID
     * @param {Object} updatedData - Updated request data
     */
    updateRequestData(id, updatedData) {
        if (!this.isAdmin()) {
            throw new Error('Unauthorized: Admin access required');
        }

        const requests = this.getAllRequests();
        const requestIndex = requests.findIndex(req => req.id === id);

        if (requestIndex === -1) {
            throw new Error('Request not found');
        }

        // Update the data
        requests[requestIndex].data = {
            ...requests[requestIndex].data,
            ...updatedData
        };

        // Update title and description if provided
        if (updatedData.title) requests[requestIndex].title = updatedData.title;
        if (updatedData.description) requests[requestIndex].description = updatedData.description;

        this.saveRequests(requests);
        return requests[requestIndex];
    }

    // ========================================
    // LESSON & BOOK PUBLISHING
    // ========================================

    /**
     * Publish a lesson (auto-called on approval)
     * @param {Object} lessonData - Lesson data to publish
     */
    publishLesson(lessonData) {
        const lessons = this.getPublishedLessons();

        // Check if updating existing lesson
        const existingIndex = lessons.findIndex(l => l.id === lessonData.id);

        if (existingIndex !== -1) {
            // Update existing lesson
            lessons[existingIndex] = {
                ...lessons[existingIndex],
                ...lessonData,
                updatedAt: new Date().toISOString()
            };
        } else {
            // Add new lesson
            lessons.push(lessonData);
        }

        localStorage.setItem('published_lessons', JSON.stringify(lessons));
        return lessonData;
    }

    /**
     * Publish a book (auto-called on approval)
     * @param {Object} bookData - Book data to publish
     */
    publishBook(bookData) {
        const books = this.getPublishedBooks();
        books.push(bookData);
        localStorage.setItem('published_books', JSON.stringify(books));
        return bookData;
    }

    /**
     * Get all published lessons
     */
    getPublishedLessons() {
        return JSON.parse(localStorage.getItem('published_lessons') || '[]');
    }

    /**
     * Get all published books
     */
    getPublishedBooks() {
        return JSON.parse(localStorage.getItem('published_books') || '[]');
    }

    /**
     * Get lesson by ID
     */
    getLessonById(id) {
        const lessons = this.getPublishedLessons();
        return lessons.find(l => l.id === id);
    }

    /**
     * Delete a published lesson (admin only)
     */
    deleteLesson(id) {
        if (!this.isAdmin()) {
            throw new Error('Unauthorized: Admin access required');
        }

        const lessons = this.getPublishedLessons();
        const updatedLessons = lessons.filter(l => l.id !== id);
        localStorage.setItem('published_lessons', JSON.stringify(updatedLessons));
        return true;
    }

    // ========================================
    // HELPER METHODS
    // ========================================

    saveRequests(requests) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(requests));
    }

    generateId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getCurrentUserInfo() {
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        return {
            username: user.username || 'anonymous',
            email: user.email || '',
            id: user.id || null
        };
    }

    logAction(action) {
        const logs = JSON.parse(localStorage.getItem('contribution_logs') || '[]');
        logs.push(action);

        // Keep only last 100 logs to save space
        if (logs.length > 100) {
            logs.shift();
        }

        localStorage.setItem('contribution_logs', JSON.stringify(logs));
    }

    /**
     * Get statistics for admin dashboard
     */
    getStats() {
        if (!this.isAdmin()) {
            throw new Error('Unauthorized: Admin access required');
        }

        const requests = this.getAllRequests();
        const logs = JSON.parse(localStorage.getItem('contribution_logs') || '[]');

        return {
            total: requests.length,
            pending: requests.filter(r => r.status === 'pending').length,
            lessonEdits: requests.filter(r => r.type === 'lesson_edit').length,
            bookUploads: requests.filter(r => r.type === 'book_upload').length,
            totalProcessed: logs.length,
            approved: logs.filter(l => l.action === 'approved').length,
            rejected: logs.filter(l => l.action === 'rejected').length
        };
    }

    /**
     * Clear all requests (admin only, for testing)
     */
    clearAllRequests() {
        if (!this.isAdmin()) {
            throw new Error('Unauthorized: Admin access required');
        }

        localStorage.removeItem(this.STORAGE_KEY);
        return true;
    }
}

// Make globally available
window.ContributionService = new ContributionService();

console.log('✅ Contribution Service loaded');
