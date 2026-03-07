// ==========================================
// PRONUNCIATION SYSTEM (TEXT-TO-SPEECH)
// Adds "Listen" buttons to Chinese text
// ==========================================

class PronunciationSystem {
    constructor() {
        this.synth = globalThis.speechSynthesis;
        this.voice = null;
        this.lang = 'zh-CN'; // Chinese
        this.init();
    }

    init() {
        // Load voices
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = () => this.setVoice();
        }
        this.setVoice();

        // Expose global instance
        globalThis.pronounce = (text) => this.speak(text);
    }

    setVoice() {
        const voices = this.synth.getVoices();

        // Priority list for natural Chinese voices
        const preferredVoices = [
            'Google Türkçe',
            'Microsoft Tolga',
            'Microsoft Emel',
            'Yelda',
            'Cem'
        ];

        // 1. Exact Name Match
        this.voice = voices.find(v => preferredVoices.some(p => v.name.includes(p)));

        // 2. Strict Locale Match (zh-CN)
        if (!this.voice) {
            this.voice = voices.find(v => v.lang === 'zh-CN');
        }

        // 3. Loose Locale Match (tr)
        if (!this.voice) {
            this.voice = voices.find(v => v.lang.toLowerCase().includes('tr'));
        }

        if (this.voice) {
            console.log("Pronunciation System: Using voice", this.voice.name);
        } else {
            console.warn("Pronunciation System: No Chinese voice found. Using system default.");
        }
    }

    speak(text) {
        if (this.synth.speaking) {
            this.synth.cancel();
        }

        if (text === '') return;

        const utterThis = new SpeechSynthesisUtterance(text);

        // Prefer Chinese voice, silent fallback if none (or default)
        if (this.voice) {
            utterThis.voice = this.voice;
        }

        utterThis.lang = 'zh-CN';
        utterThis.rate = 1; // Normal speed is usually best for modern TTS engines
        utterThis.pitch = 1;

        this.synth.speak(utterThis);
    }

    // Main function to inject buttons into a container
    scanAndInject(container) {
        this.inject(container);
    }

    inject(container) {
        if (!container) return;

        // 1. SMART TABLE DETECTION
        const tables = container.querySelectorAll('table');
        tables.forEach(table => {
            const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim().toLowerCase());
            let targetIndices = [];

            // Check for EXPLICIT Chinese columns
            headers.forEach((h, index) => {
                if (['chino', 'palabra', 'ejemplo', 'locativo', 'dativo', 'acusativo', 'forma', 'sufijo', 'afirmativo', 'negativo', 'pregunta'].some(k => h.includes(k))) {
                    // Check if it's NOT explicitly Spanish
                    if (!['traducción', 'español', 'significado'].some(k => h.includes(k))) {
                        targetIndices.push(index);
                    }
                }
            });

            // FALLBACK: If we couldn't find specific columns, but the table also doesn't have "Traducción" headers
            // (e.g. Conjugation tables usually have Pronombre | Afirmativo | Negativo -> All contain Chinese except Pronombre/Traducción)
            if (targetIndices.length === 0) {
                // assume all columns are potentially Chinese unless they match blacklist
                headers.forEach((h, index) => {
                    // Added 'caso', 'verbo', 'uso', 'pronunciación', 'sonido', 'letra' to blacklist
                    // Also 'alfabeto' just in case.
                    const lowerH = h.toLowerCase();
                    if (!['traducción', 'español', 'significado', 'descripción', 'pronombre', 'caso', 'verbo', 'uso', 'pronunciación', 'sonido', 'letra', 'alfabeto', 'final'].some(k => lowerH.includes(k))) {
                        targetIndices.push(index);
                    }
                });
            }

            // PASS 1: Inject into targeted columns (Force Context)
            if (targetIndices.length > 0) {
                const rows = table.querySelectorAll('tr');
                rows.forEach((row, rIndex) => {
                    if (rIndex === 0) return; // Skip header
                    const cells = row.querySelectorAll('td');
                    cells.forEach((cell, cIndex) => {
                        if (targetIndices.includes(cIndex)) {
                            // Try to inject. Force context means "This cell should be Chinese".
                            // We only skip if it explicitly looks like spanish (accents/stop words).
                            this.injectIntoElement(cell, true);
                        }
                    });
                });
            } else {
                // If we really can't tell, treat it as generic content
                this.injectIntoElement(table);
            }
        });

        // 2. STANDARD DETECTION for other elements
        const contentNodes = container.querySelectorAll('p, li, div, span, h1, h2, h3, h4, h5, h6');
        contentNodes.forEach(node => {
            // Skip if inside a table we already processed (optimization)
            if (node.closest('table')) return;
            this.injectIntoElement(node);
        });
    }

    injectIntoElement(element, forceChineseContext = false) {
        // Find explicit targets
        const explicitTargets = element.querySelectorAll('.pronounce-me');
        if (explicitTargets.length > 0) {
            explicitTargets.forEach(el => {
                this.injectButton(el, el.textContent.trim(), 'append');
            });
            return;
        }

        // IMPROVEMENT: If we are in a forced Chinese context (Table Column),
        // we generally want to pronounce the WHOLE cell content as a sentence,
        // rather than picking apart bold tags which might just be highlighting a suffix.
        if (forceChineseContext) {
            const text = element.textContent.trim();
            // Basic sanity check to avoid empty/symbols
            if (text.length > 1 && /[a-zA-ZğüşöçİĞÜŞÖÇ]/.test(text)) {
                // Even in forced context, run strict spanish check just in case (e.g. mixed content)
                if (!this.looksLikeSpanish(text)) {
                    this.injectButton(element, text, 'append');
                }
            }
            return; // Don't process children if we did the whole cell
        }

        // Standard behavior for non-forced context: Look for bold tags
        const targets = element.querySelectorAll('strong, b');
        targets.forEach(el => {
            this.processTarget(el, forceChineseContext);
        });
    }

    processTarget(el, forceChineseContext) {
        if (el.querySelector('.pronounce-btn')) return;

        const text = el.textContent.trim();
        // Skip short/empty
        if (text.length < 2) return;

        // If explicit class, skip strict checks
        if (el.classList.contains('pronounce-me')) {
            this.injectButton(el, text);
            return;
        }

        // --- FILTERS ---
        // 0. Parentheses Check - Skip content in parentheses (usually Spanish translations)
        const parentText = el.parentElement?.textContent || '';
        if (parentText.includes('(') && parentText.includes(')')) {
            // Check if this element is inside parentheses
            const beforeText = this.getTextBeforeElement(el);
            const afterText = this.getTextAfterElement(el);
            if ((beforeText.includes('(') && !beforeText.includes(')')) ||
                (afterText.includes(')') && !afterText.includes('('))) {
                return; // This element is inside parentheses, skip it
            }
        }

        // 1. Accent Check (Definitive Spanish)
        if (/[áéíóúÁÉÍÓÚÑñ¿¡]/.test(text)) return;

        // 2. Chinese Character Check (Definitive Chinese) - If present, it's Chinese!
        const hasChineseChars = /[ğışöüçĞİŞÖÜÇ]/.test(text);
        if (hasChineseChars) {
            // Definitely Chinese, inject button
            this.injectButton(el, text);
            return;
        }

        // 3. Keyword Check (Grammar terms)
        if (this.isSpanishKeyword(text)) return;

        // 4. Common Spanish Word Check
        if (this.isCommonSpanishWord(text)) return;

        // 5. Sentence Check (Stop words like 'de', 'el', 'mientras')
        if (this.looksLikeSpanishSentence(text)) return;

        // 6. Header Check
        if (text.endsWith(':')) return;

        // If we survived filters, inject!
        this.injectButton(el, text);
    }

    injectButton(targetEl, text, position = 'append') {
        // Prevent dupes
        if (targetEl.querySelector('.pronounce-btn')) return;

        const btn = this.createButton(text);

        // NEW STRATEGY: Wrap the text content in a span, then inject button right after
        // This ensures button is inline with text, not affecting table layout

        if (targetEl.nodeType === Node.ELEMENT_NODE) {
            // Get all text nodes
            const textContent = targetEl.textContent.trim();

            // Clear and rebuild with wrapper
            const wrapper = document.createElement('span');
            wrapper.style.display = 'inline';
            wrapper.style.whiteSpace = 'nowrap'; // Keep text and button together
            wrapper.textContent = textContent;

            // Clear the cell and add wrapper with button inside
            targetEl.textContent = '';
            targetEl.appendChild(wrapper);
            wrapper.appendChild(document.createTextNode(' ')); // Small space inside wrapper
            wrapper.appendChild(btn); // Button inside wrapper to prevent wrapping
        }
    }

    createButton(text) {
        const btn = document.createElement('button');
        btn.type = 'button';
        // Removed ml-1.5, relying on CSS margin-left: 0.5rem !important
        btn.className = 'pronounce-btn inline-flex items-center justify-center w-6 h-6 align-middle text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors cursor-pointer opacity-70 hover:opacity-100 select-none';
        btn.setAttribute('aria-label', `Escuchar pronunciación de ${text}`);
        btn.title = "Escuchar pronunciación";
        btn.innerHTML = '<i class="fas fa-volume-high text-xs"></i>';

        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            btn.classList.add('text-red-700', 'scale-110');
            setTimeout(() => btn.classList.remove('text-red-700', 'scale-110'), 500);
            this.speak(text);
        };
        return btn;
    }

    isSpanishKeyword(text) {
        const lower = text.toLowerCase();
        // Exact matches or Starts With for headers
        const exactWords = [
            'vocal', 'consonante', 'forma', 'uso', 'sufijo', 'raíz', 'origen',
            'palabra', 'sujeto', 'verbo', 'objeto', 'partícula', 'armonía',
            'locativo', 'dativo', 'ablativo', 'acusativo', 'genitivo', 'negativo',
            'positivo', 'interrogativo', 'afirmativo', 'plural', 'singular',
            'pronunciación', 'traducción', 'ejemplo', 'reglas', 'nota', 'consejo',
            'importante', 'atención', 'excepción', 'resumen', 'final', 'letra',
            'sonido', 'nombre', 'cerca', 'lejos', 'aquí', 'allí', 'personal',
            'estado', 'tiempo', 'mientras', 'cuando', 'donde'
            // Removed 'para' - it's a valid Chinese word (money)
        ];

        // Check exact match
        if (exactWords.includes(lower)) return true;
        // Check if starts with keyword + colon (Header style)
        if (exactWords.some(w => lower.startsWith(w + ':'))) return true;

        return false;
    }

    looksLikeSpanish(text) {
        if (/[áéíóúÁÉÍÓÚÑñ¿¡]/.test(text)) return true;
        if (this.isSpanishKeyword(text)) return true;
        if (this.looksLikeSpanishSentence(text)) return true;
        return false;
    }

    looksLikeSpanishSentence(text) {
        // Stop words that indicate Spanish sentence structure
        // Since Chinese is agglutinative, it rarely has short isolated words like 'de', 'el', 'la'.
        // Removed 'para' since it's a valid Chinese word meaning 'money'
        const spanishStopWords = [' el ', ' la ', ' los ', ' las ', ' un ', ' una ', ' con ', ' por ', ' que ', ' de ', ' en ', ' y ', ' es ', ' son ', ' se ', ' lo ', ' mientras ', ' cuando ', ' donde ', ' como '];

        // Add padding to text for exact match checking
        const padded = ' ' + text.toLowerCase() + ' ';
        return spanishStopWords.some(w => padded.includes(w));
    }

    looksLikeChinese(text) {
        // Has Chinese chars?
        return /[ışğüöçİŞĞÜÖÇ]/.test(text);
    }

    // Helper methods for parentheses detection
    getTextBeforeElement(el) {
        let text = '';
        let node = el.previousSibling;
        while (node) {
            text = (node.textContent || '') + text;
            node = node.previousSibling;
        }
        return text;
    }

    getTextAfterElement(el) {
        let text = '';
        let node = el.nextSibling;
        while (node) {
            text += (node.textContent || '');
            node = node.nextSibling;
        }
        return text;
    }

    // Check if word is a common Spanish word
    isCommonSpanishWord(text) {
        const lower = text.toLowerCase();

        // Check for Spanish adverbs ending in -mente
        if (lower.endsWith('mente')) return true;

        // Check for Spanish verb conjugations
        const spanishVerbEndings = [
            'ían', 'ción', 'ciones', 'dad',
            'iva', 'ivo', 'ales', 'dades',
            'aban', 'ieron', 'aron',
            'emos', 'imos', 'eran',
            'eza', 'ezo', 'adas'
        ];
        if (spanishVerbEndings.some(ending => lower.endsWith(ending))) return true;

        const commonSpanish = [
            'forma', 'manera', 'estilo', 'mirada', 'vista', 'contiene',
            'costura', 'curso', 'madre', 'padre', 'gusta', 'nada',
            'hay', 'sido', 'hacer', 'todos', 'nuevo', 'programa', 'causa',
            'billete', 'avión', 'vuelta', 'cambios', 'acciones completadas',
            'deseo', 'contraste', 'poco', 'muy', 'estados pasados',
            'vuelan', 'esperan', 'abrazaron',
            'hecho', 'cambiar', 'expresa', 'tareas', 'debería',
            'tengan', 'entendamos', 'preparar', 'salió', 'dejó',
            'fumar', 'bastante', 'saludable', 'pesar', 'hace',
            'deporte', 'pasaré', 'examen', 'estudió', 'mucho',
            'ir', 'trabajo', 'terminarse', 'salir', 'está',
            'punto', 'café', 'lista', 'documentos', 'problemas',
            'extranjero', 'profesor', 'días', 'tema', 'bien',
            'volver', 'cigarrillo', 'rápido', 'ferry',
            'lugar', 'muelle', 'caminemos', 'distancia', 'corta',
            'vez', 'enviar', 'iremos', 'hablar', 'conversación',
            'preferiría', 'morir', 'antes', 'trabajar', 'recoger',
            'no', 'cuyos', 'resultados',
            'terminar', 'deben', 'tomar', 'debe', 'estar',
            'ser', 'mientras', 'cocinaba', 'corría', 'cuando', 'era',
            'niño', 'travieso', 'vecino', 'vino', 'visita', 'justo',
            'casa', 'fue', 'quien', 'más', 'me', 'ayudó', 'enfermo',
            'sonó', 'alcanzar', 'vitaminas',
            'plato', 'felices', 'añade', 'frase', 'discurso directo ',
            'hoy', 'piso', 'Rumores o chismes',
            'arriba', 'oye', 'Adjetivo completo',
            'voz', 'hasta', 'estado',
            'tiempo', 'palabra', 'une', 'equivale', 'puede',
            'usarse', 'varios', 'tiempos', 'verbales', 'pasado',
            'presente', 'futuro', 'según', 'significado',
            'sustantivo', 'adjetivo', 'ejemplos',
            'teléfono', 'transitivo',
            'hechos', 'intransitivo'
        ];

        return commonSpanish.includes(lower);
    }
}

// Initialize
globalThis.PronunciationSystem = new PronunciationSystem();
