/**
 * LabDNA - Chinese Character DNA Controller
 */

class LabDNA {
    constructor() {
        this.init();
    }

    init() {
        document.getElementById('run-dna-btn').onclick = () => this.runAnalysis();
    }

    async runAnalysis() {
        const text = document.getElementById('dna-input').value.trim();
        if (!text) return;

        if (!this.checkLimit()) {
            return this.notify("Ya has realizado tu bio-análisis del día.", "warning");
        }

        this.setState('loading');

        try {
            const headers = globalThis.AuthService?.getAuthHeaders() || {};
            const response = await fetch(`/api/chat/lab/analyze-dna?text=${encodeURIComponent(text)}`, { headers });
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

        const container = document.getElementById('res-analysis');
        container.innerHTML = '';
        
        const template = document.getElementById('dna-card-template');
        
        (data.analysis || []).forEach(item => {
            const clone = template.content.cloneNode(true);
            clone.querySelector('.char-display').textContent = item.char;
            clone.querySelector('.radical-val').textContent = item.radical;
            clone.querySelector('.radical-meaning').textContent = item.radical_meaning;
            clone.querySelector('.explanation-text').textContent = item.explanation;
            container.appendChild(clone);
        });

        document.getElementById('dna-results').scrollIntoView({ behavior: 'smooth' });
    }

    setState(state) {
        document.getElementById('dna-loading').classList.add('hidden');
        document.getElementById('dna-results').classList.add('hidden');

        if (state === 'loading') document.getElementById('dna-loading').classList.remove('hidden');
        else if (state === 'results') document.getElementById('dna-results').classList.remove('hidden');
    }

    checkLimit() {
        return localStorage.getItem('last_dna_date') !== new Date().toDateString();
    }

    saveLimit() {
        localStorage.setItem('last_dna_date', new Date().toDateString());
    }

    notify(msg, type) {
        if (globalThis.toast) globalThis.toast(msg, type);
        else alert(msg);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    globalThis.labDna = new LabDNA();
});
