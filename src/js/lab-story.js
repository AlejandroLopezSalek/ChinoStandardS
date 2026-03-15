class LabStory {
    currentStory = null;
    currentChapterData = null;
    currentDisplayMode = localStorage.getItem('story_display_mode') || 'hz';
    history = JSON.parse(localStorage.getItem('lab_story_history_panda') || '[]');

    constructor() {
        this.init();
    }

    async init() {
        document.getElementById('start-story-btn').onclick = () => this.startNewStory();
        document.getElementById('close-story-btn').onclick = () => this.clearSession();
        
        // Mode toggle listeners
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.onclick = () => this.setDisplayMode(btn.dataset.mode);
        });

        this.renderHistory();
        this.checkActiveStory();
    }

    async checkActiveStory() {
        try {
            const headers = globalThis.AuthService?.getAuthHeaders() || {};
            const res = await fetch('/api/chat/lab/current-active-story', { headers });
            const data = await res.json();
            if (data.active) {
                this.currentStory = { id: data.story.id, title: data.story.title };
                this.renderChapter(data.story.current_chapter);
            }
        } catch (e) {
            console.error("Error resuming story:", e);
            this.setState('placeholder');
        }
    }

    async startNewStory() {
        if (!this.checkLimit()) {
            return this.notify("Solo puedes generar una historia al día. ¡Vuelve mañana!", "warning");
        }

        const genre = document.getElementById('story-genre').value;
        const charName = document.getElementById('character-name').value.trim() || 'Xiao Long';
        const userPrompt = document.getElementById('story-prompt').value.trim();
        const level = document.getElementById('story-level').value;
        const isPublic = document.getElementById('story-public-toggle').checked;

        this.setState('loading');

        try {
            const headers = globalThis.AuthService?.getAuthHeaders() || { 'Content-Type': 'application/json' };
            const response = await fetch('/api/chat/lab/start-story', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ genre, charName, userPrompt, level, isPublic })
            });

            const data = await response.json();
            this.currentStory = data;
            this.renderChapter(data.first_chapter);
            this.saveToHistory(data);
        } catch (e) {
            console.error(e);
            this.notify("Error al iniciar historia. Verifica tu conexión.", "error");
            this.setState('placeholder');
        }
    }

    renderChapter(chapter) {
        if (!chapter) return;
        this.currentChapterData = chapter;
        this.setState('content');
        document.getElementById('mode-toggles').classList.remove('hidden');

        const textContainer = document.getElementById('story-text');
        const optionsContainer = document.getElementById('story-options');

        // Logic display
        let html = `<p class="mb-6">${chapter.text}</p>`;
        
        if (chapter.segments && Array.isArray(chapter.segments)) {
            html += `<div class="story-segments flex flex-wrap gap-x-4 gap-y-6 items-end">`;
            chapter.segments.forEach(seg => {
                html += this.formatSegment(seg);
            });
            html += `</div>`;
        }

        textContainer.innerHTML = html;
        
        optionsContainer.innerHTML = '';
        if (chapter.options && Array.isArray(chapter.options)) {
            chapter.options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'story-option-btn text-slate-900 dark:text-white p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-left hover:bg-red-600 hover:text-white transition-all font-bold';
                btn.innerHTML = `<span class="block text-[10px] uppercase opacity-50 mb-1">Opción</span> ${opt}`;
                btn.onclick = () => this.nextChapter(opt);
                optionsContainer.appendChild(btn);
            });
        }

        this.updateModeUI();
        document.getElementById('story-display').scrollIntoView({ behavior: 'smooth' });
    }

    formatSegment(seg) {
        const mode = this.currentDisplayMode;
        if (mode === 'hz') {
            return `<span class="text-3xl font-medium text-slate-900 dark:text-white">${seg.hz}</span>`;
        } else if (mode === 'py') {
            return `<ruby class="text-3xl font-medium text-slate-900 dark:text-white">${seg.hz}<rt class="text-xs text-red-500 font-bold mb-1">${seg.py}</rt></ruby>`;
        } else {
            // Full mode with Tooltip/Note
            return `
                <div class="group relative inline-block cursor-help border-b-2 border-dotted border-red-400 pb-1">
                    <ruby class="text-3xl font-medium text-slate-900 dark:text-white">
                        ${seg.hz}
                        <rt class="text-xs text-red-500 font-bold mb-1">${seg.py}</rt>
                    </ruby>
                    <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 p-3 bg-white dark:bg-slate-800 rounded-xl shadow-2xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all pointer-events-none z-50 border border-slate-100 dark:border-white/10">
                        <div class="text-xs font-bold text-red-600 mb-1 uppercase tracking-widest">${seg.tr}</div>
                        ${seg.note ? `<div class="text-[10px] text-slate-500 leading-tight">${seg.note}</div>` : ''}
                        <div class="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white dark:border-t-slate-800"></div>
                    </div>
                </div>`;
        }
    }

    setDisplayMode(mode) {
        this.currentDisplayMode = mode;
        localStorage.setItem('story_display_mode', mode);
        this.renderChapter(this.currentChapterData);
    }

    updateModeUI() {
        document.querySelectorAll('.mode-btn').forEach(btn => {
            const isActive = btn.dataset.mode === this.currentDisplayMode;
            btn.className = `mode-btn px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${isActive ? 'bg-white dark:bg-slate-800 shadow-sm text-red-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`;
        });
    }

    async loadStory(storyId) {
        this.setState('loading');
        try {
            const headers = globalThis.AuthService?.getAuthHeaders() || {};
            const res = await fetch(`/api/chat/lab/story/${storyId}`, { headers });
            const data = await res.json();
            if (data.active) {
                this.currentStory = { id: data.story.id, title: data.story.title };
                this.renderChapter(data.story.current_chapter);
            } else {
                this.notify("No se pudo encontrar la historia o ha expirado.", "warning");
                this.setState('placeholder');
            }
        } catch (e) {
            console.error("Error loading story:", e);
            this.notify("Error al cargar la historia.", "error");
            this.setState('placeholder');
        }
    }

    async nextChapter(selectedOption) {
        this.setState('loading');
        try {
            const headers = globalThis.AuthService?.getAuthHeaders() || { 'Content-Type': 'application/json' };
            const response = await fetch('/api/chat/lab/continue-story', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ story_id: this.currentStory.id, option: selectedOption })
            });

            const data = await response.json();
            this.renderChapter(data.next_chapter);
        } catch (e) {
            console.error(e);
            this.notify("Error al continuar.", "error");
            this.setState('content');
        }
    }

    async clearSession() {
        this.currentStory = null;
        this.currentChapterData = null;
        this.setState('placeholder');
        document.getElementById('mode-toggles').classList.add('hidden');
        try {
            const headers = globalThis.AuthService?.getAuthHeaders() || {};
            await fetch('/api/chat/lab/active-story', { 
                method: 'DELETE',
                headers: headers
            });
        } catch (e) {
            console.error("Error clearing session:", e);
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
        if (globalThis.AuthService?.getCurrentUser()?.role === 'admin') return true;
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
             div.onclick = () => this.loadStory(h.id);
             list.appendChild(div);
        });
    }

    notify(msg, type) {
        if (globalThis.ToastSystem) globalThis.ToastSystem[type](msg); else if (globalThis.toast) globalThis.toast(msg, type); else alert(msg);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    globalThis.labStory = new LabStory();
});
