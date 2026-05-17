/**
 * LabAnalysis - Chinese Sentence Analysis Controller
 */

class LabAnalysis {
    constructor() {
        this.init();
    }

    init() {
        if (globalThis.AuthService && !globalThis.AuthService.isLoggedIn()) {
            const currentUrl = encodeURIComponent(globalThis.location.pathname);
            const msg = window.I18N?.login_required || "Debes iniciar sesión para acceder al análisis.";
            this.notify(msg, "warning");
            const path = window.location.pathname;
            let langPrefix = "";
            if (path.startsWith("/en/")) langPrefix = "/en";
            else if (path.startsWith("/tr/")) langPrefix = "/tr";
            setTimeout(() => {
                globalThis.location.href = `${langPrefix}/login/?returnUrl=${currentUrl}`;
            }, 1500);
            return;
        }
        document.getElementById('run-analysis-btn').onclick = () => this.runAnalysis();
    }

    async runAnalysis() {
        const text = document.getElementById('analysis-input').value.trim();
        if (!text) {
            return this.notify(window.I18N?.input_required || "Por favor, ingresa una frase para analizar.", "warning");
        }

        if (!this.checkLimit()) {
            return this.notify(window.I18N?.limit_reached || "Ya has realizado tu análisis del día.", "warning");
        }

        this.setState('loading');

        try {
            const headers = globalThis.AuthService?.getAuthHeaders() || { 'Content-Type': 'application/json' };
            const response = await fetch(`/api/chat/lab/analyze-dna?text=${encodeURIComponent(text)}`, { headers });
            if (response.status === 401) {
                this.notify(window.I18N?.session_expired || "Tu sesión ha expirado. Inicia sesión de nuevo.", "error");
                const path = window.location.pathname;
                let langPrefix = "";
                if (path.startsWith("/en/")) langPrefix = "/en";
                else if (path.startsWith("/tr/")) langPrefix = "/tr";
                setTimeout(() => window.location.href = `${langPrefix}/login/`, 2000);
                return;
            }
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            this.renderResults(data);
            this.saveLimit();
        } catch (e) {
            console.error(e);
            this.notify(window.I18N?.generic_error || "Error en el análisis.", "error");
            this.setState('initial');
        }
    }

    renderResults(data) {
        this.setState('results');
        document.getElementById('res-meaning').textContent = data.overall_meaning;
        const resTitle = document.querySelector('#dna-results h4');
        if (resTitle && window.I18N?.overall_meaning_title) {
            resTitle.textContent = window.I18N.overall_meaning_title;
        }
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
