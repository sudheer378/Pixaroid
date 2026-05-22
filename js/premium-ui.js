/**
 * Premium UI Components for Pixaroid Pro
 * Sejda/iLovePDF style interface elements
 */

class PremiumUI {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.dropzone = null;
        this.fileList = null;
        this.progressBar = null;
        this.actionButtons = null;
    }

    init() {
        this.renderDropzone();
        this.renderFileList();
        this.renderProgressBar();
        this.renderActions();
        this.attachEvents();
    }

    renderDropzone() {
        const html = `
            <div id="dropzone" class="premium-dropzone">
                <div class="dz-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                    </svg>
                </div>
                <h3>Drop files here</h3>
                <p>or click to select files</p>
                <div class="dz-limit">Max 50 files, 100MB each</div>
                <input type="file" id="fileInput" multiple hidden>
            </div>
        `;
        this.container.insertAdjacentHTML('afterbegin', html);
        this.dropzone = this.container.querySelector('#dropzone');
    }

    renderFileList() {
        const html = `
            <div id="fileList" class="premium-filelist" style="display:none;">
                <div class="fl-header">
                    <span>Files</span>
                    <button id="clearAll" class="btn-text">Clear All</button>
                </div>
                <div class="fl-items"></div>
            </div>
        `;
        this.container.insertAdjacentHTML('beforeend', html);
        this.fileList = this.container.querySelector('#fileList');
    }

    renderProgressBar() {
        const html = `
            <div id="progressContainer" class="premium-progress" style="display:none;">
                <div class="progress-info">
                    <span class="progress-text">Processing...</span>
                    <span class="progress-percent">0%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 0%"></div>
                </div>
                <div class="progress-details"></div>
            </div>
        `;
        this.container.insertAdjacentHTML('beforeend', html);
        this.progressBar = this.container.querySelector('#progressContainer');
    }

    renderActions() {
        const html = `
            <div id="actionButtons" class="premium-actions" style="display:none;">
                <button id="downloadAll" class="btn-primary">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                    </svg>
                    Download All (ZIP)
                </button>
                <button id="startOver" class="btn-secondary">Start Over</button>
            </div>
        `;
        this.container.insertAdjacentHTML('beforeend', html);
        this.actionButtons = this.container.querySelector('#actionButtons');
    }

    attachEvents() {
        const dropzone = this.dropzone;
        const fileInput = this.container.querySelector('#fileInput');

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => dropzone.classList.add('highlight'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => dropzone.classList.remove('highlight'), false);
        });

        dropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            this.handleFiles(files);
        }, false);

        dropzone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));

        this.container.querySelector('#clearAll').addEventListener('click', () => this.clearFiles());
        this.container.querySelector('#startOver').addEventListener('click', () => this.reset());
    }

    handleFiles(files) {
        const validFiles = Array.from(files).filter(file => {
            if (file.size > 100 * 1024 * 1024) {
                alert(`${file.name} exceeds 100MB limit`);
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) return;

        this.dropzone.style.display = 'none';
        this.fileList.style.display = 'block';
        
        const listContainer = this.fileList.querySelector('.fl-items');
        
        validFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'fl-item';
            item.innerHTML = `
                <div class="fl-icon">📄</div>
                <div class="fl-info">
                    <div class="fl-name">${file.name}</div>
                    <div class="fl-size">${(file.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
                <div class="fl-status" id="status-${index}">Waiting</div>
                <button class="fl-remove" onclick="this.parentElement.remove()">×</button>
            `;
            listContainer.appendChild(item);
        });

        window.dispatchEvent(new CustomEvent('files-selected', { detail: validFiles }));
    }

    updateProgress(percent) {
        this.progressBar.style.display = 'block';
        const fill = this.progressBar.querySelector('.progress-fill');
        const text = this.progressBar.querySelector('.progress-percent');
        
        fill.style.width = `${percent}%`;
        text.textContent = `${percent}%`;
    }

    updateFileStatus(index, status, message) {
        const el = document.getElementById(`status-${index}`);
        if (el) {
            el.textContent = message || status;
            el.className = `fl-status status-${status.toLowerCase()}`;
        }
    }

    showActions() {
        this.actionButtons.style.display = 'flex';
    }

    clearFiles() {
        const listContainer = this.fileList.querySelector('.fl-items');
        listContainer.innerHTML = '';
        this.reset();
    }

    reset() {
        this.dropzone.style.display = 'flex';
        this.fileList.style.display = 'none';
        this.progressBar.style.display = 'none';
        this.actionButtons.style.display = 'none';
        this.container.querySelector('#fileInput').value = '';
    }
}

if (!document.getElementById('premium-ui-styles')) {
    const style = document.createElement('style');
    style.id = 'premium-ui-styles';
    style.textContent = `
        .premium-dropzone {
            border: 2px dashed #4b5563; border-radius: 12px; padding: 48px 24px;
            text-align: center; cursor: pointer; transition: all 0.3s ease;
            background: rgba(55, 65, 81, 0.5);
        }
        .premium-dropzone.highlight { border-color: #3b82f6; background: rgba(59, 130, 246, 0.1); }
        .dz-icon { color: #9ca3af; margin-bottom: 16px; }
        .dz-limit { font-size: 12px; color: #6b7280; margin-top: 8px; }
        .premium-filelist { margin-top: 24px; }
        .fl-header { display: flex; justify-content: space-between; margin-bottom: 12px; }
        .fl-item { display: flex; align-items: center; padding: 12px; background: #1f2937; border-radius: 8px; margin-bottom: 8px; }
        .fl-icon { margin-right: 12px; font-size: 20px; }
        .fl-info { flex: 1; }
        .fl-name { font-weight: 500; }
        .fl-size { font-size: 12px; color: #9ca3af; }
        .fl-status { margin-left: 16px; font-size: 12px; }
        .status-completed { color: #10b981; }
        .status-processing { color: #3b82f6; }
        .status-failed { color: #ef4444; }
        .fl-remove { background: none; border: none; color: #ef4444; font-size: 20px; cursor: pointer; margin-left: 8px; }
        .premium-progress { margin-top: 24px; }
        .progress-info { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
        .progress-bar { height: 8px; background: #374151; border-radius: 4px; overflow: hidden; }
        .progress-fill { height: 100%; background: #3b82f6; transition: width 0.3s ease; }
        .premium-actions { margin-top: 24px; display: flex; gap: 12px; justify-content: center; }
        .btn-primary, .btn-secondary { padding: 12px 24px; border-radius: 8px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 8px; border: none; }
        .btn-primary { background: #3b82f6; color: white; }
        .btn-primary:hover { background: #2563eb; }
        .btn-secondary { background: #374151; color: white; }
        .btn-secondary:hover { background: #4b5563; }
        .btn-text { background: none; border: none; color: #ef4444; cursor: pointer; }
    `;
    document.head.appendChild(style);
}

window.PremiumUI = PremiumUI;
