/**
 * Pixaroid Image Processing Service v2.1
 * Legacy compatibility service retained for the older Pro tool family.
 *
 * Note: current production static tools use /js/engine.js and /workers/*.worker.js.
 */

const ImageProcessingService = (function(PixaroidCore) {
    'use strict';

    const { CONFIG, logger, performanceMonitor } = PixaroidCore;

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
                if (progressCallback) progressCallback({ stage: 'loading', progress: 10 });
                const img = await this.loadImage(file);
                if (progressCallback) progressCallback({ stage: 'processing', progress: 30 });

                this.canvas = document.createElement('canvas');
                this.ctx = this.canvas.getContext('2d');
                if (!this.ctx) throw new Error('Canvas 2D context is unavailable.');

                const dimensions = this.calculateDimensions(img);
                this.canvas.width = dimensions.width;
                this.canvas.height = dimensions.height;

                if (progressCallback) progressCallback({ stage: 'processing', progress: 50 });
                this.ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height);
                if (progressCallback) progressCallback({ stage: 'encoding', progress: 70 });

                const blob = await this.encodeImage();
                if (progressCallback) progressCallback({ stage: 'complete', progress: 100 });

                const duration = performanceMonitor.end(operationId) ?? 0;
                const reduction = ((1 - blob.size / file.size) * 100).toFixed(2) + '%';
                logger.info(`Processing complete: ${file.name}`, {
                    originalSize: file.size,
                    compressedSize: blob.size,
                    reduction,
                    duration: duration.toFixed(2) + 'ms'
                });

                return {
                    blob,
                    originalSize: file.size,
                    compressedSize: blob.size,
                    reduction,
                    width: dimensions.width,
                    height: dimensions.height,
                    duration
                };
            } catch (error) {
                performanceMonitor.end(operationId);
                logger.error(`Processing failed: ${file.name}`, error);
                throw error;
            } finally {
                if (this._sourceUrl) {
                    URL.revokeObjectURL(this._sourceUrl);
                    this._sourceUrl = null;
                }
            }
        }

        loadImage(file) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                this._sourceUrl = URL.createObjectURL(file);
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = this._sourceUrl;
            });
        }

        calculateDimensions(img) {
            let width = img.naturalWidth || img.width;
            let height = img.naturalHeight || img.height;

            if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
                throw new Error('Invalid image dimensions.');
            }

            if (this.options.scale) {
                const scale = Number(this.options.scale);
                if (Number.isFinite(scale) && scale > 0) {
                    width *= scale;
                    height *= scale;
                }
            }

            if (this.options.maxWidth && width > this.options.maxWidth) {
                height = (this.options.maxWidth / width) * height;
                width = this.options.maxWidth;
            }

            if (this.options.maxHeight && height > this.options.maxHeight) {
                width = (this.options.maxHeight / height) * width;
                height = this.options.maxHeight;
            }

            return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) };
        }

        async encodeImage() {
            return new Promise((resolve, reject) => {
                if (!this.canvas?.toBlob) {
                    reject(new Error('Browser image encoding is unavailable.'));
                    return;
                }
                this.canvas.toBlob(blob => {
                    if (blob) resolve(blob);
                    else reject(new Error('Failed to encode image'));
                }, this.options.format, this.options.quality);
            });
        }

        async optimizeQuality(file, targetSizeKB) {
            const targetBytes = Number(targetSizeKB) * 1024;
            if (!Number.isFinite(targetBytes) || targetBytes <= 0) {
                throw new Error('Target size must be a positive number.');
            }

            let minQuality = CONFIG.QUALITY_MIN;
            let maxQuality = CONFIG.QUALITY_MAX;
            let bestBlob = null;
            let bestQuality = minQuality;

            for (let i = 0; i < 12 && minQuality <= maxQuality + CONFIG.QUALITY_STEP / 2; i++) {
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
            }

            return {
                blob: bestBlob,
                quality: bestQuality,
                iterations: bestBlob ? 12 : 0
            };
        }

        cleanup() {
            if (this.canvas) {
                this.canvas.width = 0;
                this.canvas.height = 0;
                this.canvas = null;
                this.ctx = null;
            }
            if (this._sourceUrl) {
                URL.revokeObjectURL(this._sourceUrl);
                this._sourceUrl = null;
            }
        }
    }

    class BatchProcessor {
        constructor(concurrency = 4) {
            this.concurrency = Math.max(1, Math.floor(Number(concurrency) || 1));
            this.processor = new ImageProcessor();
            this.queue = [];
            this.results = [];
        }

        async processBatch(files, options = {}, progressCallback = null) {
            logger.info(`Starting batch processing: ${files.length} files`, options);
            this.processor = new ImageProcessor(options);
            this.results = [];
            this.queue = [...files];
            let completedFiles = 0;
            const totalFiles = files.length;

            const processLane = async () => {
                while (this.queue.length > 0) {
                    const file = this.queue.shift();
                    if (!file) continue;
                    try {
                        const result = await this.processFile(file, progressCallback, totalFiles, completedFiles);
                        completedFiles += 1;
                        this.results.push({ file: file.name, result });
                    } catch (error) {
                        completedFiles += 1;
                        this.results.push({ file: file.name, error: error.message });
                    }
                }
            };

            const laneCount = Math.min(this.concurrency, totalFiles || 1);
            await Promise.all(Array.from({ length: laneCount }, () => processLane()));

            logger.info(`Batch processing complete: ${this.results.length} files processed`);
            return this.results;
        }

        async processFile(file, progressCallback, totalFiles, completedFiles) {
            return this.processor.process(file, progress => {
                if (!progressCallback) return;
                const overallProgress = totalFiles > 0
                    ? ((completedFiles + progress.progress / 100) / totalFiles) * 100
                    : 100;
                progressCallback({
                    ...progress,
                    file: file.name,
                    overallProgress,
                    completed: completedFiles,
                    total: totalFiles
                });
            });
        }

        cleanup() {
            this.processor.cleanup();
            this.queue = [];
            this.results = [];
        }
    }

    class FormatConverter {
        static async convert(file, targetFormat, options = {}) {
            const normalized = String(targetFormat || '').toLowerCase();
            const formatMap = {
                jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
                gif: 'image/gif', bmp: 'image/bmp', tiff: 'image/tiff'
            };
            const mimeType = formatMap[normalized];
            if (!mimeType) throw new Error(`Unsupported target format: ${targetFormat}`);

            const processor = new ImageProcessor({ ...options, format: mimeType, quality: options.quality ?? 0.9 });
            try {
                const result = await processor.process(file);
                return { ...result, originalFormat: PixaroidCore.utils.getFileExtension(file.name), targetFormat: normalized };
            } finally {
                processor.cleanup();
            }
        }

        static async convertBatch(files, targetFormat, options = {}) {
            const results = [];
            for (const file of files) {
                try {
                    results.push(await this.convert(file, targetFormat, options));
                } catch (error) {
                    results.push({ fileName: file.name, error: error.message });
                }
            }
            return results;
        }
    }

    class SmartCompressor {
        static getPresets() {
            return CONFIG.COMPRESSION_PRESETS;
        }

        static async compressWithPreset(file, presetName) {
            const preset = CONFIG.COMPRESSION_PRESETS[presetName];
            if (!preset) throw new Error(`Unknown preset: ${presetName}`);
            const processor = new ImageProcessor({ quality: preset.quality });
            try {
                const result = await processor.process(file);
                return { ...result, preset: presetName, presetLabel: preset.label };
            } finally {
                processor.cleanup();
            }
        }

        static async compressToTargetSize(file, targetSizeKB) {
            const processor = new ImageProcessor();
            try {
                return await processor.optimizeQuality(file, targetSizeKB);
            } finally {
                processor.cleanup();
            }
        }
    }

    return {
        ImageProcessor,
        BatchProcessor,
        FormatConverter,
        SmartCompressor,
        createProcessor(options = {}) { return new ImageProcessor(options); },
        createBatchProcessor(concurrency = 4) { return new BatchProcessor(concurrency); },
        async compress(file, quality = 0.85) {
            const processor = new ImageProcessor({ quality });
            try { return await processor.process(file); } finally { processor.cleanup(); }
        },
        async resize(file, options = {}) {
            const processor = new ImageProcessor(options);
            try { return await processor.process(file); } finally { processor.cleanup(); }
        },
        async convert(file, format, options = {}) { return FormatConverter.convert(file, format, options); }
    };
})(PixaroidCore);

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageProcessingService;
}
