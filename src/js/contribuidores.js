// ========================================
// CONTRIBUIDORES LOGIC
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // Wait for ContributionService to be ready
    if (globalThis.ContributionService) {
        initContributors();
    } else {
        setTimeout(() => {
            if (globalThis.ContributionService) {
                initContributors();
            } else {
                console.error('ContributionService not available');
                showError();
            }
        }, 500);
    }
});

const CONTRIBUTORS_PER_PAGE = 10;
let displayedContributorsCount = 0;
let uniqueAuthors = [];

async function initContributors() {
    const loadingEl = document.getElementById('contributorsLoading');
    const gridEl = document.getElementById('contributorsGrid');
    const noMsgEl = document.getElementById('noContributorsMsg');
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    const loadMoreBtn = document.getElementById('loadMoreBtn');

    try {
        const lessons = await globalThis.ContributionService.getPublishedLessons();

        // Extract unique authors safely
        const authorCounts = {};

        lessons.forEach(lesson => {
            if (lesson.author && lesson.author.trim() !== '') {
                const authorName = lesson.author.trim();
                // Skip if author is part of the core team (optional, based on user preference)
                // For now, we list everyone who contributed.

                authorCounts[authorName] = (authorCounts[authorName] || 0) + 1;
            }
        });

        // Convert to array and sort by number of contributions (descending)
        uniqueAuthors = Object.entries(authorCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        loadingEl.classList.add('hidden');

        if (uniqueAuthors.length === 0) {
            noMsgEl.classList.remove('hidden');
        } else {
            gridEl.classList.remove('hidden');
            renderContributors();

            // Setup Load More button
            if (uniqueAuthors.length > CONTRIBUTORS_PER_PAGE) {
                loadMoreContainer.classList.remove('hidden');
                loadMoreBtn.onclick = () => renderContributors();
            }
        }

    } catch (e) {
        console.error('Error fetching contributors:', e);
        loadingEl.classList.add('hidden');
        noMsgEl.classList.remove('hidden'); // Fallback
    }
}

function renderContributors() {
    const gridEl = document.getElementById('contributorsGrid');
    const loadMoreContainer = document.getElementById('loadMoreContainer');

    const start = displayedContributorsCount;
    const end = Math.min(start + CONTRIBUTORS_PER_PAGE, uniqueAuthors.length);

    for (let i = start; i < end; i++) {
        const author = uniqueAuthors[i];
        const card = createContributorCard(author);
        gridEl.appendChild(card);
    }

    displayedContributorsCount = end;

    // Hide "Load More" if all are shown
    if (displayedContributorsCount >= uniqueAuthors.length) {
        loadMoreContainer.classList.add('hidden');
    }
}

function createContributorCard(author) {
    const link = document.createElement('a');
    link.href = `/Community-Lessons/?search=${encodeURIComponent(author.name)}`;
    link.className = 'bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center hover:shadow-md transition-all duration-300 animate-fadeIn hover:-translate-y-1 block no-underline cursor-pointer group';

    // Generate an arbitrary color based on name for the avatar
    const colors = [
        { light: 'bg-red-100 text-red-600', dark: 'dark:bg-red-900/30 dark:text-red-400' },
        { light: 'bg-orange-100 text-orange-600', dark: 'dark:bg-orange-900/30 dark:text-orange-400' },
        { light: 'bg-green-100 text-green-600', dark: 'dark:bg-green-900/30 dark:text-green-400' },
        { light: 'bg-amber-100 text-amber-600', dark: 'dark:bg-amber-900/30 dark:text-amber-400' },
        { light: 'bg-rose-100 text-rose-600', dark: 'dark:bg-rose-900/30 dark:text-rose-400' },
        { light: 'bg-red-100 text-red-600', dark: 'dark:bg-red-900/30 dark:text-red-400' },
        { light: 'bg-red-100 text-red-600', dark: 'dark:bg-red-900/30 dark:text-red-400' },
        { light: 'bg-orange-100 text-orange-600', dark: 'dark:bg-orange-900/30 dark:text-orange-400' }
    ];

    // Use a simple hash of the name to pick a color consistency
    let hash = 0;
    for (let i = 0; i < author.name.length; i++) {
        hash = author.name.codePointAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    const colorSet = colors[index];

    const initials = author.name.slice(0, 2).toUpperCase();

    link.innerHTML = `
        <div class="w-16 h-16 rounded-full ${colorSet.light} ${colorSet.dark} flex items-center justify-center text-xl font-bold mb-3 shadow-inner transition-colors group-hover:scale-105 duration-300">
            ${initials}
        </div>
        <h5 class="font-bold text-slate-800 dark:text-slate-100 text-lg mb-1 truncate w-full group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" title="${author.name}">
            ${author.name}
        </h5>
        <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">
            <i class="fas fa-book-open mr-1"></i> ${author.count} ${author.count === 1 ? 'Lección' : 'Lecciones'}
        </div>
    `;

    return link;
}

function showError() {
    const loadingEl = document.getElementById('contributorsLoading');
    loadingEl.innerHTML = '<p class="text-red-500">Error cargando datos.</p>';
}
