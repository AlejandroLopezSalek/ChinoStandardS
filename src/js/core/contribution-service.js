// ========================================
// CONTRIBUTION SERVICE - API Handler
// ========================================

(function () {
    if (globalThis.ContributionService) {
        console.warn('ContributionService already initialized');
        return;
    }

    class ContributionService {
        API_URL = '/api/contributions';
        LESSONS_API_URL = '/api/lessons';
        AUTH_API_URL = '/api/auth';


        // ========================================
        // PUBLIC METHODS (Async)
        // ========================================

        async getPublishedLessons() {
            try {
                // First try to get from API (new system)
                const response = await fetch(this.LESSONS_API_URL);
                if (response.ok) {
                    return await response.json();
                }
                // Fallback to localStorage if API fails (or while migrating)
                console.warn('API failed, falling back to local storage for lessons');
                const localLessons = JSON.parse(localStorage.getItem('chino_lessons') || '[]');
                return localLessons.filter(l => l.status === 'published');
            } catch (error) {
                console.error('Error fetching lessons:', error);
                return [];
            }
        }

        async getLessonById(id) { // ID can be string or _id
            try {
                const response = await fetch(`${this.LESSONS_API_URL}/${id}`);
                if (response.ok) return await response.json();
            } catch (e) { console.error(e); }

            // Fallback
            const lessons = JSON.parse(localStorage.getItem('turkamerica_lessons') || '[]');
            return lessons.find(l => l.id === id);
        }

        async getAllRequests() {
            try {
                const response = await fetch(this.API_URL);
                if (!response.ok) throw new Error('Failed to fetch requests');
                return await response.json();
            } catch (e) {
                console.error('Error getting requests', e);
                return [];
            }
        }

        async getPendingRequests() {
            // Validate token before making request
            if (!this.isTokenValid()) {
                this.handleAuthError('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
                throw new Error('Token expired or invalid');
            }

            const token = localStorage.getItem('authToken');
            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            try {
                const response = await fetch(`${this.API_URL}/pending`, {
                    headers: headers
                });

                if (response.status === 401) {
                    this.handleAuthError('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
                    throw new Error('Unauthorized - Token expired or invalid');
                }

                if (!response.ok) {
                    throw new Error(`Failed to fetch pending requests: ${response.status}`);
                }

                return await response.json();
            } catch (error) {
                // Re-throw authentication errors
                if (error.message.includes('Unauthorized') || error.message.includes('Token expired')) {
                    throw error;
                }

                console.error('Error fetching pending requests:', error);
                throw new Error('Failed to fetch pending requests');
            }
        }


        async getRequestById(id) {
            // We can fetch all and find, or fetch single if endpoint exists.
            // Current backend doesn't have GET /:id for contributions, only for lessons.
            // So we fetch all (or filtered list) and find.
            // Optimization: Add GET /:id endpoint later. For now, fetch all is fine for small scale.
            const requests = await this.getAllRequests();
            return requests.find(r => r._id === id || r.id === id);
        }

        async getStats() {
            // We can create a specific stats endpoint, or just calculate from all requests.
            // For now, fetch all and calculate.
            const requests = await this.getAllRequests();
            return {
                total: requests.length,
                pending: requests.filter(r => r.status === 'pending').length,
                approved: requests.filter(r => r.status === 'approved').length,
                rejected: requests.filter(r => r.status === 'rejected').length,
                lessonEdits: requests.filter(r => r.status === 'pending' && r.type === 'lesson_edit').length,
                bookUploads: requests.filter(r => r.status === 'pending' && r.type === 'book_upload').length,
                communityExams: requests.filter(r => r.status === 'pending' && r.type === 'community_exam').length
            };
        }

        isAdmin() {
            // Check current user based on Auth Service (localStorage)
            // This remains client-side check for UI visibility, but backend protects endpoints.
            const user = JSON.parse(localStorage.getItem('currentUser'));
            return user && (user.role === 'admin' || user.username === 'admin' || user.email.includes('admin'));
        }

        /**
         * Validates if the current JWT token is still valid
         * @returns {boolean} True if token exists and hasn't expired
         */
        isTokenValid() {
            const token = localStorage.getItem('authToken');
            if (!token) return false;

            try {
                // Decode JWT payload (format: header.payload.signature)
                const parts = token.split('.');
                if (parts.length !== 3) return false;

                const payload = JSON.parse(atob(parts[1]));

                // Check if token has expiration claim
                if (!payload.exp) return false;

                // Convert exp (seconds) to milliseconds and compare with current time
                const expirationTime = payload.exp * 1000;
                const currentTime = Date.now();

                return currentTime < expirationTime;
            } catch (error) {
                console.error('Error validating token:', error);
                return false;
            }
        }

        /**
         * Handles authentication errors by clearing session and redirecting to login
         * @param {string} message - Optional error message to display
         */
        handleAuthError(message = 'Tu sesión ha expirado') {
            // Clear authentication data
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');

            // Redirect to login with expired flag
            const loginUrl = `/login/?expired=true&message=${encodeURIComponent(message)}`;
            globalThis.location.href = loginUrl;
        }

        /**
         * Makes an authenticated fetch request with automatic token validation and error handling
         * @param {string} url - The URL to fetch
         * @param {Object} options - Fetch options (method, body, etc.)
         * @param {string} errorContext - Context for error messages (e.g., 'approve request')
         * @returns {Promise<Object>} The response data
         * @throws {Error} If authentication fails or request fails
         */
        async authenticatedFetch(url, options = {}, errorContext = 'perform action') {
            // Validate token before making request
            if (!this.isTokenValid()) {
                this.handleAuthError('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
                throw new Error('Token expired or invalid');
            }

            const token = localStorage.getItem('authToken');
            const headers = options.headers || {};

            // Add authorization header
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            // Add content-type if body is present
            if (options.body && !headers['Content-Type']) {
                headers['Content-Type'] = 'application/json';
            }

            try {
                const response = await fetch(url, {
                    ...options,
                    headers
                });

                // Handle 401 Unauthorized
                if (response.status === 401) {
                    this.handleAuthError('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
                    throw new Error('Unauthorized - Token expired or invalid');
                }

                // Handle other errors
                if (!response.ok) {
                    throw new Error(`Failed to ${errorContext}: ${response.status}`);
                }

                // Safe JSON parsing
                const text = await response.text();
                return text ? JSON.parse(text) : { success: true };
            } catch (error) {
                // Re-throw authentication errors
                if (error.message.includes('Unauthorized') || error.message.includes('Token expired')) {
                    throw error;
                }

                console.error(`Error ${errorContext}:`, error);
                throw new Error(`Failed to ${errorContext}`);
            }
        }


        // ========================================
        // SUBMISSION METHODS
        // ========================================

        async submitLessonEdit(data) {
            const user = JSON.parse(localStorage.getItem('currentUser'));
            const token = localStorage.getItem('authToken');

            const payload = {
                type: 'lesson_edit',
                title: data.lessonTitle,
                description: data.description,
                data: data,
                submittedBy: user ? { id: user.id || user._id, username: user.username, email: user.email } : null
            };

            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Failed to submit request');
            return await response.json();
        }

        async submitBookUpload(data) {
            const user = JSON.parse(localStorage.getItem('currentUser'));
            const token = localStorage.getItem('authToken');

            const payload = {
                type: 'book_upload',
                title: data.title,
                description: data.description,
                data: data,
                submittedBy: user ? { id: user.id || user._id, username: user.username, email: user.email } : null
            };

            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Failed to submit request');
            return await response.json();
        }

        // ========================================
        // ADMIN METHODS
        // ========================================

        async approveRequest(requestId, finalContent = null) {
            const body = { status: 'approved' };
            if (finalContent) {
                body.finalContent = finalContent;
            }

            return await this.authenticatedFetch(
                `${this.API_URL}/${requestId}/status`,
                {
                    method: 'PUT',
                    body: JSON.stringify(body)
                },
                'approve request'
            );
        }


        async rejectRequest(requestId, reason) {
            return await this.authenticatedFetch(
                `${this.API_URL}/${requestId}/status`,
                {
                    method: 'PUT',
                    body: JSON.stringify({ status: 'rejected', reason: reason })
                },
                'reject request'
            );
        }


        async deleteRequest(requestId) {
            return await this.authenticatedFetch(
                `${this.API_URL}/${requestId}`,
                { method: 'DELETE' },
                'delete request'
            );
        }


        // Make deleteContribution available for community lessons
        async deleteContribution(id) {
            return await this.authenticatedFetch(
                `${this.LESSONS_API_URL}/${id}`,
                { method: 'DELETE' },
                'delete lesson'
            );
        }

        /**
         * Get lesson version history (Admin only)
         * @param {string} lessonId - The lesson ID
         * @returns {Promise<Array>} Array of historical versions
         */
        async getLessonHistory(lessonId) {
            return await this.authenticatedFetch(
                `${this.LESSONS_API_URL}/${lessonId}/history`,
                { method: 'GET' },
                'fetch lesson history'
            );
        }

        /**
         * Restore a previous version of a lesson (Admin only)
         * @param {string} lessonId - The lesson ID
         * @param {number} version - The version number to restore
         * @returns {Promise<Object>} Success response
         */
        async restoreLessonVersion(lessonId, version) {
            return await this.authenticatedFetch(
                `${this.LESSONS_API_URL}/${lessonId}/restore/${version}`,
                { method: 'POST' },
                'restore lesson version'
            );
        }

        async getAdminUsers() {
            return await this.authenticatedFetch(
                `${this.AUTH_API_URL}/admin/users`,
                { method: 'GET' },
                'fetch admin users'
            );
        }

        async updateUserRole(userId, role) {
            return await this.authenticatedFetch(
                `${this.AUTH_API_URL}/admin/users/${userId}/role`,
                {
                    method: 'PUT',
                    body: JSON.stringify({ role })
                },
                'update user role'
            );
        }

        async deleteUser(userId) {
            return await this.authenticatedFetch(
                `${this.AUTH_API_URL}/admin/users/${userId}`,
                { method: 'DELETE' },
                'delete user'
            );
        }


    }

    globalThis.ContributionService = new ContributionService();
    console.log('✅ Contribution Service API initialized');

})();
