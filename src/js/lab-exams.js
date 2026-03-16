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
        this.setupEventListeners();
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
    }

    async handleGenerate() {
        if (!this.checkLimit()) {
            return this.notify("Vuelve mañana para tu siguiente examen diario.", "warning");
        }

        this.setState('loading');
        
        try {
            const level = document.querySelector('.level-btn.active')?.dataset.level || 'HSK 1';
            const mode = document.querySelector('.mode-btn.border-red-500')?.dataset.mode || 'classic';
            const prompt = document.getElementById('exam-prompt').value;
            const isPublic = document.getElementById('public-toggle').checked;

            const headers = globalThis.AuthService?.getAuthHeaders() || { 'Content-Type': 'application/json' };
            const response = await fetch('/api/chat/lab/generate-exam', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ level, mode, prompt, is_public: isPublic })
            });

            const data = await response.json();
            this.currentExam = data;
            this.renderExam();
            localStorage.setItem('last_exam_panda_date', new Date().toDateString());
        } catch (e) {
            this.notify("Fallo en generación.", "error");
            this.setState('initial');
        }
    }

    renderExam() {
        this.setState('exam');
        const container = document.getElementById('exam-content');
        container.innerHTML = `<h2 class="text-2xl font-black mb-8">${this.currentExam.title}</h2>`;
        
        const template = document.getElementById('question-template');
        this.currentExam.questions.forEach((q, idx) => {
            const clone = template.content.cloneNode(true);
            clone.querySelector('.q-number').textContent = idx + 1;
            clone.querySelector('.q-text').textContent = q.question;
            
            const optionsBox = clone.querySelector('.q-options');
            const inputBox = clone.querySelector('.q-input-container');

            if (q.type === 'multiple_choice') {
                q.options.forEach(opt => {
                    const b = document.createElement('button');
                    b.type = 'button';
                    b.className = 'p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-left hover:bg-red-500 hover:text-white transition-all text-sm';
                    b.textContent = opt;
                    b.onclick = () => {
                        optionsBox.querySelectorAll('button').forEach(btn => btn.classList.remove('bg-red-600', 'text-white'));
                        b.classList.add('bg-red-600', 'text-white');
                        this.userAnswers[q.id] = opt;
                    };
                    optionsBox.appendChild(b);
                });
            } else {
                optionsBox.classList.add('hidden');
                inputBox.classList.remove('hidden');
                inputBox.querySelector('input').onchange = (e) => this.userAnswers[q.id] = e.target.value;
            }
            container.appendChild(clone);
        });

        const finish = document.createElement('button');
        finish.type = 'button';
        finish.className = 'mt-8 w-full py-4 bg-emerald-600 text-white font-black rounded-2xl';
        finish.textContent = 'CALIFICAR';
        finish.onclick = () => this.gradeExam();
        container.appendChild(finish);
    }

    async gradeExam() {
        this.setState('loading');
        try {
            const headers = globalThis.AuthService?.getAuthHeaders() || { 'Content-Type': 'application/json' };
            const response = await fetch('/api/chat/lab/grade-exam', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ answers: this.userAnswers, original_exam: this.currentExam })
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
                    <p class="font-bold text-slate-800 dark:text-slate-200">Resultado Final</p>
                </div>
                <div class="space-y-4">
                    ${data.feedback.map(f => `
                        <div class="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border-l-4 ${f.status === 'correct' ? 'border-emerald-500' : 'border-red-500'}">
                            <p class="font-bold text-xs ${f.status === 'correct' ? 'text-emerald-600' : 'text-red-600'}">${f.status.toUpperCase()}</p>
                            <p class="text-sm">${f.explanation}</p>
                        </div>
                    `).join('')}
                </div>
                <button type="button" onclick="location.reload()" class="w-full py-4 border-2 border-slate-200 dark:border-slate-700 rounded-2xl font-bold">REINTENTAR</button>
            </div>
        `;
    }

    setState(state) {
        ['initial', 'loading', 'exam', 'results'].forEach(s => {
            document.getElementById(`${s}-state`)?.classList.add('hidden');
            document.getElementById(`${s}-content`)?.classList.add('hidden');
        });
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
