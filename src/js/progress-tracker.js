/**
 * Progress Tracker
 * Automatically tracks when a user views a lesson page.
 */
document.addEventListener('DOMContentLoaded', () => {
    trackLessonView();
});

function trackLessonView() {
    // Only run if user is logged in
    const token = localStorage.getItem('token');
    if (!token) return;

    // Check if we are on a lesson page
    // Logic: Checks for specific path patterns or DOM elements unique to lessons
    const path = globalThis.location.pathname;
    const isLessonPage = path.includes('/Nivel') || path.includes('/lessons/');

    if (!isLessonPage) return;

    // Get Lesson Info
    const titleRegex = /<h1[^>]*>(.*?)<\/h1>/i;
    const h1 = document.querySelector('h1');
    const title = h1 ? h1.innerText : document.title;

    // Construct Lesson ID from URL or meta tag
    // simple ID generation from path
    const lessonId = path.split('/').filter(Boolean).pop(); // "NivelA1" or "lesson-slug"

    const data = {
        lessonId: lessonId,
        title: title,
        url: globalThis.location.href
    };

    // Send to backend
    fetch('/api/progress/view', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    }).then(res => {
        if (res.ok) {
            // console.log('✅ Progress saved');
        }
    }).catch(err => console.error('Error saving progress:', err));
}
