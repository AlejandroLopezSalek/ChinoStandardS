/**
 * LabAnalysis - Chinese Sentence Analysis Controller
 */

class LabAnalysis {
    constructor() {
        this.init();
    }

    init() {
        document.getElementById('run-analysis-btn').onclick = () => this.runAnalysis();
    }

    async runAnalysis() {
        const text = document.getElementById('analysis-input').value.trim();
        if (!text) return;

        if (!this.checkLimit()) {
            return this.notify("Ya has realizado tu análisis del día.", "warning");
        }

        this.setState('loading');

        try {
            const response = await fetch(`/api/chat/lab/analyze-dna?text=${encodeURIComponent(text)}`);
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            this.renderResults(data);
            this.saveLimit();
        } catch (e) {
            console.error(e);
            this.notify("Error en el análisis.", "error");
            this.setState('initial');
        }
    }

    renderResults(data) {
        this.setState('results');
        document.getElementById('res-meaning').textContent = data.overall_meaning;
        document.getElementById('res-culture').innerHTML = globalThis.marked ? globalThis.marked.parse(data.explanation || "") : data.explanation;

        const breakdown = document.getElementById('res-breakdown');
        breakdown.innerHTML = '';
        const template = document.getElementById('word-item-template');

        (data.analysis || []).forEach(item => {
            const clone = template.content.cloneNode(true);
            clone.querySelector('.text-3xl').textContent = item.char || item.text;
            clone.querySelector('.role-label').textContent = item.radical || item.type || 'Sintaxis';
            clone.querySelector('.meaning-text').textContent = item.explanation || item.meaning;
            clone.querySelector('.note-text').textContent = item.note || '';
            breakdown.appendChild(clone);
        });
    }

    setState(state) {
        document.getElementById('analysis-loading').classList.add('hidden');
        document.getElementById('analysis-results').classList.add('hidden');
        if (state === 'loading') document.getElementById('analysis-loading').classList.remove('hidden');
        else if (state === 'results') document.getElementById('analysis-results').classList.remove('hidden');
    }

    checkLimit() {
        return localStorage.getItem('last_analysis_panda_date') !== new Date().toDateString();
    }

    saveLimit() {
        localStorage.setItem('last_analysis_panda_date', new Date().toDateString());
    }

    notify(msg, type) {
        if (globalThis.toast) globalThis.toast(msg, type); else alert(msg);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    globalThis.labAnalysis = new LabAnalysis();
});
