/**
 * Pixaroid Image Processing Service v2.0
 * Advanced image processing with Canvas API, Web Workers, and smart optimization
 */

const ImageProcessingService = (function(PixaroidCore) {
    'use strict';

    const { CONFIG, logger, performanceMonitor, eventBus } = PixaroidCore;

    // Image Processor Class
    class ImageProcessor {
        constructor(options = {}) {
            this.options = {
                quality: 0.85,
                format: 'image/jpeg',
                maxWidth: null,
                maxHeight: null,
                scale: null,
                ...options
            };
            this.canvas = null;
            this.ctx = null;
        }

        async process(file, progressCallback = null) {
            const operationId = `process_${file.name}`;
            performanceMonitor.start(operationId);
            logger.info(`Starting processing: ${file.name}`, this.options);

            try {
                // Load image
                if (progressCallback) progressCallback({ stage: 'loading', progress: 10 });
                const img = await this.loadImage(file);
                
                if (progressCallback) progressCallback({ stage: 'processing', progress: 30 });
                
                // Create canvas
                this.canvas = document.createElement('canvas');
                this.ctx = this.canvas.getContext('2d');
                
                // Calculate dimensions
                const dimensions = this.calculateDimensions(img);
                this.canvas.width = dimensions.width;
                this.canvas.height = dimensions.height;
                
                if (progressCallback) progressCallback({ stage: 'processing', progress: 50 });
                
                // Draw image
                this.ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height);
                
                if (progressCallback) progressCallback({ stage: 'encoding', progress: 70 });
                
                // Compress and encode
                const blob = await this.encodeImage();
                
                if (progressCallback) progressCallback({ stage: 'complete', progress: 100 });
                
                const duration = performanceMonitor.end(operationId);
                logger.info(`Processing complete: ${file.name}`, {
                    originalSize: file.size,
                    compressedSize: blob.size,
                    reduction: ((1 - blob.size / file.size) * 100).toFixed(2) + '%',
                    duration: duration.toFixed(2) + 'ms'
                });

                return {
                    blob,
                    originalSize: file.size,
                    compressedSize: blob.size,
                    reduction: ((1 - blob.size / file.size) * 100).toFixed(2) + '%',
                    width: dimensions.width,
                    height: dimensions.height,
                    duration
                };
            } catch (error) {
                performanceMonitor.end(operationId);
                logger.error(`Processing failed: ${file.name}`, error);
                throw error;
            }
        }

        loadImage(file) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = URL.createObjectURL(file);
            });
        }

        calculateDimensions(img) {
            let width = img.width;
            let height = img.height;

            // Apply scale
            if (this.options.scale) {
                width *= this.options.scale;
                height *= this.options.scale;
            }

            // Apply max dimensions
            if (this.options.maxWidth && width > this.options.maxWidth) {
                height = (this.options.maxWidth / width) * height;
                width = this.options.maxWidth;
            }

            if (this.options.maxHeight && height > this.options.maxHeight) {
                width = (this.options.maxHeight / height) * width;
                height = this.options.maxHeight;
            }

            // Ensure dimensions are integers
            width = Math.round(width);
            height = Math.round(height);

            return { width, height };
        }

        async encodeImage() {
            return new Promise((resolve, reject) => {
                this.canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to encode image'));
                        }
                    },
                    this.options.format,
                    this.options.quality
                );
            });
        }

        async optimizeQuality(file, targetSizeKB) {
            const targetBytes = targetSizeKB * 1024;
            let minQuality = CONFIG.QUALITY_MIN;
            let maxQuality = CONFIG.QUALITY_MAX;
            let bestBlob = null;
            let bestQuality = this.options.quality;

            // Binary search for optimal quality
            while (minQuality <= maxQuality) {
                const testQuality = (minQuality + maxQuality) / 2;
                this.options.quality = testQuality;
                
                const result = await this.process(file);
                
                if (result.compressedSize <= targetBytes) {
                    bestBlob = result.blob;
                    bestQuality = testQuality;
                    minQuality = testQuality + CONFIG.QUALITY_STEP;
                } else {
                    maxQuality = testQuality - CONFIG.QUALITY_STEP;
                }

                if (Math.abs(maxQuality - minQuality) < CONFIG.QUALITY_STEP) {
                    break;
                }
            }

            return {
                blob: bestBlob,
                quality: bestQuality,
                iterations: Math.log2(1 / CONFIG.QUALITY_STEP)
            };
        }

        cleanup() {
            if (this.canvas) {
                this.canvas.width = 0;
                this.canvas.height = 0;
                this.canvas = null;
                this.ctx = null;
            }
        }
    }

    // Batch Processor
    class BatchProcessor {
        constructor(concurrency = 4) {
            this.concurrency = concurrency;
            this.processor = new ImageProcessor();
            this.queue = [];
            this.processing = false;
            this.results = [];
        }

        async processBatch(files, options = {}, progressCallback = null) {
            logger.info(`Starting batch processing: ${files.length} files`, options);
            
            this.processor = new ImageProcessor(options);
            this.results = [];
            const totalFiles = files.length;
            let completedFiles = 0;

            const processWithConcurrency = async () => {
                const workers = [];
                
                while (this.queue.length > 0 || workers.length > 0) {
                    // Fill workers up to concurrency limit
                    while (workers.length < this.concurrency && this.queue.length > 0) {
                        const file = this.queue.shift();
                        const workerPromise = this.processFile(file, progressCallback, totalFiles, completedFiles)
                            .then(result => {
                                completedFiles++;
                                this.results.push(result);
                                return result;
                            })
                            .catch(error => {
                                completedFiles++;
                                this.results.push({ file: file.name, error: error.message });
                                return { file: file.name, error: error.message };
                            });
                        
                        workers.push(workerPromise);
                    }

                    if (workers.length > 0) {
                        await Promise.race(workers);
                        workers.splice(workers.findIndex(w => w.status === 'fulfilled' || w.status === 'rejected'), 1);
                    }
                }
            };

            // Initialize queue
            this.queue = [...files];
            await processWithConcurrency();

            logger.info(`Batch processing complete: ${this.results.length} files processed`);
            return this.results;
        }

        async processFile(file, progressCallback, totalFiles, completedFiles) {
            const result = await this.processor.process(file, (progress) => {
                if (progressCallback) {
                    const overallProgress = ((completedFiles + progress.progress / 100) / totalFiles) * 100;
                    progressCallback({
                        ...progress,
                        file: file.name,
                        overallProgress,
                        completed: completedFiles,
                        total: totalFiles
                    });
                }
            });
            
            result.fileName = file.name;
            return result;
        }

        cleanup() {
            this.processor.cleanup();
            this.queue = [];
            this.results = [];
        }
    }

    // Format Converter
    class FormatConverter {
        static async convert(file, targetFormat, options = {}) {
            logger.info(`Converting ${file.name} to ${targetFormat}`);
            
            const formatMap = {
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'webp': 'image/webp',
                'gif': 'image/gif',
                'bmp': 'image/bmp',
                'tiff': 'image/tiff'
            };

            const mimeType = formatMap[targetFormat.toLowerCase()];
            if (!mimeType) {
                throw new Error(`Unsupported target format: ${targetFormat}`);
            }

            const processor = new ImageProcessor({
                ...options,
                format: mimeType,
                quality: options.quality || 0.9
            });

            const result = await processor.process(file);
            processor.cleanup();

            return {
                ...result,
                originalFormat: PixaroidCore.utils.getFileExtension(file.name),
                targetFormat
            };
        }

        static async convertBatch(files, targetFormat, options = {}) {
            const results = [];
            for (const file of files) {
                try {
                    const result = await this.convert(file, targetFormat, options);
                    results.push(result);
                } catch (error) {
                    results.push({
                        fileName: file.name,
                        error: error.message
                    });
                }
            }
            return results;
        }
    }

    // Smart Compressor with presets
    class SmartCompressor {
        static getPresets() {
            return CONFIG.COMPRESSION_PRESETS;
        }

        static async compressWithPreset(file, presetName) {
            const preset = CONFIG.COMPRESSION_PRESETS[presetName];
            if (!preset) {
                throw new Error(`Unknown preset: ${presetName}`);
            }

            const processor = new ImageProcessor({ quality: preset.quality });
            const result = await processor.process(file);
            processor.cleanup();

            return {
                ...result,
                preset: presetName,
                presetLabel: preset.label
            };
        }

        static async compressToTargetSize(file, targetSizeKB) {
            const processor = new ImageProcessor();
            const result = await processor.optimizeQuality(file, targetSizeKB);
            processor.cleanup();

            return result;
        }
    }

    // Public API
    return {
        ImageProcessor,
        BatchProcessor,
        FormatConverter,
        SmartCompressor,

        // Factory functions
        createProcessor(options) {
            return new ImageProcessor(options);
        },

        createBatchProcessor(concurrency = 4) {
            return new BatchProcessor(concurrency);
        },

        // Quick operations
        async compress(file, quality = 0.85) {
            const processor = new ImageProcessor({ quality });
            const result = await processor.process(file);
            processor.cleanup();
            return result;
        },

        async resize(file, options) {
            const processor = new ImageProcessor(options);
            const result = await processor.process(file);
            processor.cleanup();
            return result;
        },

        async convert(file, format, options = {}) {
            return FormatConverter.convert(file, format, options);
        }
    };
})(PixaroidCore);

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageProcessingService;
}

console.log('🖼️ Image Processing Service v2.0 initialized');
