/**
 * Pixaroid Tool Controller v3.0
 * Universal controller for current static image tools.
 * Uses the canonical /js/engine.js processing API while preserving
 * the existing PremiumUI component contract.
 */
import { compressImage, compressToTargetSize, resizeImage, convertImage, editImage, processBulkImages } from '/js/engine.js';

const ToolController = (() => {
    'use strict';

    class ToolControllerInstance {
        constructor(toolConfig = {}) {
            this.config = {
                toolId: null,
                toolName: 'Image Tool',
                toolType: 'compress',
                accept: 'image/*',
                multiple: true,
                maxFiles: 50,
                maxSize: 20 * 1024 * 1024,
                showComparison: true,
                autoProcess: false,
                ...toolConfig
            };
            this.state = { files: [], processing: false, progress: 0, results: [], error: null };
            this.components = { dropzone: null, fileList: null, progressBar: null, comparisonSlider: null };
            this.processor = null;
            this._listeners = [];
            this.init();
        }

        init() {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setup(), { once: true });
            } else this.setup();
        }

        setup() {
            this.initializeComponents();
            this.bindEvents();
            this.updateUI();
            this.emit('tool:ready', { toolId: this.config.toolId });
        }

        on(target, event, handler, options) {
            target?.addEventListener?.(event, handler, options);
            if (target) this._listeners.push(() => target.removeEventListener(event, handler, options));
        }

        emit(name, detail = {}) {
            window.dispatchEvent(new CustomEvent(`pixaroid:${name}`, { detail }));
            window.dispatchEvent(new CustomEvent(name, { detail }));
        }

        initializeComponents() {
            const ui = globalThis.PremiumUI;
            const dropzoneEl = document.querySelector('#dropzone');
            const fileListEl = document.querySelector('#file-list');
            const progressEl = document.querySelector('#progress-bar');
            const comparisonEl = document.querySelector('#comparison-slider');
            if (!ui) return;
            if (dropzoneEl && typeof ui.createDropzone === 'function') {
                this.components.dropzone = ui.createDropzone(dropzoneEl, {
                    accept: this.config.accept,
                    multiple: this.config.multiple,
                    maxSize: this.config.maxSize,
                    maxFiles: this.config.maxFiles,
                    onFileSelect: files => this.handleFileSelect(files),
                    onError: error => this.handleError(error)
                });
            }
            if (fileListEl && typeof ui.createFileList === 'function') {
                this.components.fileList = ui.createFileList(fileListEl, { showPreview:true, showSize:true, showRemove:true, showStatus:true, thumbnailSize:60 });
            }
            if (progressEl && typeof ui.createProgressBar === 'function') {
                this.components.progressBar = ui.createProgressBar(progressEl, { showPercentage:true, showDetails:true });
            }
            if (this.config.showComparison && comparisonEl && typeof ui.createComparisonSlider === 'function') {
                this.components.comparisonSlider = ui.createComparisonSlider(comparisonEl, { initialPosition:50, showLabels:true });
            }
        }

        bindEvents() {
            const processBtn = document.querySelector('#process-btn');
            const downloadBtn = document.querySelector('#download-btn');
            const downloadAllBtn = document.querySelector('#download-all-btn');
            const resetBtn = document.querySelector('#reset-btn');
            this.on(processBtn, 'click', () => this.process());
            this.on(downloadBtn, 'click', () => this.download());
            this.on(downloadAllBtn, 'click', () => this.downloadAll());
            this.on(resetBtn, 'click', () => this.reset());
            document.querySelectorAll('.setting-input').forEach(input => {
                const handler = () => this.handleSettingsChange({ target: input });
                this.on(input, 'change', handler);
                this.on(input, 'input', handler);
            });
        }

        handleFileSelect(files) {
            this.state.files = Array.from(files || []).slice(0, this.config.maxFiles);
            this.components.fileList?.setFiles?.(this.state.files);
            this.updateUI();
            if (this.config.autoProcess && this.state.files.length) this.process();
        }

        handleSettingsChange(event) {
            const setting = event.target?.dataset?.setting;
            const value = event.target?.value;
            if (!setting) return;
            this.processor = this.processor || {};
            this.processor.options = this.processor.options || {};
            if (setting === 'quality') this.processor.options.quality = Number(value);
            if (setting === 'width') this.processor.options.maxWidth = Number(value);
            if (setting === 'height') this.processor.options.maxHeight = Number(value);
            if (setting === 'scale') this.processor.options.scale = Number(value);
            if (setting === 'format') this.processor.options.format = value;
        }

        getProcessorOptions() {
            const read = (id, parser, fallback) => {
                const el = document.querySelector(id);
                if (!el || el.value === '') return fallback;
                const v = parser(el.value);
                return Number.isFinite(v) ? v : fallback;
            };
            return {
                quality: read('#quality-setting', Number, 80),
                maxWidth: read('#width-setting', Number, 0),
                maxHeight: read('#height-setting', Number, 0),
                scale: read('#scale-setting', Number, 0),
                format: document.querySelector('#format-setting')?.value || 'auto'
            };
        }

        async processOne(file, options) {
            const type = this.config.toolType;
            if (type === 'compress-target') return compressToTargetSize(file, { targetKB: this.config.targetKB || Number(this.config.targetSizeKB), format: options.format || 'jpeg' });
            if (type === 'compress') return compressImage(file, options);
            if (type === 'convert') return convertImage(file, { targetFormat: options.format || 'jpeg', quality: options.quality });
            if (type === 'resize') return resizeImage(file, options);
            const operations = Array.isArray(this.config.operations) ? this.config.operations : [];
            return editImage(file, operations, options);
        }

        async process() {
            if (this.state.processing || !this.state.files.length) return;
            this.state.processing = true;
            this.state.results = [];
            this.state.error = null;
            this.updateUI();
            const options = this.getProcessorOptions();
            try {
                const files = this.state.files;
                if (files.length === 1) {
                    const result = await this.processOne(files[0], options);
                    this.state.results.push({ file: files[0], result, status:'complete' });
                    this.components.fileList?.updateFileStatus?.(0, 'complete', 100, result);
                } else {
                    const task = ({compress:'compress', 'compress-target':'target', resize:'resize', convert:'convert'})[this.config.toolType] || 'edit';
                    if (task === 'edit') {
                        const results = [];
                        for (let i=0;i<files.length;i++) {
                            try { results.push({ file:files[i], result:await this.processOne(files[i], options), status:'complete' }); }
                            catch(error) { results.push({ file:files[i], error, status:'error' }); }
                            this.updateProgress(i + 1, files.length, files[i].name);
                        }
                        this.state.results.push(...results);
                    } else {
                        for (let i=0;i<files.length;i++) {
                            try { const result = await this.processOne(files[i], options); this.state.results.push({ file:files[i], result, status:'complete' }); this.components.fileList?.updateFileStatus?.(i, 'complete', 100, result); }
                            catch(error) { this.state.results.push({ file:files[i], error, status:'error' }); this.components.fileList?.updateFileStatus?.(i, 'error', 100, {error:error.message}); }
                            this.updateProgress(i + 1, files.length, files[i].name);
                        }
                    }
                }
                if (this.state.results.length === 1 && this.config.showComparison) this.showComparison(this.state.results[0]);
            } catch (error) {
                this.handleError(error);
            } finally {
                this.state.processing = false;
                this.updateUI();
                this.emit('tool:complete', { toolId:this.config.toolId, results:this.state.results });
            }
        }

        updateProgress(current, total, filename) {
            const percent = total ? Math.round(current / total * 100) : 0;
            this.state.progress = percent;
            this.components.progressBar?.update?.(percent, { current, total, filename, progress:percent, overallProgress:percent });
        }

        showComparison(entry) {
            if (!entry?.result?.blob || !this.components.comparisonSlider) return;
            const beforeUrl = URL.createObjectURL(entry.file);
            const afterUrl = URL.createObjectURL(entry.result.blob);
            this.components.comparisonSlider.setImages?.(beforeUrl, afterUrl);
            setTimeout(() => { URL.revokeObjectURL(beforeUrl); URL.revokeObjectURL(afterUrl); }, 60000);
        }

        download() {
            const entry = this.state.results.find(x => x?.result?.blob);
            if (!entry) return;
            const url = URL.createObjectURL(entry.result.blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = this.generateDownloadFilename(entry.file, entry.result.format);
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }

        downloadAll() { this.state.results.filter(x => x?.result?.blob).forEach((entry, i) => setTimeout(() => this.downloadEntry(entry), i * 250)); }

        downloadEntry(entry) {
            const url = URL.createObjectURL(entry.result.blob);
            const a = document.createElement('a'); a.href=url; a.download=this.generateDownloadFilename(entry.file, entry.result.format); document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }

        generateDownloadFilename(file, format) {
            const dot = file.name.lastIndexOf('.');
            const base = dot > 0 ? file.name.slice(0, dot) : file.name;
            const ext = String(format || file.name.slice(dot + 1) || 'jpg').replace('image/','').replace('jpeg','jpg');
            return `${base}_pixaroid.${ext}`;
        }

        reset() {
            this.state = { files:[], processing:false, progress:0, results:[], error:null };
            this.components.dropzone?.clearFiles?.(); this.components.fileList?.clear?.(); this.components.progressBar?.reset?.(); this.components.comparisonSlider?.reset?.();
            this.updateUI(); this.emit('tool:reset', { toolId:this.config.toolId });
        }

        handleError(error) {
            this.state.error = error?.message || String(error);
            this.components.progressBar?.error?.(this.state.error);
            this.updateUI();
        }

        updateUI() {
            const processing = this.state.processing;
            const hasFiles = this.state.files.length > 0;
            const hasResults = this.state.results.some(x => x?.result?.blob);
            const processBtn = document.querySelector('#process-btn'); if (processBtn) { processBtn.disabled = processing || !hasFiles; processBtn.textContent = processing ? 'Processing...' : 'Process'; }
            const downloadBtn = document.querySelector('#download-btn'); if (downloadBtn) downloadBtn.disabled = !hasResults || processing;
            const downloadAllBtn = document.querySelector('#download-all-btn'); if (downloadAllBtn) downloadAllBtn.disabled = !hasResults || processing;
            const resetBtn = document.querySelector('#reset-btn'); if (resetBtn) resetBtn.disabled = processing;
            const resultsSection = document.querySelector('#results-section'); if (resultsSection) resultsSection.style.display = hasResults ? 'block' : 'none';
        }

        destroy() { this._listeners.splice(0).forEach(fn => fn()); Object.values(this.components).forEach(component => component?.destroy?.()); }
    }

    return { ToolController: ToolControllerInstance, createTool: config => new ToolControllerInstance(config) };
})();

globalThis.ToolController = ToolController;
if (globalThis.ToolConfig) globalThis.toolInstance = ToolController.createTool(globalThis.ToolConfig);
console.log('[Pixaroid] Tool Controller v3.0 initialized');
