/**
 * Pixaroid Premium UI Components v2.0
 * Professional-grade UI components matching Sejda/iLovePDF standards
 */

const PremiumUI = (function(PixaroidCore) {
    'use strict';

    const { eventBus, logger, utils } = PixaroidCore;

    // Premium Dropzone Component
    class Dropzone {
        constructor(container, options = {}) {
            this.container = typeof container === 'string' 
                ? document.querySelector(container) 
                : container;
            
            if (!this.container) {
                throw new Error('Dropzone container not found');
            }

            this.options = {
                accept: options.accept || 'image/*',
                multiple: options.multiple !== false,
                maxSize: options.maxSize || 100 * 1024 * 1024,
                maxFiles: options.maxFiles || 50,
                clickToUpload: options.clickToUpload !== false,
                showIcons: options.showIcons !== false,
                ...options
            };

            this.files = [];
            this.onFileSelect = options.onFileSelect || (() => {});
            this.onError = options.onError || (() => {});
            
            this.init();
        }

        init() {
            this.container.classList.add('premium-dropzone');
            this.container.setAttribute('data-multiple', this.options.multiple);
            
            this.render();
            this.bindEvents();
        }

        render() {
            const icon = this.options.showIcons ? `
                <div class="dropzone-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                </div>
            ` : '';

            this.container.innerHTML = `
                ${icon}
                <div class="dropzone-content">
                    <h3 class="dropzone-title">
                        ${this.options.multiple ? 'Drag & drop files here' : 'Drag & drop a file here'}
                    </h3>
                    <p class="dropzone-subtitle">
                        or <span class="browse-btn">browse to upload</span>
                        ${this.options.maxSize ? ` (max ${utils.formatBytes(this.options.maxSize)})` : ''}
                    </p>
                    ${this.options.multiple ? `<p class="dropzone-hint">Supports up to ${this.options.maxFiles} files</p>` : ''}
                </div>
                <input type="file" class="file-input" ${this.options.multiple ? 'multiple' : ''} accept="${this.options.accept}" />
                <div class="dropzone-overlay"></div>
            `;

            this.fileInput = this.container.querySelector('.file-input');
            this.browseBtn = this.container.querySelector('.browse-btn');
            this.overlay = this.container.querySelector('.dropzone-overlay');
        }

        bindEvents() {
            // Click to upload
            if (this.options.clickToUpload) {
                this.container.addEventListener('click', (e) => {
                    if (e.target !== this.browseBtn && !e.target.closest('.file-input')) {
                        this.fileInput.click();
                    }
                });
            }

            this.browseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.fileInput.click();
            });

            // File input change
            this.fileInput.addEventListener('change', (e) => {
                this.handleFiles(e.target.files);
                this.fileInput.value = ''; // Reset for re-upload
            });

            // Drag and drop
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                this.container.addEventListener(eventName, this.preventDefaults, false);
                document.body.addEventListener(eventName, this.preventDefaults, false);
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                this.container.addEventListener(eventName, () => this.onDragEnter(), false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                this.container.addEventListener(eventName, () => this.onDragLeave(), false);
            });

            this.container.addEventListener('drop', (e) => {
                this.onDrop(e);
            });
        }

        preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        onDragEnter() {
            this.container.classList.add('drag-over');
            this.overlay.style.display = 'block';
        }

        onDragLeave() {
            this.container.classList.remove('drag-over');
            this.overlay.style.display = 'none';
        }

        onDrop(e) {
            this.preventDefaults(e);
            this.container.classList.remove('drag-over');
            this.overlay.style.display = 'none';
            
            const dataTransfer = e.dataTransfer;
            this.handleFiles(dataTransfer.files);
        }

        handleFiles(fileList) {
            const files = Array.from(fileList);
            
            // Validate files
            const validation = PixaroidCore.FileValidator.validateBatch(files, {
                maxSize: this.options.maxSize,
                allowedTypes: this.getSupportedFormats()
            });

            if (validation.errors.length > 0) {
                validation.errors.forEach(error => this.onError(error));
            }

            if (validation.valid.length > 0) {
                if (!this.options.multiple) {
                    this.files = [validation.valid[0]];
                } else {
                    this.files = [...this.files, ...validation.valid].slice(0, this.options.maxFiles);
                }
                this.onFileSelect(this.files);
                this.updateUI();
            }
        }

        getSupportedFormats() {
            const formatMap = {
                'image/*': ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff'],
                'image/jpeg': ['jpg', 'jpeg'],
                'image/png': ['png'],
                'image/webp': ['webp'],
                'image/gif': ['gif'],
                '.pdf': ['pdf']
            };
            
            return formatMap[this.options.accept] || ['jpg', 'jpeg', 'png', 'webp'];
        }

        updateUI() {
            if (this.files.length > 0) {
                this.container.classList.add('has-files');
                const countEl = this.container.querySelector('.file-count');
                if (countEl) {
                    countEl.textContent = `${this.files.length} file${this.files.length > 1 ? 's' : ''} selected`;
                }
            } else {
                this.container.classList.remove('has-files');
            }
        }

        addFiles(files) {
            this.handleFiles(files);
        }

        removeFile(index) {
            this.files.splice(index, 1);
            this.updateUI();
            this.onFileSelect(this.files);
        }

        clearFiles() {
            this.files = [];
            this.updateUI();
            this.onFileSelect(this.files);
        }

        getFiles() {
            return [...this.files];
        }

        destroy() {
            this.container.innerHTML = '';
            this.files = [];
        }
    }

    // Progress Bar Component
    class ProgressBar {
        constructor(container, options = {}) {
            this.container = typeof container === 'string'
                ? document.querySelector(container)
                : container;

            if (!this.container) {
                throw new Error('ProgressBar container not found');
            }

            this.options = {
                showPercentage: options.showPercentage !== false,
                showDetails: options.showDetails || false,
                animated: options.animated !== false,
                ...options
            };

            this.progress = 0;
            this.details = null;
            
            this.init();
        }

        init() {
            this.container.classList.add('premium-progress-bar');
            this.render();
        }

        render() {
            this.container.innerHTML = `
                <div class="progress-track">
                    <div class="progress-fill" style="width: 0%"></div>
                </div>
                ${this.options.showPercentage ? `
                    <div class="progress-percentage">0%</div>
                ` : ''}
                ${this.options.showDetails ? `
                    <div class="progress-details"></div>
                ` : ''}
            `;

            this.track = this.container.querySelector('.progress-track');
            this.fill = this.container.querySelector('.progress-fill');
            this.percentageEl = this.container.querySelector('.progress-percentage');
            this.detailsEl = this.container.querySelector('.progress-details');
        }

        update(progress, details = null) {
            this.progress = Math.min(100, Math.max(0, progress));
            this.details = details;

            this.fill.style.width = `${this.progress}%`;
            
            if (this.percentageEl) {
                this.percentageEl.textContent = `${Math.round(this.progress)}%`;
            }

            if (this.detailsEl && this.details) {
                this.detailsEl.innerHTML = this.formatDetails(this.details);
            }

            // Emit event
            eventBus.emit('progress:update', {
                progress: this.progress,
                details: this.details
            });
        }

        formatDetails(details) {
            if (typeof details === 'string') {
                return details;
            }

            if (details.stage) {
                const stageLabels = {
                    loading: 'Loading file...',
                    processing: 'Processing...',
                    encoding: 'Encoding...',
                    complete: 'Complete!',
                    error: 'Error occurred'
                };
                return stageLabels[details.stage] || details.stage;
            }

            if (details.file && details.overallProgress) {
                return `
                    <span class="file-name">${details.file}</span>
                    <span class="batch-info">
                        ${details.completed}/${details.total} files 
                        (${Math.round(details.overallProgress)}%)
                    </span>
                `;
            }

            return JSON.stringify(details);
        }

        reset() {
            this.progress = 0;
            this.details = null;
            this.fill.style.width = '0%';
            
            if (this.percentageEl) {
                this.percentageEl.textContent = '0%';
            }
            
            if (this.detailsEl) {
                this.detailsEl.innerHTML = '';
            }
        }

        complete() {
            this.update(100, { stage: 'complete' });
        }

        error(message) {
            this.container.classList.add('error');
            this.update(this.progress, { stage: 'error', message });
        }

        destroy() {
            this.container.innerHTML = '';
        }
    }

    // File List Component
    class FileList {
        constructor(container, options = {}) {
            this.container = typeof container === 'string'
                ? document.querySelector(container)
                : container;

            if (!this.container) {
                throw new Error('FileList container not found');
            }

            this.options = {
                showPreview: options.showPreview !== false,
                showSize: options.showSize !== false,
                showRemove: options.showRemove !== false,
                showStatus: options.showStatus !== false,
                thumbnailSize: options.thumbnailSize || 60,
                ...options
            };

            this.files = [];
            
            this.init();
        }

        init() {
            this.container.classList.add('premium-file-list');
            this.render();
        }

        render() {
            this.container.innerHTML = `
                <div class="file-list-header">
                    <span class="file-count">0 files</span>
                    ${this.options.showRemove && this.files.length > 0 ? `
                        <button class="clear-all-btn">Clear All</button>
                    ` : ''}
                </div>
                <div class="file-list-items"></div>
            `;

            this.header = this.container.querySelector('.file-list-header');
            this.countEl = this.container.querySelector('.file-count');
            this.itemsContainer = this.container.querySelector('.file-list-items');
            this.clearAllBtn = this.container.querySelector('.clear-all-btn');

            if (this.clearAllBtn) {
                this.clearAllBtn.addEventListener('click', () => {
                    this.clear();
                });
            }
        }

        setFiles(files) {
            this.files = files.map((file, index) => ({
                id: utils.generateId(),
                file,
                index,
                status: 'pending',
                progress: 0,
                result: null
            }));
            this.renderItems();
        }

        renderItems() {
            if (this.files.length === 0) {
                this.itemsContainer.innerHTML = `
                    <div class="empty-state">
                        <p>No files selected</p>
                    </div>
                `;
                this.updateHeader();
                return;
            }

            this.itemsContainer.innerHTML = this.files.map((item, index) => `
                <div class="file-item" data-id="${item.id}">
                    ${this.options.showPreview ? `
                        <div class="file-preview">
                            ${this.generateThumbnail(item.file)}
                        </div>
                    ` : ''}
                    <div class="file-info">
                        <div class="file-name" title="${item.file.name}">${item.file.name}</div>
                        ${this.options.showSize ? `
                            <div class="file-size">${utils.formatBytes(item.file.size)}</div>
                        ` : ''}
                        ${this.options.showStatus ? `
                            <div class="file-status status-${item.status}">
                                ${this.getStatusLabel(item.status)}
                                ${item.status === 'processing' ? ` (${item.progress}%)` : ''}
                                ${item.result && item.result.reduction ? ` - ${item.result.reduction} smaller` : ''}
                            </div>
                        ` : ''}
                    </div>
                    ${this.options.showRemove ? `
                        <button class="remove-file-btn" data-index="${index}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    ` : ''}
                </div>
            `).join('');

            // Bind remove events
            if (this.options.showRemove) {
                this.itemsContainer.querySelectorAll('.remove-file-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const index = parseInt(e.currentTarget.dataset.index);
                        this.removeFile(index);
                    });
                });
            }

            this.updateHeader();
        }

        generateThumbnail(file) {
            if (!file.type.startsWith('image/')) {
                return `
                    <div class="file-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                        </svg>
                    </div>
                `;
            }

            const url = URL.createObjectURL(file);
            return `
                <img src="${url}" alt="${file.name}" style="width: ${this.options.thumbnailSize}px; height: ${this.options.thumbnailSize}px; object-fit: cover;" />
            `;
        }

        getStatusLabel(status) {
            const labels = {
                pending: 'Pending',
                processing: 'Processing',
                complete: 'Complete',
                error: 'Error',
                skipped: 'Skipped'
            };
            return labels[status] || status;
        }

        updateHeader() {
            this.countEl.textContent = `${this.files.length} file${this.files.length !== 1 ? 's' : ''}`;
            
            if (this.clearAllBtn) {
                this.clearAllBtn.style.display = this.files.length > 0 ? 'block' : 'none';
            }
        }

        updateFileStatus(index, status, progress = null, result = null) {
            if (this.files[index]) {
                this.files[index].status = status;
                if (progress !== null) this.files[index].progress = progress;
                if (result !== null) this.files[index].result = result;
                this.renderItems();
            }
        }

        removeFile(index) {
            this.files.splice(index, 1);
            this.renderItems();
            eventBus.emit('filelist:remove', { index, files: this.files });
        }

        clear() {
            this.files = [];
            this.renderItems();
            eventBus.emit('filelist:clear', { files: [] });
        }

        getFiles() {
            return this.files.map(item => item.file);
        }

        getFileItems() {
            return [...this.files];
        }

        destroy() {
            this.container.innerHTML = '';
            this.files = [];
        }
    }

    // Before/After Comparison Slider
    class ComparisonSlider {
        constructor(container, options = {}) {
            this.container = typeof container === 'string'
                ? document.querySelector(container)
                : container;

            if (!this.container) {
                throw new Error('ComparisonSlider container not found');
            }

            this.options = {
                initialPosition: options.initialPosition || 50,
                showLabels: options.showLabels !== false,
                animateOnHover: options.animateOnHover || false,
                ...options
            };

            this.position = this.options.initialPosition;
            this.isDragging = false;
            
            this.init();
        }

        init() {
            this.container.classList.add('comparison-slider');
            this.render();
            this.bindEvents();
        }

        render() {
            this.container.innerHTML = `
                <div class="comparison-wrapper">
                    <div class="comparison-image after">
                        <img class="after-img" alt="After" />
                    </div>
                    <div class="comparison-image before" style="width: ${this.position}%">
                        <img class="before-img" alt="Before" />
                    </div>
                    <div class="comparison-handle" style="left: ${this.position}%">
                        <div class="handle-line"></div>
                        <div class="handle-button">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="15 18 9 12 15 6"/>
                                <polyline points="9 18 15 12 9 6"/>
                            </svg>
                        </div>
                    </div>
                    ${this.options.showLabels ? `
                        <div class="label before-label">Before</div>
                        <div class="label after-label">After</div>
                    ` : ''}
                </div>
            `;

            this.beforeImg = this.container.querySelector('.before-img');
            this.afterImg = this.container.querySelector('.after-img');
            this.beforeContainer = this.container.querySelector('.comparison-image.before');
            this.handle = this.container.querySelector('.comparison-handle');
        }

        bindEvents() {
            const wrapper = this.container.querySelector('.comparison-wrapper');
            
            wrapper.addEventListener('mousedown', (e) => this.startDrag(e));
            wrapper.addEventListener('touchstart', (e) => this.startDrag(e));
            
            document.addEventListener('mousemove', (e) => this.drag(e));
            document.addEventListener('touchmove', (e) => this.drag(e));
            
            document.addEventListener('mouseup', () => this.endDrag());
            document.addEventListener('touchend', () => this.endDrag());

            if (this.options.animateOnHover) {
                wrapper.addEventListener('mouseenter', () => {
                    this.container.classList.add('hover-mode');
                });
                wrapper.addEventListener('mouseleave', () => {
                    this.container.classList.remove('hover-mode');
                });
            }
        }

        startDrag(e) {
            this.isDragging = true;
            this.container.classList.add('dragging');
            this.updatePosition(e);
        }

        drag(e) {
            if (!this.isDragging) return;
            e.preventDefault();
            this.updatePosition(e);
        }

        endDrag() {
            this.isDragging = false;
            this.container.classList.remove('dragging');
        }

        updatePosition(e) {
            const wrapper = this.container.querySelector('.comparison-wrapper');
            const rect = wrapper.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            
            let newPosition = ((clientX - rect.left) / rect.width) * 100;
            newPosition = Math.min(100, Math.max(0, newPosition));
            
            this.setPosition(newPosition);
        }

        setPosition(position) {
            this.position = position;
            this.beforeContainer.style.width = `${position}%`;
            this.handle.style.left = `${position}%`;
            
            eventBus.emit('comparison:change', { position: this.position });
        }

        setImages(beforeSrc, afterSrc) {
            this.beforeImg.src = beforeSrc;
            this.afterImg.src = afterSrc;
        }

        reset() {
            this.setPosition(this.options.initialPosition);
        }

        destroy() {
            this.container.innerHTML = '';
        }
    }

    // Export components
    return {
        Dropzone,
        ProgressBar,
        FileList,
        ComparisonSlider,

        // Factory functions
        createDropzone(container, options) {
            return new Dropzone(container, options);
        },

        createProgressBar(container, options) {
            return new ProgressBar(container, options);
        },

        createFileList(container, options) {
            return new FileList(container, options);
        },

        createComparisonSlider(container, options) {
            return new ComparisonSlider(container, options);
        }
    };
})(PixaroidCore);

// Auto-initialize styles
(function() {
    const styles = `
        /* Premium Dropzone */
        .premium-dropzone {
            border: 2px dashed #4a5568;
            border-radius: 12px;
            padding: 3rem;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            background: rgba(74, 85, 120, 0.1);
            position: relative;
            overflow: hidden;
        }
        
        .premium-dropzone:hover,
        .premium-dropzone.drag-over {
            border-color: #667eea;
            background: rgba(102, 126, 234, 0.1);
            transform: translateY(-2px);
        }
        
        .dropzone-icon {
            width: 64px;
            height: 64px;
            margin: 0 auto 1rem;
            color: #667eea;
        }
        
        .dropzone-title {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #f7fafc;
        }
        
        .dropzone-subtitle {
            color: #a0aec0;
            margin-bottom: 0.5rem;
        }
        
        .browse-btn {
            color: #667eea;
            text-decoration: underline;
            cursor: pointer;
        }
        
        .dropzone-hint {
            font-size: 0.875rem;
            color: #718096;
        }
        
        .file-input {
            display: none;
        }
        
        .dropzone-overlay {
            display: none;
            position: absolute;
            inset: 0;
            background: rgba(102, 126, 234, 0.2);
            pointer-events: none;
        }
        
        /* Premium Progress Bar */
        .premium-progress-bar {
            width: 100%;
        }
        
        .progress-track {
            height: 8px;
            background: #2d3748;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 0.5rem;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea, #764ba2);
            border-radius: 4px;
            transition: width 0.3s ease;
        }
        
        .progress-percentage {
            text-align: right;
            font-size: 0.875rem;
            color: #a0aec0;
        }
        
        .progress-details {
            font-size: 0.875rem;
            color: #a0aec0;
            margin-top: 0.5rem;
        }
        
        .premium-progress-bar.error .progress-fill {
            background: linear-gradient(90deg, #f56565, #c53030);
        }
        
        /* Premium File List */
        .premium-file-list {
            background: #1a202c;
            border-radius: 8px;
            padding: 1rem;
        }
        
        .file-list-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid #2d3748;
        }
        
        .file-count {
            font-weight: 600;
            color: #f7fafc;
        }
        
        .clear-all-btn {
            background: #e53e3e;
            color: white;
            border: none;
            padding: 0.375rem 0.75rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.875rem;
        }
        
        .file-item {
            display: flex;
            align-items: center;
            padding: 0.75rem;
            background: #2d3748;
            border-radius: 6px;
            margin-bottom: 0.5rem;
        }
        
        .file-preview {
            margin-right: 1rem;
        }
        
        .file-info {
            flex: 1;
            min-width: 0;
        }
        
        .file-name {
            font-weight: 500;
            color: #f7fafc;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .file-size {
            font-size: 0.75rem;
            color: #a0aec0;
            margin-top: 0.25rem;
        }
        
        .file-status {
            font-size: 0.75rem;
            margin-top: 0.25rem;
        }
        
        .status-pending { color: #a0aec0; }
        .status-processing { color: #667eea; }
        .status-complete { color: #48bb78; }
        .status-error { color: #f56565; }
        
        .remove-file-btn {
            background: none;
            border: none;
            color: #a0aec0;
            cursor: pointer;
            padding: 0.25rem;
            margin-left: 0.5rem;
        }
        
        .remove-file-btn:hover {
            color: #f56565;
        }
        
        /* Comparison Slider */
        .comparison-slider {
            position: relative;
            user-select: none;
        }
        
        .comparison-wrapper {
            position: relative;
            overflow: hidden;
            cursor: ew-resize;
        }
        
        .comparison-image {
            position: relative;
            overflow: hidden;
        }
        
        .comparison-image img {
            display: block;
            width: 100%;
            height: auto;
        }
        
        .comparison-image.before {
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
        }
        
        .comparison-handle {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 4px;
            background: white;
            cursor: ew-resize;
            z-index: 10;
        }
        
        .handle-line {
            position: absolute;
            top: 0;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 2px;
            background: rgba(0, 0, 0, 0.5);
        }
        
        .handle-button {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 40px;
            height: 40px;
            background: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        
        .handle-button svg {
            width: 20px;
            height: 20px;
            color: #4a5568;
        }
        
        .label {
            position: absolute;
            top: 1rem;
            padding: 0.25rem 0.75rem;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 500;
        }
        
        .before-label {
            left: 1rem;
        }
        
        .after-label {
            right: 1rem;
        }
        
        .empty-state {
            text-align: center;
            padding: 2rem;
            color: #a0aec0;
        }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    if (document.head) {
        document.head.appendChild(styleSheet);
    }
})();

console.log('🎨 Premium UI Components v2.0 initialized');
