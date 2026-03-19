/**
 * LabExams - Chinese AI Exam Controller
 */

class LabExams {
    constructor() {
        this.currentExam = null;
        this.userAnswers = {};
        this.history = JSON.parse(localStorage.getItem('lab_exam_history_panda') || '[]');
        this.init();
    }

    init() {
        this.loadI18N();
        this.setupEventListeners();
    }

    loadI18N() {
        try {
            const data = document.getElementById('i18n-messages')?.textContent;
            window.I18N = data ? JSON.parse(data) : {};
        } catch (e) {
            console.error('[ExamLab] Failed to load I18N:', e);
            window.I18N = {};
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.mode-btn').forEach(b => {
                    b.classList.remove('border-red-500', 'bg-red-500/10', 'text-red-600', 'dark:text-red-400');
                    b.classList.add('bg-slate-100', 'dark:bg-white/5', 'text-slate-600', 'dark:text-slate-400', 'border-transparent');
                });
                btn.classList.add('border-red-500', 'bg-red-500/10', 'text-red-600', 'dark:text-red-400');
                btn.classList.remove('bg-slate-100', 'dark:bg-white/5', 'text-slate-600', 'dark:text-slate-400', 'border-transparent');
                
                if (btn.dataset.mode === 'custom') {
                    document.getElementById('level-container').classList.add('hidden');
                    document.getElementById('prompt-container').classList.remove('hidden');
                } else {
                    document.getElementById('level-container').classList.remove('hidden');
                    document.getElementById('prompt-container').classList.add('hidden');
                }
            });
        });

        document.querySelectorAll('.level-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        document.getElementById('generate-exam-btn').onclick = () => this.handleGenerate();
        
        const historyBtn = document.getElementById('view-history-btn');
        if (historyBtn) historyBtn.onclick = () => this.fetchHistory();
    }

    async handleGenerate() {
        if (!this.checkLimit()) {
            return this.notify(window.I18N?.limit_reached || "Vuelve mañana para tu siguiente examen diario.", "warning");
        }

        this.setState('loading');
        
        try {
            const level = document.querySelector('.level-btn.active')?.dataset.level || 'HSK1';
            const mode = document.querySelector('.mode-btn.border-red-500')?.dataset.mode || 'classic';
            const prompt = document.getElementById('exam-prompt').value;
            const isPublic = document.getElementById('public-toggle').checked;
            const lang = document.documentElement.lang || 'es';

            const headers = globalThis.AuthService?.getAuthHeaders() || { 'Content-Type': 'application/json' };
            
            const response = await fetch('/api/chat/lab/generate-exam', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ level, mode, prompt, is_public: isPublic, lang })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            this.currentExam = data;
            this.db_id = data.db_id; // Store for grading and history update
            this.currentSectionIdx = 0;
            this.renderExam();
            localStorage.setItem('last_exam_panda_date', new Date().toDateString());
        } catch (e) {
            console.error('[ExamLab] Generation error:', e);
            this.notify(window.I18N?.generic_error || "Fallo en generación.", "error");
            this.setState('initial');
        }
    }

    async fetchHistory() {
        this.setState('loading');
        try {
            const headers = globalThis.AuthService?.getAuthHeaders() || {};
            const res = await fetch('/api/chat/lab/exams/history', { headers });
            const data = await res.json();
            this.renderHistory(data);
        } catch (e) {
            this.notify("Error al cargar historial.", "error");
            this.setState('initial');
        }
    }
    renderHistory(exams) {
        this.setState('results');
        const container = document.getElementById('results-content');
        const historyTitle = window.I18N?.history_btn || "Mis Retos";
        const backBtn = window.I18N?.prev_btn || "Volver";
        const emptyMsg = window.I18N?.no_history || "No hay exámenes realizados aún.";

        this.examsHistory = exams; // Cache locally for viewing

        container.innerHTML = `
            <div class="space-y-6">
                <div class="flex items-center justify-between mb-6">
                    <h4 class="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">${historyTitle}</h4>
                    <button onclick="location.reload()" class="text-xs font-bold text-red-500 hover:underline">${backBtn}</button>
                </div>
                ${exams.length === 0 ? `<p class="text-center text-slate-500 italic py-12">${emptyMsg}</p>` : ''}
                <div class="grid grid-cols-1 gap-4">
                    ${exams.map((e, idx) => `
                        <div onclick="globalThis.labExams.renderHistoricResult(${idx})" 
                             class="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center justify-between group hover:border-red-500/50 transition-all cursor-pointer">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-xl">
                                    ${e.score >= 60 ? '🏆' : '📝'}
                                </div>
                                <div class="flex-1 min-w-0">
                                    <h5 class="font-bold text-slate-900 dark:text-white text-sm truncate">${e.title}</h5>
                                    <p class="text-[10px] text-slate-500 font-medium uppercase">${e.level} • ${new Date(e.date).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="text-lg font-black ${e.score >= 60 ? 'text-emerald-500' : 'text-slate-400'}">${e.score || 0}%</div>
                                <div class="text-[9px] text-slate-400 uppercase font-black tracking-widest group-hover:text-red-500">VER <i class="fas fa-eye ml-1"></i></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderHistoricResult(idx) {
        const exam = this.examsHistory[idx];
        if (!exam || !exam.results) return;

        // Mock the grading result object structure
        const resultsObj = {
            score: exam.score,
            feedback: exam.results,
            panda_advice: exam.panda_advice
        };

        this.currentExam = exam.exam_data;
        this.renderResults(resultsObj);
    }
    
    renderExam() {
        this.setState('exam');
        this.renderSection();
    }

    renderSection() {
        const container = document.getElementById('exam-content');
        container.innerHTML = '';
        
        const section = this.currentExam.sections[this.currentSectionIdx];
        
        // Section Header
        const header = document.createElement('div');
        header.className = 'mb-8 animate-fadeIn';
        
        const pageLabel = window.I18N?.page_label || "Página";
        const sectionTitle = this.getSectionTitle(section.type);

        header.innerHTML = `
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-black uppercase tracking-widest text-red-500">${pageLabel} ${this.currentSectionIdx + 1} de 3</span>
                <span class="text-xs font-bold text-slate-400">${section.type.toUpperCase()}</span>
            </div>
            <h2 class="text-3xl font-black text-slate-900 dark:text-white mb-2">${sectionTitle}</h2>
            <p class="text-slate-600 dark:text-slate-400 text-sm italic mb-6">${section.instructions}</p>
        `;
        
        // Reading Passage Modal Button
        if (section.reading_passage) {
            const passageBtn = document.createElement('button');
            passageBtn.type = 'button';
            passageBtn.className = 'w-full mb-8 p-6 rounded-2xl bg-red-600 text-white font-black flex items-center justify-between group hover:scale-[1.02] transition-all shadow-lg shadow-red-500/20';
            passageBtn.innerHTML = `
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-xl">
                        <i class="fas fa-book-open"></i>
                    </div>
                    <div class="text-left">
                        <span class="block text-[10px] uppercase font-bold opacity-80 line-height-1">Comprensión</span>
                        <span class="block text-lg">LEER TEXTO</span>
                    </div>
                </div>
                <i class="fas fa-chevron-right group-hover:translate-x-1 transition-transform"></i>
            `;
            passageBtn.onclick = () => this.showReadingModal(section.reading_passage);
            header.appendChild(passageBtn);
        }

        // Listening Passage Button
        if (section.listening_passage) {
            const audioBtn = document.createElement('button');
            audioBtn.type = 'button';
            audioBtn.className = 'w-full mb-8 p-6 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black flex items-center justify-between group hover:scale-[1.02] transition-all shadow-xl';
            audioBtn.innerHTML = `
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-white/20 dark:bg-slate-900/20 rounded-xl flex items-center justify-center text-xl">
                        <i class="fas fa-play"></i>
                    </div>
                    <div class="text-left">
                        <span class="block text-[10px] uppercase font-bold opacity-80 line-height-1">Audio</span>
                        <span class="block text-lg">ESCUCHAR CONVERSACIÓN</span>
                    </div>
                </div>
                <i class="fas fa-headphones text-2xl opacity-50"></i>
            `;
            audioBtn.onclick = () => this.playTTS(section.listening_passage);
            header.appendChild(audioBtn);
        }

        container.appendChild(header);

        const template = document.getElementById('question-template');
        section.questions.forEach((q, idx) => {
            const clone = template.content.cloneNode(true);
            clone.querySelector('.q-number').textContent = idx + 1;
            clone.querySelector('.q-text').textContent = q.question;
            
            const optionsBox = clone.querySelector('.q-options');
            const inputBox = clone.querySelector('.q-input-container');

            // Per-question Listening Support (Legacy or specific tasks)
            if (section.type === 'listening' && q.audio_text && !section.listening_passage) {
                const audioBtn = document.createElement('button');
                audioBtn.type = 'button';
                audioBtn.className = 'mb-4 flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm font-bold hover:scale-105 transition-all';
                audioBtn.innerHTML = '<i class="fas fa-volume-up"></i> Escuchar Pista';
                audioBtn.onclick = () => this.playTTS(q.audio_text);
                clone.querySelector('.question-block').insertBefore(audioBtn, optionsBox);
            }

            if (q.type === 'multiple_choice') {
                q.options.forEach(opt => {
                    const b = document.createElement('button');
                    b.type = 'button';
                    b.className = `p-3 rounded-xl border transition-all text-sm text-left ${
                        this.userAnswers[q.id] === opt 
                        ? 'bg-red-600 text-white border-red-600' 
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-red-500'
                    }`;
                    b.textContent = opt;
                    b.onclick = () => {
                        optionsBox.querySelectorAll('button').forEach(btn => {
                            btn.className = 'p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-left hover:border-red-500 transition-all text-sm';
                        });
                        b.className = 'p-3 rounded-xl bg-red-600 text-white border-red-600 text-left transition-all text-sm';
                        this.userAnswers[q.id] = opt;
                    };
                    optionsBox.appendChild(b);
                });
            } else {
                optionsBox.classList.add('hidden');
                inputBox.classList.remove('hidden');
                const input = inputBox.querySelector('input');
                input.value = this.userAnswers[q.id] || '';
                input.oninput = (e) => this.userAnswers[q.id] = e.target.value;
            }
            container.appendChild(clone);
        });

        // Navigation Footer
        const footer = document.createElement('div');
        footer.className = 'mt-12 pt-8 border-t border-slate-100 dark:border-white/5 flex gap-4';
        
        if (this.currentSectionIdx > 0) {
            const prev = document.createElement('button');
            prev.className = 'flex-1 py-4 px-6 border-2 border-slate-200 dark:border-slate-700 rounded-2xl font-bold flex items-center justify-center gap-2';
            prev.innerHTML = `<i class="fas fa-arrow-left"></i> ${window.I18N?.prev_btn || 'ANTERIOR'}`;
            prev.onclick = () => {
                this.currentSectionIdx--;
                this.renderSection();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };
            footer.appendChild(prev);
        }

        const next = document.createElement('button');
        if (this.currentSectionIdx < this.currentExam.sections.length - 1) {
            next.className = 'flex-[2] py-4 px-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl';
            next.innerHTML = `${window.I18N?.next_btn || 'SIGUIENTE'} <i class="fas fa-arrow-right"></i>`;
            next.onclick = () => {
                this.currentSectionIdx++;
                this.renderSection();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };
        } else {
            next.className = 'flex-[2] py-4 px-6 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/30';
            next.textContent = window.I18N?.grade_btn || 'CALIFICAR EXAMEN';
            next.onclick = () => this.gradeExam();
        }
        footer.appendChild(next);
        container.appendChild(footer);
    }

    showReadingModal(text) {
        const modal = document.getElementById('reading-modal');
        const textContainer = document.getElementById('modal-reading-text');
        if (modal && textContainer) {
            textContainer.textContent = text;
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    }

    /**
     * Plays audio for listening questions using Browser Native TTS (SpeechSynthesis)
     * for more realistic or high-quality voices than server-side robotic TTS.
     */
    async playTTS(text) {
        if (!text) return;

        try {
            // Check if SpeechSynthesis is supported
            if (!('speechSynthesis' in window)) {
                throw new Error('Speech synthesis not supported');
            }

            // Cancel any ongoing speech
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            
            // Find a suitable Chinese voice
            const voices = window.speechSynthesis.getVoices();
            // Preference: zh-CN (Mainland), then zh-HK (Cantonese - fallback), then zh-TW (Taiwan)
            const zhVoice = voices.find(v => v.lang.includes('zh-CN')) || 
                            voices.find(v => v.lang.includes('zh')) || 
                            voices.find(v => v.lang.toLowerCase().includes('chinese'));

            if (zhVoice) {
                utterance.voice = zhVoice;
            }

            // Set natural parameters for language learning
            utterance.lang = 'zh-CN';
            utterance.rate = 0.85; // Slightly slower for better comprehension
            utterance.pitch = 1.0;

            window.speechSynthesis.speak(utterance);

            console.log('[ExamLab] Playing Browser TTS:', text);
        } catch (e) {
            console.warn('[ExamLab] Browser TTS failed, falling back to server:', e);
            // Fallback to robotic server TTS if browser fails
            try {
                const audio = new Audio(`/api/chat/tts?text=${encodeURIComponent(text)}`);
                await audio.play();
            } catch (fallbackError) {
                console.error('[ExamLab] All TTS methods failed:', fallbackError);
            }
        }
    }

    getSectionTitle(type) {
        switch (type) {
            case 'listening': return window.I18N?.listening_title || 'Comprensión Auditiva';
            case 'reading': return window.I18N?.reading_title || 'Comprensión Lectora';
            case 'writing': return window.I18N?.writing_title || 'Escritura';
            default: return type.toUpperCase();
        }
    }

    async gradeExam() {
        this.setState('loading');
        try {
            const lang = document.documentElement.lang || 'es';
            const headers = globalThis.AuthService?.getAuthHeaders() || { 'Content-Type': 'application/json' };
            const response = await fetch('/api/chat/lab/grade-exam', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ 
                    answers: this.userAnswers, 
                    original_exam: this.currentExam,
                    db_id: this.db_id,
                    lang: lang
                })
            });
            const data = await response.json();
            this.renderResults(data);
        } catch (e) { this.setState('exam'); }
    }

    renderResults(data) {
        this.setState('results');
        const container = document.getElementById('results-content');
        container.innerHTML = `
            <div class="space-y-6">
                <div class="p-8 rounded-3xl bg-red-500/10 border border-red-500/20 text-center">
                    <div class="text-5xl font-black text-red-600 mb-2">${data.score}%</div>
                    <p class="font-bold text-slate-800 dark:text-slate-200">${window.I18N?.score_label || 'Resultado Final'}</p>
                </div>
                <div class="p-6 bg-slate-50 dark:bg-white/5 rounded-2xl">
                    <p class="text-sm italic text-slate-600 dark:text-slate-300">"${data.panda_advice}"</p>
                </div>
                <div class="space-y-4">
                    ${data.feedback.map(f => `
                        <div class="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border-l-4 ${f.status === 'correct' ? 'border-emerald-500' : 'border-red-500'}">
                            <p class="font-bold text-xs ${f.status === 'correct' ? 'text-emerald-600' : 'text-red-600'}">${f.status === 'correct' ? (window.I18N?.correct_status || 'CORRECTO') : (window.I18N?.incorrect_status || 'INCORRECTO')}</p>
                            <p class="text-sm">${f.explanation}</p>
                        </div>
                    `).join('')}
                </div>
                <button type="button" onclick="location.reload()" class="w-full py-4 border-2 border-slate-200 dark:border-slate-700 rounded-2xl font-bold">${window.I18N?.retry_btn || 'REINTENTAR'}</button>
            </div>
        `;
    }

    setState(state) {
        const workspace = document.getElementById('exam-workspace');
        ['initial', 'loading', 'exam', 'results'].forEach(s => {
            document.getElementById(`${s}-state`)?.classList.add('hidden');
            document.getElementById(`${s}-content`)?.classList.add('hidden');
        });
        
        // Adjust workspace alignment
        if (state === 'exam' || state === 'results') {
            workspace.classList.remove('items-center', 'justify-center', 'text-center');
            workspace.classList.add('items-start', 'text-left');
        } else {
            workspace.classList.add('items-center', 'justify-center', 'text-center');
            workspace.classList.remove('items-start', 'text-left');
        }

        document.getElementById(`${state}-${state === 'loading' || state === 'initial' ? 'state' : 'content'}`).classList.remove('hidden');
    }

    checkLimit() {
        return localStorage.getItem('last_exam_panda_date') !== new Date().toDateString();
    }

    notify(msg, type) {
        if (globalThis.toast) globalThis.toast(msg, type); else alert(msg);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    globalThis.labExams = new LabExams();
});
