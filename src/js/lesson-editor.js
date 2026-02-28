// ========================================
// LESSON EDITOR - Visual Editor for Creating Beautiful Lessons
// ========================================

class LessonEditor {
    constructor(editorId) {
        this.editor = document.getElementById(editorId);
        if (!this.editor) return;

        this.editor.contentEditable = true;
        this.editor.classList.add('editor-content');
        this.savedRange = null; // Store selection for modal operations
        this.setupToolbar();
        this.setupTableBuilder();
    }

    setupToolbar() {
        // Create Carousel Container (now standard flex/scroll)
        const carouselContainer = document.createElement('div');
        carouselContainer.className = 'w-full mb-4 border-b border-slate-200 dark:border-slate-700 pb-2';

        // Toolbar
        const toolbar = document.createElement('div');
        toolbar.className = 'flex gap-4 overflow-x-auto pb-2 scrollbar-none';
        toolbar.innerHTML = `
            <!-- Text Formatting -->
            <div class="flex gap-1 pr-4 border-r border-slate-200 dark:border-slate-700 shrink-0">
                <button type="button" class="p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors" data-command="bold" title="Negrita">
                    <i class="fas fa-bold"></i>
                </button>
                <button type="button" class="p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors" data-command="italic" title="Cursiva">
                    <i class="fas fa-italic"></i>
                </button>
                <button type="button" class="p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors" data-command="underline" title="Subrayado">
                    <i class="fas fa-underline"></i>
                </button>
            </div>

            <!-- Headings -->
            <div class="flex gap-1 pr-4 border-r border-slate-200 dark:border-slate-700 shrink-0">
                <button type="button" class="p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors font-bold text-sm" data-command="h2" title="TÃ­tulo Grande">
                    H2
                </button>
                <button type="button" class="p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors font-bold text-xs" data-command="h3" title="TÃ­tulo Mediano">
                    H3
                </button>
            </div>

            <!-- Lists -->
            <div class="flex gap-1 pr-4 border-r border-slate-200 dark:border-slate-700 shrink-0">
                <button type="button" class="p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors" data-command="insertUnorderedList" title="Lista">
                    <i class="fas fa-list-ul"></i>
                </button>
                <button type="button" class="p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors" data-command="insertOrderedList" title="Lista Numerada">
                    <i class="fas fa-list-ol"></i>
                </button>
            </div>

            <!-- Components -->
            <div class="flex gap-1 shrink-0">
                <button type="button" class="p-2 px-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded transition-colors flex items-center gap-2 text-sm font-semibold" data-action="pronounce" title="Agregar Sonido (Pronunciación)">
                    <i class="fas fa-volume-high"></i> <span class="hidden sm:inline">Sonido</span>
                </button>
                <div class="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                <button type="button" class="p-2 px-3 text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors flex items-center gap-2 text-sm" data-action="table" title="Insertar Tabla">
                    <i class="fas fa-table"></i> <span class="hidden sm:inline">Tabla</span>
                </button>
                <button type="button" class="p-2 px-3 text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors flex items-center gap-2 text-sm" data-action="highlight" title="Caja de Resaltado">
                    <i class="fas fa-highlighter"></i> <span class="hidden sm:inline">Resaltar</span>
                </button>
                <button type="button" class="p-2 px-3 text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors flex items-center gap-2 text-sm" data-action="tip" title="Consejo">
                    <i class="fas fa-lightbulb"></i> <span class="hidden sm:inline">Tip</span>
                </button>
                <button type="button" class="p-2 px-3 text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors flex items-center gap-2 text-sm" data-action="example" title="Ejemplo">
                    <i class="fas fa-code"></i> <span class="hidden sm:inline">Ejemplo</span>
                </button>
            </div>
        `;

        carouselContainer.appendChild(toolbar);

        this.editor.parentNode.insertBefore(carouselContainer, this.editor);

        // Add event listeners
        toolbar.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const command = btn.dataset.command;
                const action = btn.dataset.action;

                if (command) {
                    this.execCommand(command);
                } else if (action) {
                    this.insertComponent(action);
                }
            });
        });

        // Setup component deletion (for mobile/click)
        this.setupComponentControls();
    }

    setupComponentControls() {
        // Create floating delete button
        this.deleteBtn = document.createElement('button');
        // Tailwind classes for delete button
        this.deleteBtn.className = 'fixed z-50 bg-red-500 text-white px-3 py-1 rounded-full text-sm shadow-lg flex items-center gap-2 hover:bg-red-600 transition-colors animate-in fade-in hidden';
        this.deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Eliminar';
        document.body.appendChild(this.deleteBtn);

        let activeComponent = null;

        // Handle clicks on editor
        this.editor.addEventListener('click', (e) => {
            // Updated selector to look for Tailwind classes
            const component = e.target.closest('[class*="border-l-4"], table');

            if (component) {
                activeComponent = component;
                this.showDeleteButton(component);
            } else {
                this.hideDeleteButton();
                activeComponent = null;
            }
        });

        // Handle delete action
        this.deleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (activeComponent) {
                activeComponent.remove();
                this.hideDeleteButton();
                activeComponent = null;
            }
        });

        // Hide on scroll or resize
        globalThis.addEventListener('scroll', () => this.hideDeleteButton(), true);
        globalThis.addEventListener('resize', () => this.hideDeleteButton());
    }

    showDeleteButton(element) {
        const rect = element.getBoundingClientRect();
        this.deleteBtn.style.display = 'flex';
        this.deleteBtn.style.top = `${rect.top - 40}px`;
        this.deleteBtn.style.left = `${rect.left}px`;
    }

    hideDeleteButton() {
        this.deleteBtn.style.display = 'none';
    }

    execCommand(command) {
        if (command === 'h2' || command === 'h3') {
            document.execCommand('formatBlock', false, command);
        } else {
            document.execCommand(command, false, null);
        }
        this.editor.focus();
    }

    insertComponent(type) {
        this.editor.focus(); // Ensure editor has focus first

        let selection = globalThis.getSelection();
        if (selection.rangeCount === 0) {
            // If still no range, create one at the end
            const range = document.createRange();
            range.selectNodeContents(this.editor);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        }

        const range = selection.getRangeAt(0);

        let component;
        switch (type) {
            case 'table':
                this.showTableBuilder();
                return;
            case 'pronounce':
                this.wrapWithPronunciation();
                return; // Return early as we handled it inline
            case 'highlight':
                component = this.createHighlightBox();
                break;
            case 'tip':
                component = this.createTipBox();
                break;
            case 'example':
                component = this.createExampleBox();
                break;
        }

        if (component) {
            range.deleteContents();
            range.insertNode(component);

            // Move cursor after component
            range.setStartAfter(component);
            range.setEndAfter(component);
            selection.removeAllRanges();
            selection.addRange(range);

            this.editor.focus();
        }
    }

    createHighlightBox() {
        const div = document.createElement('div');
        div.className = 'my-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-lg';
        div.innerHTML = `
            <strong class="block text-red-600 dark:text-red-400 mb-2">Punto Importante:</strong>
            <p class="m-0">Escribe aqui­ el contenido destacado...</p>
        `;
        return div;
    }

    createTipBox() {
        const div = document.createElement('div');
        div.className = 'my-6 p-4 bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 rounded-r-lg';
        div.innerHTML = `
            <div>
                <strong class="block text-orange-600 dark:text-orange-400 mb-2">Consejo:</strong>
                <p class="m-0">Escribe aqui tu consejo util...</p>
            </div>
        `;
        return div;
    }

    createExampleBox() {
        const div = document.createElement('div');
        div.className = 'my-6 p-4 bg-slate-50 dark:bg-slate-700/50 border-l-4 border-slate-500 rounded-r-lg';
        div.innerHTML = `
            <strong class="block text-slate-700 dark:text-slate-300 mb-2">Ejemplo:</strong>
            <p class="m-0">Ben <code class="bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-600 text-red-500">okula</code> gidiyorum - Yo voy <code class="bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-600 text-red-500">a la escuela</code></p>
        `;
        return div;
    }

    wrapWithPronunciation() {
        const selection = globalThis.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);

        // Check if selection contains or is within a pronunciation span
        const container = range.commonAncestorContainer;
        const parentElement = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
        const pronounceSpan = parentElement.closest('.pronounce-me');

        if (pronounceSpan) {
            // REMOVE pronunciation: unwrap the span
            const text = pronounceSpan.textContent;
            const textNode = document.createTextNode(text);
            pronounceSpan.parentNode.replaceChild(textNode, pronounceSpan);

            // Reset selection
            selection.removeAllRanges();
            return;
        }

        // ADD pronunciation: wrap text
        const text = range.toString();

        if (!text.trim()) {
            alert("Selecciona primero el texto en chino para agregar sonido.");
            return;
        }

        const span = document.createElement('strong');
        span.className = 'pronounce-me font-bold text-white bg-white/10 rounded px-0.5';
        span.textContent = text;

        range.deleteContents();
        range.insertNode(span);

        // Reset selection
        selection.removeAllRanges();
    }

    setupTableBuilder() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm hidden';
        modal.id = 'tableBuilderModal';
        modal.innerHTML = `
            <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-200">
                <h3 class="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <i class="fas fa-table text-red-600 dark:text-red-400"></i> Crear Tabla
                </h3>
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-sm font-semibold mb-1 text-slate-600 dark:text-slate-400">Filas:</label>
                        <input type="number" id="tableRows" min="2" max="15" value="3" 
                               class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:ring-2 focus:ring-red-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold mb-1 text-slate-600 dark:text-slate-400">Columnas:</label>
                        <input type="number" id="tableCols" min="2" max="15" value="2"
                               class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:ring-2 focus:ring-red-500 outline-none">
                    </div>
                </div>
                <div class="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 max-h-48 overflow-auto mb-6" id="tablePreview"></div>
                <div class="flex justify-end gap-3">
                    <button class="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" id="cancelTableBtn">
                        Cancelar
                    </button>
                    <button class="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-md" id="insertTableBtn">
                        Insertar Tabla
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Event listeners
        const rowsInput = modal.querySelector('#tableRows');
        const colsInput = modal.querySelector('#tableCols');
        const preview = modal.querySelector('#tablePreview');

        const updatePreview = () => {
            let rows = Number.parseInt(rowsInput.value, 10) || 2;
            let cols = Number.parseInt(colsInput.value, 10) || 2;

            // Immediate visual feedback/clamping
            if (rows > 15) { rowsInput.value = 15; rows = 15; }
            if (cols > 15) { colsInput.value = 15; cols = 15; }

            preview.innerHTML = this.generateTableHTML(rows, cols, true);
        };

        rowsInput.addEventListener('input', updatePreview);
        colsInput.addEventListener('input', updatePreview);

        modal.querySelector('#insertTableBtn').addEventListener('click', () => {
            let rows = Number.parseInt(rowsInput.value, 10) || 2;
            let cols = Number.parseInt(colsInput.value, 10) || 2;

            // Enforce limits
            if (rows > 15) rows = 15;
            if (cols > 15) cols = 15;

            // Get data from preview inputs
            const tableData = this.getTableData(rows, cols);
            this.insertTable(tableData);
            this.closeTableBuilder();
        });

        modal.querySelector('#cancelTableBtn').addEventListener('click', () => {
            this.closeTableBuilder();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeTableBuilder();
            }
        });
    }

    showTableBuilder() {
        // Save current selection before opening modal
        this.editor.focus();
        const selection = globalThis.getSelection();
        if (selection.rangeCount > 0) {
            this.savedRange = selection.getRangeAt(0).cloneRange();
        } else {
            // Create fallback range at end
            this.savedRange = document.createRange();
            this.savedRange.selectNodeContents(this.editor);
            this.savedRange.collapse(false);
        }

        const modal = document.getElementById('tableBuilderModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');

            // Initialize preview
            const preview = modal.querySelector('#tablePreview');
            if (preview) {
                preview.innerHTML = this.generateTableHTML(3, 2, true);
            }
        }
    }

    closeTableBuilder() {
        const modal = document.getElementById('tableBuilderModal');
        if (modal) {
            modal.classList.remove('flex');
            modal.classList.add('hidden');

            // Reset inputs
            const rowsInput = modal.querySelector('#tableRows');
            const colsInput = modal.querySelector('#tableCols');
            if (rowsInput) rowsInput.value = '3';
            if (colsInput) colsInput.value = '2';

            // Clear preview
            const preview = modal.querySelector('#tablePreview');
            if (preview) preview.innerHTML = '';
        }
    }

    generateTableHTML(rows, cols, editable = false) {
        // Validate inputs to prevent RangeError
        rows = Number.parseInt(rows, 10) || 2;
        cols = Number.parseInt(cols, 10) || 2;
        if (rows < 1) rows = 1;
        if (cols < 1) cols = 1;
        if (rows > 15) rows = 15; // Safety limit
        if (cols > 15) cols = 15; // Safety limit

        let html = '<table class="w-full border-collapse my-4 table-auto">';
        html += '<thead><tr class="bg-red-600 text-white">';

        // Headers
        for (let c = 0; c < cols; c++) {
            if (editable) {
                html += `<th class="p-2 border border-red-700"><input type="text" placeholder="Encabezado ${c + 1}" data-row="0" data-col="${c}" class="w-full bg-red-700 text-white p-1 rounded outline-none placeholder-red-300"></th>`;
            } else {
                html += `<th class="p-3 border border-red-700 text-left font-semibold">Encabezado ${c + 1}</th>`;
            }
        }
        html += '</tr></thead><tbody>';

        // Body rows
        for (let r = 1; r < rows; r++) {
            html += `<tr class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">`;
            for (let c = 0; c < cols; c++) {
                if (editable) {
                    html += `<td class="p-2 border border-slate-200 dark:border-slate-700"><input type="text" placeholder="Dato" data-row="${r}" data-col="${c}" class="w-full bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white p-1 rounded border border-slate-300 dark:border-slate-600 outline-none"></td>`;
                } else {
                    html += `<td class="p-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">Dato</td>`;
                }
            }
            html += '</tr>';
        }

        html += '</tbody></table>';
        return html;
    }

    getTableData(rows, cols) {
        const modal = document.getElementById('tableBuilderModal');
        // Updated selector to match new inputs
        // Inputs are inside th/td, so we can check data attributes
        const data = [];

        for (let r = 0; r < rows; r++) {
            data[r] = [];
            for (let c = 0; c < cols; c++) {
                const input = modal.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
                data[r][c] = input ? input.value || `Dato ${r},${c}` : '';
            }
        }

        return data;
    }

    insertTable(data) {
        const rows = data.length;
        const cols = data[0].length;

        let html = '<table class="w-full border-collapse my-4 rounded-lg overflow-hidden shadow-sm table-auto">';
        html += '<thead><tr class="bg-red-600 text-white">';

        // Headers
        for (let c = 0; c < cols; c++) {
            html += `<th class="p-3 border border-red-500 text-left font-semibold">${data[0][c]}</th>`;
        }
        html += '</tr></thead><tbody>';

        // Body
        for (let r = 1; r < rows; r++) {
            html += `<tr class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">`;
            for (let c = 0; c < cols; c++) {
                html += `<td class="p-3 border-r border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 last:border-r-0">${data[r][c]}</td>`;
            }
            html += '</tr>';
        }
        html += '</tbody></table><p><br></p>';

        // Restore selection and insert
        this.editor.focus();
        const selection = globalThis.getSelection();
        selection.removeAllRanges();

        if (this.savedRange) {
            selection.addRange(this.savedRange);
        } else {
            // Fallback if somehow lost
            const range = document.createRange();
            range.selectNodeContents(this.editor);
            range.collapse(false);
            selection.addRange(range);
        }

        // Insert using modern DOM API (execCommand insertHTML is deprecated)
        const range = selection.getRangeAt(0);
        const fragment = range.createContextualFragment(html);
        range.deleteContents();
        range.insertNode(fragment);
        range.collapse(false);
    }

    getContent() {
        return this.editor.innerHTML;
    }

    setContent(html) {
        this.editor.innerHTML = html;
    }

    clear() {
        this.editor.innerHTML = '';
    }
}

// Make globally available
globalThis.LessonEditor = LessonEditor;

console.log('? Lesson Editor loaded (Tailwind Version)');
