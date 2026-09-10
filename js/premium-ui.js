/**
 * Pixaroid Premium UI — legacy compatibility for the remaining Pro pages.
 * New static tools use the current tool runner UI.
 */
'use strict';

class PremiumUI {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) throw new Error(`PremiumUI container not found: ${containerId}`);
        this.dropzone = this.fileList = this.progressBar = this.actionButtons = null;
        this._bound = [];
    }

    init() {
        this.resetMarkup();
        this.renderDropzone(); this.renderFileList(); this.renderProgressBar(); this.renderActions(); this.attachEvents();
    }

    resetMarkup() { this.container.replaceChildren(); }

    renderDropzone() {
        this.container.insertAdjacentHTML('afterbegin', `<div id="dropzone" class="premium-dropzone"><div class="dz-icon" aria-hidden="true">↥</div><h3>Drop files here</h3><p>or click to select files</p><div class="dz-limit">Max 50 files, 100MB each</div><input type="file" id="fileInput" multiple hidden></div>`);
        this.dropzone = this.container.querySelector('#dropzone');
    }
    renderFileList() {
        this.container.insertAdjacentHTML('beforeend', `<div id="fileList" class="premium-filelist" style="display:none"><div class="fl-header"><span>Files</span><button id="clearAll" class="btn-text" type="button">Clear All</button></div><div class="fl-items"></div></div>`);
        this.fileList = this.container.querySelector('#fileList');
    }
    renderProgressBar() {
        this.container.insertAdjacentHTML('beforeend', `<div id="progressContainer" class="premium-progress" style="display:none"><div class="progress-info"><span>Processing...</span><span class="progress-percent">0%</span></div><div class="progress-bar"><div class="progress-fill" style="width:0%"></div></div><div class="progress-details"></div></div>`);
        this.progressBar = this.container.querySelector('#progressContainer');
    }
    renderActions() {
        this.container.insertAdjacentHTML('beforeend', `<div id="actionButtons" class="premium-actions" style="display:none"><button id="downloadAll" class="btn-primary" type="button">Download All</button><button id="startOver" class="btn-secondary" type="button">Start Over</button></div>`);
        this.actionButtons = this.container.querySelector('#actionButtons');
    }

    on(target, event, handler, options) { target.addEventListener(event, handler, options); this._bound.push(() => target.removeEventListener(event, handler, options)); }

    attachEvents() {
        const input = this.container.querySelector('#fileInput');
        const prevent = e => { e.preventDefault(); e.stopPropagation(); };
        ['dragenter','dragover','dragleave','drop'].forEach(name => this.on(this.dropzone, name, prevent));
        ['dragenter','dragover'].forEach(name => this.on(this.dropzone, name, () => this.dropzone.classList.add('highlight')));
        ['dragleave','drop'].forEach(name => this.on(this.dropzone, name, () => this.dropzone.classList.remove('highlight')));
        this.on(this.dropzone, 'drop', e => this.handleFiles(e.dataTransfer?.files));
        this.on(this.dropzone, 'click', () => input.click());
        this.on(input, 'change', e => { this.handleFiles(e.target.files); input.value = ''; });
        this.on(this.container.querySelector('#clearAll'), 'click', () => this.clearFiles());
        this.on(this.container.querySelector('#startOver'), 'click', () => this.reset());
    }

    handleFiles(fileList) {
        const incoming = Array.from(fileList || []).filter(file => file instanceof Blob && file.size > 0 && file.size <= 100 * 1024 * 1024);
        const files = incoming.slice(0, Math.max(0, 50 - this.currentFileCount()));
        if (!files.length) return;
        this.dropzone.style.display = 'none'; this.fileList.style.display = 'block';
        const list = this.fileList.querySelector('.fl-items');
        files.forEach(file => {
            const item = document.createElement('div'); item.className = 'fl-item';
            const icon = document.createElement('div'); icon.className = 'fl-icon'; icon.textContent = '📄';
            const info = document.createElement('div'); info.className = 'fl-info';
            const name = document.createElement('div'); name.className = 'fl-name'; name.textContent = file.name;
            const size = document.createElement('div'); size.className = 'fl-size'; size.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
            const status = document.createElement('div'); status.className = 'fl-status'; status.textContent = 'Waiting';
            const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'fl-remove'; remove.textContent = '×';
            remove.addEventListener('click', () => { item.remove(); });
            info.append(name, size); item.append(icon, info, status, remove); list.appendChild(item);
        });
        window.dispatchEvent(new CustomEvent('files-selected', { detail: files }));
    }

    currentFileCount() { return this.fileList?.querySelectorAll('.fl-item').length || 0; }
    updateProgress(percent) { const p = Math.min(100, Math.max(0, Number(percent) || 0)); this.progressBar.style.display='block'; this.progressBar.querySelector('.progress-fill').style.width=`${p}%`; this.progressBar.querySelector('.progress-percent').textContent=`${Math.round(p)}%`; }
    updateFileStatus(index, status, message) { const el=this.fileList?.querySelectorAll('.fl-status')[index]; if(el){el.textContent=message||status; el.className=`fl-status status-${String(status).toLowerCase()}`;} }
    showActions() { this.actionButtons.style.display='flex'; }
    clearFiles() { this.fileList.querySelector('.fl-items').replaceChildren(); this.reset(); }
    reset() { this.dropzone.style.display='flex'; this.fileList.style.display='none'; this.progressBar.style.display='none'; this.actionButtons.style.display='none'; const input=this.container.querySelector('#fileInput'); if(input) input.value=''; }
    destroy() { this._bound.forEach(off=>off()); this._bound=[]; this.container.replaceChildren(); }
}

if (!document.getElementById('premium-ui-styles')) {
    const style=document.createElement('style'); style.id='premium-ui-styles'; style.textContent=`
      .premium-dropzone{border:2px dashed #4b5563;border-radius:12px;padding:48px 24px;text-align:center;cursor:pointer;background:rgba(55,65,81,.5)}
      .premium-dropzone.highlight{border-color:#3b82f6}.premium-filelist{margin-top:24px}.fl-item{display:flex;align-items:center;padding:12px;background:#1f2937;border-radius:8px;margin-bottom:8px}.fl-info{flex:1}.fl-size{font-size:12px;color:#9ca3af}.fl-status{margin-left:16px;font-size:12px}.status-completed{color:#10b981}.status-failed{color:#ef4444}.fl-remove{background:none;border:0;color:#ef4444;font-size:20px;cursor:pointer}.premium-progress{margin-top:24px}.progress-bar{height:8px;background:#374151;border-radius:4px;overflow:hidden}.progress-fill{height:100%;background:#3b82f6}.premium-actions{margin-top:24px;display:flex;gap:12px;justify-content:center}
    `; document.head.appendChild(style);
}
window.PremiumUI = PremiumUI;
