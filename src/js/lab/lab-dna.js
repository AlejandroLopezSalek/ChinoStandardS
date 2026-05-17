/**
 * LabDNA - Chinese Character DNA Controller
 */

class LabDNA {
    constructor() {
        this.init();
    }

    init() {
        if (globalThis.AuthService && !globalThis.AuthService.isLoggedIn()) {
            const currentUrl = encodeURIComponent(globalThis.location.pathname);
            const msg = window.I18N?.login_required || "Debes iniciar sesión para acceder al bio-análisis.";
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
        document.getElementById('run-dna-btn').onclick = () => this.runAnalysis();
    }

    async runAnalysis() {
        const text = document.getElementById('dna-input').value.trim();
        if (!text) {
            return this.notify(window.I18N?.char_required || "Por favor, ingresa un carácter chino.", "warning");
        }

        if (!this.checkLimit()) {
            return this.notify(window.I18N?.limit_reached || "Ya has realizado tu bio-análisis del día.", "warning");
        }

        this.setState('loading');

        try {
            const headers = globalThis.AuthService?.getAuthHeaders() || {};
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

    /**
     * Browser Native TTS playback
     */
    async playTTS(text) {
        if (!text) return;
        try {
            if (!('speechSynthesis' in window)) throw new Error('Not supported');
            window.speechSynthesis.cancel();
            const ut = new SpeechSynthesisUtterance(text);
            const voices = window.speechSynthesis.getVoices();
            const zh = voices.find(v => v.lang.includes('zh-CN')) || voices.find(v => v.lang.includes('zh'));
            if (zh) ut.voice = zh;
            ut.lang = 'zh-CN';
            ut.rate = 0.8;
            window.speechSynthesis.speak(ut);
        } catch (e) {
            console.warn('TTS failed:', e);
            new Audio(`/api/chat/tts?text=${encodeURIComponent(text)}`).play().catch(() => {});
        }
    }

    notify(msg, type) {
        if (globalThis.toast) globalThis.toast(msg, type);
        else alert(msg);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    globalThis.labDna = new LabDNA();
});
