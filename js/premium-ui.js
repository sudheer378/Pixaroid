/**
 * Pixaroid Premium UI v3.0
 * Canonical premium UI implementation for legacy standalone and Pro tools.
 * Supports both the constructor API used by ToolControllerPro and the
 * factory API used by the standalone ToolController.
 */
'use strict';

class PremiumDropzone {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        if (!this.container) throw new Error('Dropzone container not found');
        this.options = { accept: 'image/*', multiple: true, maxSize: 100 * 1024 * 1024, maxFiles: 50, ...options };
        this.files = [];
        this.onFileSelect = typeof options.onFileSelect === 'function' ? options.onFileSelect : () => {};
        this.onError = typeof options.onError === 'function' ? options.onError : () => {};
        this._bound = [];
        this.init();
    }
    on(target, event, handler, options) { target.addEventListener(event, handler, options); this._bound.push(() => target.removeEventListener(event, handler, options)); }
    init() {
        this.container.classList.add('premium-dropzone');
        this.container.innerHTML = `<div class="premium-dz-content"><div class="premium-dz-icon" aria-hidden="true">↥</div><strong>${this.options.multiple ? 'Drag & drop files here' : 'Drag & drop a file here'}</strong><span>or browse to upload</span></div><input class="premium-file-input" type="file" ${this.options.multiple ? 'multiple' : ''} accept="${String(this.options.accept).replace(/"/g, '&quot;')}" hidden>`;
        this.input = this.container.querySelector('.premium-file-input');
        const open = e => { e.preventDefault(); this.input?.click(); };
        this.on(this.container, 'click', open);
        this.on(this.input, 'change', e => { this.handleFiles(e.target.files); e.target.value = ''; });
        ['dragenter', 'dragover'].forEach(name => this.on(this.container, name, e => { e.preventDefault(); this.container.classList.add('highlight'); }));
        ['dragleave', 'drop'].forEach(name => this.on(this.container, name, e => { e.preventDefault(); this.container.classList.remove('highlight'); }));
        this.on(this.container, 'drop', e => this.handleFiles(e.dataTransfer?.files));
    }
    handleFiles(fileList) {
        const incoming = Array.from(fileList || []);
        const valid = [];
        incoming.forEach(file => {
            if (!(file instanceof Blob) || file.size === 0) return this.onError({ type: 'INVALID_FILE', message: `${file?.name || 'File'} is empty or invalid`, file: file?.name });
            if (file.size > this.options.maxSize) return this.onError({ type: 'SIZE_EXCEEDED', message: `${file.name} exceeds the maximum size`, file: file.name });
            if (!this.options.multiple && valid.length) return;
            valid.push(file);
        });
        this.files = this.options.multiple ? [...this.files, ...valid].slice(0, this.options.maxFiles) : valid.slice(0, 1);
        if (this.files.length) this.onFileSelect(this.getFiles());
    }
    getFiles() { return [...this.files]; }
    clearFiles() { this.files = []; this.onFileSelect([]); }
    destroy() { this._bound.forEach(off => off()); this._bound = []; this.files = []; this.container.replaceChildren(); }
}

class PremiumFileList {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        if (!this.container) throw new Error('FileList container not found');
        this.options = { ...options };
        this.files = [];
        this.render();
    }
    setFiles(files) { this.files = Array.from(files || []); this.render(); }
    getFiles() { return [...this.files]; }
    render() {
        this.container.replaceChildren();
        const list = document.createElement('div'); list.className = 'premium-file-items';
        this.files.forEach((file, index) => {
            const row = document.createElement('div'); row.className = 'premium-file-item'; row.dataset.index = index;
            const name = document.createElement('span'); name.className = 'file-name'; name.textContent = file.name || 'file';
            const size = document.createElement('span'); size.className = 'file-size'; size.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
            const status = document.createElement('span'); status.className = 'file-status'; status.textContent = 'Pending';
            row.append(name, size, status); list.appendChild(row);
        });
        this.container.appendChild(list);
    }
    updateFileStatus(index, status, progressOrMessage = null, result = null) {
        const row = this.container.querySelectorAll('.premium-file-item')[index];
        if (!row) return;
        const statusEl = row.querySelector('.file-status');
        if (statusEl) {
            const message = typeof progressOrMessage === 'string' ? progressOrMessage : (result?.reduction ? `${status} — ${result.reduction}% smaller` : status);
            statusEl.textContent = message || status;
            statusEl.dataset.status = String(status).toLowerCase();
        }
    }
    clear() { this.files = []; this.render(); }
    destroy() { this.files = []; this.container.replaceChildren(); }
}

class PremiumProgressBar {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        if (!this.container) throw new Error('ProgressBar container not found');
        this.container.innerHTML = '<div class="premium-progress-track"><div class="premium-progress-fill"></div></div><div class="premium-progress-percent">0%</div><div class="premium-progress-details"></div>';
        this.fill = this.container.querySelector('.premium-progress-fill'); this.percent = this.container.querySelector('.premium-progress-percent'); this.details = this.container.querySelector('.premium-progress-details');
    }
    update(value, details = null) {
        const progress = Math.min(100, Math.max(0, Number(value) || 0));
        this.fill.style.width = `${progress}%`; this.percent.textContent = `${Math.round(progress)}%`;
        if (this.details) this.details.textContent = details?.file ? `${details.file} — ${Math.round(details.overallProgress ?? progress)}%` : (details?.stage || '');
    }
    reset() { this.update(0); }
    complete() { this.update(100, { stage: 'Complete' }); }
    error(message) { this.details.textContent = String(message || 'Error'); }
    destroy() { this.container.replaceChildren(); }
}

class PremiumComparisonSlider {
    constructor(container) { this.container = typeof container === 'string' ? document.querySelector(container) : container; this.urls = []; }
    setImages(before, after) {
        if (!this.container) return;
        this.reset(); this.urls = [before, after];
        const wrap = document.createElement('div'); wrap.className = 'premium-comparison';
        const beforeImg = new Image(); beforeImg.src = before; beforeImg.alt = 'Original'; beforeImg.className = 'comparison-before';
        const afterImg = new Image(); afterImg.src = after; afterImg.alt = 'Processed'; afterImg.className = 'comparison-after';
        wrap.append(beforeImg, afterImg); this.container.appendChild(wrap);
    }
    reset() { if (this.container) this.container.replaceChildren(); this.urls.forEach(url => { if (url.startsWith('blob:')) URL.revokeObjectURL(url); }); this.urls = []; }
    destroy() { this.reset(); }
}

class PremiumUI {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) throw new Error(`PremiumUI container not found: ${containerId}`);
        this.dropzone = this.fileList = this.progressBar = this.actionButtons = null;
        this._bound = [];
    }
    init() {
        this.container.replaceChildren();
        this.container.insertAdjacentHTML('beforeend', '<div id="dropzone" class="premium-dropzone"><div class="premium-dz-content"><div class="premium-dz-icon" aria-hidden="true">↥</div><strong>Drop files here</strong><span>or click to select files</span></div><input id="fileInput" type="file" multiple hidden></div><div id="fileList" class="premium-filelist"></div><div id="progressContainer" class="premium-progress" hidden></div><div id="actionButtons" class="premium-actions" hidden><button id="downloadAll" type="button">Download All</button><button id="startOver" type="button">Start Over</button></div>');
        this.dropzone = this.container.querySelector('#dropzone'); this.fileInput = this.container.querySelector('#fileInput'); this.fileList = this.container.querySelector('#fileList'); this.progressBar = this.container.querySelector('#progressContainer'); this.actionButtons = this.container.querySelector('#actionButtons');
        this._on(this.dropzone, 'click', () => this.fileInput.click()); this._on(this.fileInput, 'change', e => { this.handleFiles(e.target.files); e.target.value = ''; });
        this._on(this.dropzone, 'dragover', e => { e.preventDefault(); this.dropzone.classList.add('highlight'); }); this._on(this.dropzone, 'dragleave', e => { e.preventDefault(); this.dropzone.classList.remove('highlight'); }); this._on(this.dropzone, 'drop', e => { e.preventDefault(); this.dropzone.classList.remove('highlight'); this.handleFiles(e.dataTransfer?.files); });
        this._on(this.container.querySelector('#startOver'), 'click', () => this.reset());
    }
    _on(target, event, handler) { target.addEventListener(event, handler); this._bound.push(() => target.removeEventListener(event, handler)); }
    handleFiles(fileList) {
        const files = Array.from(fileList || []).filter(file => file instanceof Blob && file.size > 0 && file.size <= 100 * 1024 * 1024).slice(0, 50);
        if (!files.length) return;
        this.dropzone.hidden = true; this.fileList.hidden = false; this.fileList.replaceChildren();
        files.forEach(file => { const row = document.createElement('div'); row.className = 'premium-file-item'; const name = document.createElement('span'); name.textContent = file.name; row.appendChild(name); this.fileList.appendChild(row); });
        window.dispatchEvent(new CustomEvent('files-selected', { detail: files }));
    }
    updateProgress(percent) { const p = Math.min(100, Math.max(0, Number(percent) || 0)); this.progressBar.hidden = false; this.progressBar.textContent = `${Math.round(p)}%`; }
    updateFileStatus(index, status, message) { const row = this.fileList.querySelectorAll('.premium-file-item')[index]; if (row) { row.dataset.status = String(status).toLowerCase(); row.textContent = `${row.textContent.split(' — ')[0]} — ${message || status}`; } }
    showActions() { this.actionButtons.hidden = false; }
    clearFiles() { this.reset(); }
    reset() { if (this.dropzone) this.dropzone.hidden = false; if (this.fileList) this.fileList.hidden = true; if (this.progressBar) this.progressBar.hidden = true; if (this.actionButtons) this.actionButtons.hidden = true; if (this.fileInput) this.fileInput.value = ''; }
    destroy() { this._bound.forEach(off => off()); this._bound = []; this.container.replaceChildren(); }

    static createDropzone(container, options) { return new PremiumDropzone(container, options); }
    static createFileList(container, options) { return new PremiumFileList(container, options); }
    static createProgressBar(container, options) { return new PremiumProgressBar(container, options); }
    static createComparisonSlider(container, options) { return new PremiumComparisonSlider(container, options); }
}

if (!document.getElementById('premium-ui-styles')) {
    const style = document.createElement('style'); style.id = 'premium-ui-styles'; style.textContent = '.premium-dropzone{border:2px dashed #4b5563;border-radius:12px;padding:40px 24px;text-align:center;cursor:pointer}.premium-dz-content{display:flex;flex-direction:column;gap:8px;align-items:center}.premium-file-item{display:flex;gap:12px;align-items:center;padding:10px;margin:6px 0;border-radius:8px}.premium-file-item .file-name{flex:1}.premium-progress-track{height:8px;background:#374151;border-radius:4px;overflow:hidden}.premium-progress-fill{height:100%;width:0;background:#3b82f6}.premium-progress-percent{margin-top:6px}.premium-actions{display:flex;gap:12px;margin-top:16px}'; document.head.appendChild(style);
}
window.PremiumUI = PremiumUI;
