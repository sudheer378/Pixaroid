/**
 * Pixaroid Tool Controller v2.0
 * Universal controller for all image processing tools
 * Integrates Core, Services, and Premium UI components
 */

const ToolController = (function(PixaroidCore, ImageProcessingService, PremiumUI) {
    'use strict';

    const { eventBus, logger, performanceMonitor, utils } = PixaroidCore;

    class ToolController {
        constructor(toolConfig) {
            this.config = {
                toolId: null,
                toolName: 'Image Tool',
                toolType: 'compress', // compress, convert, resize, etc.
                accept: 'image/*',
                multiple: true,
                maxFiles: 50,
                maxSize: 100 * 1024 * 1024, // 100MB
                showComparison: true,
                autoProcess: false,
                ...toolConfig
            };

            this.state = {
                files: [],
                processing: false,
                progress: 0,
                results: [],
                error: null
            };

            this.components = {
                dropzone: null,
                fileList: null,
                progressBar: null,
                comparisonSlider: null
            };

            this.processor = null;
            
            this.init();
        }

        init() {
            logger.info(`Initializing ${this.config.toolName}`, this.config);
            
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setup());
            } else {
                this.setup();
            }
        }

        setup() {
            this.initializeComponents();
            this.bindEvents();
            this.updateUI();
            
            eventBus.emit('tool:ready', { toolId: this.config.toolId });
            logger.info(`${this.config.toolName} ready`);
        }

        initializeComponents() {
            // Initialize Dropzone
            const dropzoneEl = document.querySelector('#dropzone');
            if (dropzoneEl) {
                this.components.dropzone = PremiumUI.createDropzone(dropzoneEl, {
                    accept: this.config.accept,
                    multiple: this.config.multiple,
                    maxSize: this.config.maxSize,
                    maxFiles: this.config.maxFiles,
                    onFileSelect: (files) => this.handleFileSelect(files),
                    onError: (error) => this.handleError(error)
                });
            }

            // Initialize File List
            const fileListEl = document.querySelector('#file-list');
            if (fileListEl) {
                this.components.fileList = PremiumUI.createFileList(fileListEl, {
                    showPreview: true,
                    showSize: true,
                    showRemove: true,
                    showStatus: true,
                    thumbnailSize: 60
                });
            }

            // Initialize Progress Bar
            const progressEl = document.querySelector('#progress-bar');
            if (progressEl) {
                this.components.progressBar = PremiumUI.createProgressBar(progressEl, {
                    showPercentage: true,
                    showDetails: true
                });
            }

            // Initialize Comparison Slider (if enabled)
            if (this.config.showComparison) {
                const comparisonEl = document.querySelector('#comparison-slider');
                if (comparisonEl) {
                    this.components.comparisonSlider = PremiumUI.createComparisonSlider(comparisonEl, {
                        initialPosition: 50,
                        showLabels: true
                    });
                }
            }
        }

        bindEvents() {
            // Process button
            const processBtn = document.querySelector('#process-btn');
            if (processBtn) {
                processBtn.addEventListener('click', () => this.process());
            }

            // Download button
            const downloadBtn = document.querySelector('#download-btn');
            if (downloadBtn) {
                downloadBtn.addEventListener('click', () => this.download());
            }

            // Download All button (for batch)
            const downloadAllBtn = document.querySelector('#download-all-btn');
            if (downloadAllBtn) {
                downloadAllBtn.addEventListener('click', () => this.downloadAll());
            }

            // Reset button
            const resetBtn = document.querySelector('#reset-btn');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => this.reset());
            }

            // Settings change (quality, dimensions, etc.)
            const settingsInputs = document.querySelectorAll('.setting-input');
            settingsInputs.forEach(input => {
                input.addEventListener('change', (e) => this.handleSettingsChange(e));
                input.addEventListener('input', utils.debounce((e) => this.handleSettingsChange(e), 300));
            });

            // Listen for file list events
            eventBus.on('filelist:remove', (data) => {
                this.state.files = this.components.fileList.getFiles();
                this.updateUI();
            });

            eventBus.on('filelist:clear', () => {
                this.reset();
            });
        }

        handleFileSelect(files) {
            logger.info(`Files selected: ${files.length}`);
            
            this.state.files = files;
            
            if (this.components.fileList) {
                this.components.fileList.setFiles(files);
            }

            this.updateUI();

            // Auto-process if enabled
            if (this.config.autoProcess && files.length > 0) {
                this.process();
            }
        }

        handleSettingsChange(event) {
            const setting = event.target.dataset.setting;
            const value = event.target.value;
            
            logger.debug(`Setting changed: ${setting} = ${value}`);
            
            // Update processor options based on settings
            if (this.processor) {
                switch(setting) {
                    case 'quality':
                        this.processor.options.quality = parseFloat(value);
                        break;
                    case 'width':
                        this.processor.options.maxWidth = parseInt(value);
                        break;
                    case 'height':
                        this.processor.options.maxHeight = parseInt(value);
                        break;
                    case 'scale':
                        this.processor.options.scale = parseFloat(value);
                        break;
                    case 'format':
                        this.processor.options.format = value;
                        break;
                }
            }
        }

        async process() {
            if (this.state.processing || this.state.files.length === 0) {
                return;
            }

            logger.info('Starting processing');
            this.state.processing = true;
            this.state.results = [];
            this.state.error = null;
            this.updateUI();

            const operationId = `batch_${Date.now()}`;
            performanceMonitor.start(operationId);

            try {
                // Get processor options from settings
                const options = this.getProcessorOptions();

                // Create appropriate processor based on tool type
                this.processor = this.createProcessor(options);

                if (this.components.progressBar) {
                    this.components.progressBar.reset();
                }

                // Process files
                if (this.state.files.length === 1) {
                    // Single file processing
                    await this.processSingleFile(this.state.files[0]);
                } else {
                    // Batch processing
                    await this.processBatchFiles(this.state.files);
                }

                const duration = performanceMonitor.end(operationId);
                logger.info(`Processing complete in ${duration.toFixed(2)}ms`);

                // Show comparison for single file
                if (this.state.results.length === 1 && this.config.showComparison) {
                    this.showComparison(this.state.results[0]);
                }

            } catch (error) {
                logger.error('Processing failed', error);
                this.state.error = error.message;
                if (this.components.progressBar) {
                    this.components.progressBar.error(error.message);
                }
            } finally {
                this.state.processing = false;
                this.updateUI();
                eventBus.emit('tool:complete', { 
                    toolId: this.config.toolId, 
                    results: this.state.results 
                });
            }
        }

        async processSingleFile(file) {
            const result = await this.processor.process(file, (progress) => {
                if (this.components.progressBar) {
                    this.components.progressBar.update(progress.progress, progress);
                }
            });

            this.state.results.push({
                file,
                result,
                status: 'complete'
            });

            if (this.components.fileList) {
                this.components.fileList.updateFileStatus(0, 'complete', 100, result);
            }
        }

        async processBatchFiles(files) {
            const batchProcessor = ImageProcessingService.createBatchProcessor(4);
            
            const results = await batchProcessor.processBatch(files, 
                this.getProcessorOptions(),
                (progress) => {
                    if (this.components.progressBar) {
                        this.components.progressBar.update(progress.overallProgress, progress);
                    }
                    
                    // Update individual file status
                    const fileIndex = files.findIndex(f => f.name === progress.file);
                    if (fileIndex >= 0 && this.components.fileList) {
                        const status = progress.stage === 'complete' ? 'complete' : 'processing';
                        this.components.fileList.updateFileStatus(
                            fileIndex, 
                            status, 
                            Math.round(progress.progress)
                        );
                    }
                }
            );

            batchProcessor.cleanup();

            results.forEach((result, index) => {
                this.state.results.push({
                    file: files[index],
                    result,
                    status: result.error ? 'error' : 'complete'
                });

                if (this.components.fileList) {
                    this.components.fileList.updateFileStatus(
                        index,
                        result.error ? 'error' : 'complete',
                        100,
                        result
                    );
                }
            });
        }

        createProcessor(options) {
            switch(this.config.toolType) {
                case 'compress':
                    return ImageProcessingService.createProcessor({ quality: options.quality || 0.85 });
                
                case 'convert':
                    return ImageProcessingService.createProcessor({ 
                        format: options.format || 'image/jpeg',
                        quality: options.quality || 0.9
                    });
                
                case 'resize':
                    return ImageProcessingService.createProcessor({
                        maxWidth: options.maxWidth,
                        maxHeight: options.maxHeight,
                        scale: options.scale,
                        quality: options.quality || 0.85
                    });
                
                default:
                    return ImageProcessingService.createProcessor(options);
            }
        }

        getProcessorOptions() {
            const options = {};

            // Gather options from settings inputs
            const qualityInput = document.querySelector('#quality-setting');
            if (qualityInput) {
                options.quality = parseFloat(qualityInput.value);
            }

            const widthInput = document.querySelector('#width-setting');
            if (widthInput) {
                options.maxWidth = parseInt(widthInput.value);
            }

            const heightInput = document.querySelector('#height-setting');
            if (heightInput) {
                options.maxHeight = parseInt(heightInput.value);
            }

            const scaleInput = document.querySelector('#scale-setting');
            if (scaleInput) {
                options.scale = parseFloat(scaleInput.value);
            }

            const formatSelect = document.querySelector('#format-setting');
            if (formatSelect) {
                options.format = formatSelect.value;
            }

            return options;
        }

        showComparison(result) {
            if (!this.components.comparisonSlider || !result.blob) {
                return;
            }

            const beforeUrl = URL.createObjectURL(result.file);
            const afterUrl = URL.createObjectURL(result.blob);
            
            this.components.comparisonSlider.setImages(beforeUrl, afterUrl);
            
            // Clean up object URLs after some time
            setTimeout(() => {
                URL.revokeObjectURL(beforeUrl);
                URL.revokeObjectURL(afterUrl);
            }, 60000);
        }

        download() {
            if (this.state.results.length === 0) {
                return;
            }

            const result = this.state.results[0];
            if (!result.result.blob) {
                return;
            }

            const downloadUrl = URL.createObjectURL(result.result.blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = this.generateDownloadFilename(result.file);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setTimeout(() => {
                URL.revokeObjectURL(downloadUrl);
            }, 1000);

            logger.info('File downloaded');
        }

        downloadAll() {
            if (this.state.results.length === 0) {
                return;
            }

            // For multiple files, create a ZIP or download individually
            // This is a simplified version - in production you'd use JSZip
            this.state.results.forEach((result, index) => {
                if (result.result.blob) {
                    setTimeout(() => {
                        const downloadUrl = URL.createObjectURL(result.result.blob);
                        const link = document.createElement('a');
                        link.href = downloadUrl;
                        link.download = this.generateDownloadFilename(result.file);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        
                        setTimeout(() => {
                            URL.revokeObjectURL(downloadUrl);
                        }, 1000);
                    }, index * 300); // Stagger downloads
                }
            });

            logger.info(`Downloading ${this.state.results.length} files`);
        }

        generateDownloadFilename(originalFile) {
            const nameParts = originalFile.name.split('.');
            const extension = nameParts.pop();
            const name = nameParts.join('.');
            
            const timestamp = Date.now();
            return `${name}_pixaroid_${timestamp}.${extension}`;
        }

        reset() {
            logger.info('Resetting tool');
            
            this.state = {
                files: [],
                processing: false,
                progress: 0,
                results: [],
                error: null
            };

            if (this.components.dropzone) {
                this.components.dropzone.clearFiles();
            }

            if (this.components.fileList) {
                this.components.fileList.clear();
            }

            if (this.components.progressBar) {
                this.components.progressBar.reset();
            }

            if (this.components.comparisonSlider) {
                this.components.comparisonSlider.reset();
            }

            if (this.processor) {
                this.processor.cleanup();
                this.processor = null;
            }

            this.updateUI();
            eventBus.emit('tool:reset', { toolId: this.config.toolId });
        }

        handleError(error) {
            logger.error('Error occurred', error);
            this.state.error = error.message || error;
            
            // Show error to user
            alert(`Error: ${this.state.error}`);
            
            this.updateUI();
        }

        updateUI() {
            // Update button states
            const processBtn = document.querySelector('#process-btn');
            if (processBtn) {
                processBtn.disabled = this.state.processing || this.state.files.length === 0;
                processBtn.textContent = this.state.processing ? 'Processing...' : 'Process';
            }

            const downloadBtn = document.querySelector('#download-btn');
            if (downloadBtn) {
                downloadBtn.disabled = this.state.results.length === 0 || this.state.processing;
            }

            const downloadAllBtn = document.querySelector('#download-all-btn');
            if (downloadAllBtn) {
                downloadAllBtn.disabled = this.state.results.length === 0 || this.state.processing;
            }

            const resetBtn = document.querySelector('#reset-btn');
            if (resetBtn) {
                resetBtn.disabled = this.state.processing;
            }

            // Show/hide sections based on state
            const resultsSection = document.querySelector('#results-section');
            if (resultsSection) {
                resultsSection.style.display = this.state.results.length > 0 ? 'block' : 'none';
            }
        }

        destroy() {
            logger.info('Destroying tool controller');
            
            Object.values(this.components).forEach(component => {
                if (component && component.destroy) {
                    component.destroy();
                }
            });

            if (this.processor) {
                this.processor.cleanup();
            }

            eventBus.clear();
        }
    }

    // Export
    return {
        ToolController,
        
        createTool(config) {
            return new ToolController(config);
        }
    };
})(PixaroidCore, ImageProcessingService, PremiumUI);

// Auto-initialize if config exists
(function() {
    if (typeof window.ToolConfig !== 'undefined') {
        window.toolInstance = ToolController.createTool(window.ToolConfig);
    }
})();

console.log('🎮 Tool Controller v2.0 initialized');
