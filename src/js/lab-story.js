/**
 * LabStory - Chinese AI Storytelling Controller
 */

class LabStory {
    currentStory = null;
    currentChapter = 0;
    history = JSON.parse(localStorage.getItem('lab_story_history_panda') || '[]');

    constructor() {
        this.init();
    }

    init() {
        document.getElementById('start-story-btn').onclick = () => this.startNewStory();
        this.renderHistory();
    }

    async startNewStory() {
        if (!this.checkLimit()) {
            return this.notify("Solo puedes generar una historia al día.", "warning");
        }

        const genre = document.getElementById('story-genre').value;
        const charName = document.getElementById('character-name').value.trim() || 'Xiao Long';
        const isPublic = document.getElementById('story-public-toggle').checked;

        this.setState('loading');

        try {
            const response = await fetch('/api/chat/lab/start-story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ genre, charName, isPublic })
            });

            const data = await response.json();
            this.currentStory = data;
            this.currentChapter = 1;
            this.renderChapter(data.first_chapter);
            this.saveToHistory(data);
        } catch (e) {
            console.error(e);
            this.notify("Error al iniciar historia.", "error");
            this.setState('placeholder');
        }
    }

    renderChapter(chapter) {
        this.setState('content');
        const textContainer = document.getElementById('story-text');
        const optionsContainer = document.getElementById('story-options');

        // Note: Using global marked if available for markdown
        textContainer.innerHTML = `<div class="animate-fadeIn">${globalThis.marked ? globalThis.marked.parse(chapter.text) : chapter.text}</div>`;
        
        optionsContainer.innerHTML = '';
        chapter.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'p-6 rounded-2xl bg-white/5 border border-white/10 text-left hover:bg-red-600 hover:text-white transition-all font-bold';
            btn.innerHTML = `<span class="block text-[10px] uppercase opacity-50 mb-1">Decisión</span> ${opt}`;
            btn.onclick = () => this.nextChapter(opt);
            optionsContainer.appendChild(btn);
        });
    }

    async nextChapter(selectedOption) {
        this.setState('loading');
        try {
            const response = await fetch('/api/chat/lab/continue-story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ story_id: this.currentStory.id, option: selectedOption, chapter_index: this.currentChapter })
            });

            const data = await response.json();
            this.currentChapter++;
            this.renderChapter(data.next_chapter);
        } catch (e) {
            console.error(e);
            this.notify("Error al continuar.", "error");
            this.setState('content');
        }
    }

    setState(state) {
        ['placeholder', 'loading', 'content'].forEach(s => document.getElementById(`story-${s}`).classList.add('hidden'));
        document.getElementById(`story-${state}`).classList.remove('hidden');
    }

    saveToHistory(story) {
        const entry = { id: story.id, date: new Date().toISOString(), title: story.title || 'Historia en Chino', genre: story.genre };
        this.history.unshift(entry);
        localStorage.setItem('lab_story_history_panda', JSON.stringify(this.history.slice(0, 5)));
        localStorage.setItem('last_story_panda_date', new Date().toDateString());
        this.renderHistory();
    }

    checkLimit() {
        return localStorage.getItem('last_story_panda_date') !== new Date().toDateString();
    }

    renderHistory() {
        const list = document.getElementById('history-list');
        if (this.history.length === 0) return;
        list.innerHTML = '';
        this.history.forEach(h => {
             const div = document.createElement('div');
             div.className = 'p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 cursor-pointer hover:bg-red-500/10 transition-all';
             div.innerHTML = `<div class="font-bold text-xs truncate">${h.title}</div><div class="text-[9px] text-slate-500">${new Date(h.date).toLocaleDateString()}</div>`;
             list.appendChild(div);
        });
    }

    notify(msg, type) {
        if (globalThis.toast) globalThis.toast(msg, type); else alert(msg);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    globalThis.labStory = new LabStory();
});
