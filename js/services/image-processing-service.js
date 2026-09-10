/**
 * Pixaroid Image Processing Service v2.3
 * Legacy compatibility service for standalone v2 tools.
 *
 * The current static tools use /js/engine.js. This service remains a stable
 * adapter for pages that still load PixaroidCore + ToolController directly.
 */
(function (PixaroidCore) {
    'use strict';

    if (!PixaroidCore) throw new Error('PixaroidCore is required.');
    const { CONFIG, logger, performanceMonitor } = PixaroidCore;

    const DEFAULT_OPTIONS = Object.freeze({
        quality: 0.85,
        format: 'image/jpeg',
        maxWidth: null,
        maxHeight: null,
        scale: null
    });

    function clampQuality(value, fallback = DEFAULT_OPTIONS.quality) {
        const number = Number(value);
        if (!Number.isFinite(number)) return fallback;
        return Math.min(CONFIG.QUALITY_MAX, Math.max(0.01, number));
    }

    function normalizeFormat(format, fallback = DEFAULT_OPTIONS.format) {
        const value = String(format || '').trim().toLowerCase();
        const map = {
            jpg: 'image/jpeg', jpeg: 'image/jpeg',
            png: 'image/png', webp: 'image/webp',
            gif: 'image/gif', bmp: 'image/bmp', tiff: 'image/tiff'
        };
        if (value.startsWith('image/')) return value;
        return map[value] || fallback;
    }

    class ImageProcessor {
        constructor(options = {}) {
            this.options = { ...DEFAULT_OPTIONS, ...options };
            this.options.quality = clampQuality(this.options.quality);
            this.options.format = normalizeFormat(this.options.format);
            this.canvas = null;
            this.ctx = null;
            this._sourceUrl = null;
        }

        async process(file, progressCallback = null) {
            this._assertBrowser();
            if (!(file instanceof Blob) || file.size === 0) throw new Error('Invalid or empty file.');

            const operationId = PixaroidCore.utils.generateId();
            performanceMonitor.start(operationId);
            try {
                progressCallback?.({ stage: 'loading', progress: 10 });
                const image = await this.loadImage(file);
                progressCallback?.({ stage: 'processing', progress: 30 });

                this.cleanupCanvas();
                this.canvas = document.createElement('canvas');
                this.ctx = this.canvas.getContext('2d', { alpha: true });
                if (!this.ctx) throw new Error('Canvas 2D context is unavailable.');

                const dimensions = this.calculateDimensions(image);
                this.canvas.width = dimensions.width;
                this.canvas.height = dimensions.height;
                progressCallback?.({ stage: 'processing', progress: 50, width: dimensions.width, height: dimensions.height });

                this.ctx.clearRect(0, 0, dimensions.width, dimensions.height);
                this.ctx.drawImage(image, 0, 0, dimensions.width, dimensions.height);
                progressCallback?.({ stage: 'encoding', progress: 70 });

                const blob = await this.encodeImage();
                progressCallback?.({ stage: 'complete', progress: 100 });
                const duration = performanceMonitor.end(operationId) ?? 0;
                return {
                    blob,
                    originalSize: file.size,
                    compressedSize: blob.size,
                    reduction: file.size ? ((1 - blob.size / file.size) * 100).toFixed(2) : '0.00',
                    width: dimensions.width,
                    height: dimensions.height,
                    duration
                };
            } catch (error) {
                performanceMonitor.end(operationId);
                logger.error(`Processing failed: ${file.name || 'file'}`, error);
                throw error instanceof Error ? error : new Error(String(error));
            } finally {
                this.revokeSource();
                this.cleanupCanvas();
            }
        }

        loadImage(file) {
            return new Promise((resolve, reject) => {
                const image = new Image();
                this.revokeSource();
                this._sourceUrl = URL.createObjectURL(file);
                let settled = false;
                const cleanup = () => {
                    image.onload = null;
                    image.onerror = null;
                };
                image.onload = () => {
                    if (settled) return;
                    settled = true;
                    cleanup();
                    resolve(image);
                };
                image.onerror = () => {
                    if (settled) return;
                    settled = true;
                    cleanup();
                    reject(new Error(`Failed to load image: ${file.name || 'file'}`));
                };
                image.src = this._sourceUrl;
            });
        }

        revokeSource() {
            if (this._sourceUrl) {
                URL.revokeObjectURL(this._sourceUrl);
                this._sourceUrl = null;
            }
        }

        cleanupCanvas() {
            if (!this.canvas) return;
            this.canvas.width = 0;
            this.canvas.height = 0;
            this.canvas = null;
            this.ctx = null;
        }

        calculateDimensions(image) {
            let width = Number(image.naturalWidth || image.width);
            let height = Number(image.naturalHeight || image.height);
            if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
                throw new Error('Invalid image dimensions.');
            }

            const scale = Number(this.options.scale);
            if (Number.isFinite(scale) && scale > 0) {
                width *= scale;
                height *= scale;
            }

            const maxWidth = Number(this.options.maxWidth);
            if (Number.isFinite(maxWidth) && maxWidth > 0 && width > maxWidth) {
                height *= maxWidth / width;
                width = maxWidth;
            }

            const maxHeight = Number(this.options.maxHeight);
            if (Number.isFinite(maxHeight) && maxHeight > 0 && height > maxHeight) {
                width *= maxHeight / height;
                height = maxHeight;
            }

            return {
                width: Math.max(1, Math.round(width)),
                height: Math.max(1, Math.round(height))
            };
        }

        encodeImage() {
            return new Promise((resolve, reject) => {
                if (!this.canvas?.toBlob) {
                    reject(new Error('Browser image encoding is unavailable.'));
                    return;
                }
                this.canvas.toBlob(
                    blob => blob ? resolve(blob) : reject(new Error('Failed to encode image.')),
                    this.options.format,
                    clampQuality(this.options.quality)
                );
            });
        }

        async optimizeQuality(file, targetSizeKB) {
            const targetBytes = Number(targetSizeKB) * 1024;
            if (!Number.isFinite(targetBytes) || targetBytes <= 0) {
                throw new Error('Target size must be a positive number.');
            }

            const originalQuality = this.options.quality;
            let low = CONFIG.QUALITY_MIN;
            let high = CONFIG.QUALITY_MAX;
            let bestBlob = null;
            let bestQuality = low;
            let iterations = 0;

            try {
                for (let i = 0; i < 12 && low <= high + CONFIG.QUALITY_STEP / 2; i += 1) {
                    iterations += 1;
                    const quality = (low + high) / 2;
                    this.options.quality = quality;
                    const result = await this.process(file);

                    if (result.compressedSize <= targetBytes) {
                        bestBlob = result.blob;
                        bestQuality = quality;
                        low = quality + CONFIG.QUALITY_STEP;
                    } else {
                        high = quality - CONFIG.QUALITY_STEP;
                    }
                }

                return { blob: bestBlob, quality: bestQuality, iterations };
            } finally {
                this.options.quality = originalQuality;
            }
        }

        cleanup() {
            this.revokeSource();
            this.cleanupCanvas();
        }

        _assertBrowser() {
            if (typeof document === 'undefined' || typeof Image === 'undefined' || typeof URL === 'undefined') {
                throw new Error('Browser image APIs are unavailable.');
            }
        }
    }

    class BatchProcessor {
        constructor(concurrency = 4) {
            this.concurrency = Math.max(1, Math.floor(Number(concurrency) || 1));
            this.processor = null;
            this.queue = [];
            this.results = [];
        }

        async processBatch(files, options = {}, progressCallback = null) {
            const list = Array.from(files || []);
            if (list.length > CONFIG.MAX_BATCH_SIZE) {
                throw new Error(`Maximum ${CONFIG.MAX_BATCH_SIZE} files allowed`);
            }

            this.cleanup();
            this.processor = new ImageProcessor(options);
            this.results = new Array(list.length);
            this.queue = list.map((file, index) => ({ file, index }));
            let completedFiles = 0;

            const worker = async () => {
                while (true) {
                    const item = this.queue.shift();
                    if (!item) return;
                    try {
                        const result = await this.processor.process(item.file, progress => {
                            progressCallback?.({
                                ...progress,
                                file: item.file.name,
                                overallProgress: list.length ? ((completedFiles + progress.progress / 100) / list.length) * 100 : 100,
                                completed: completedFiles,
                                total: list.length
                            });
                        });
                        this.results[item.index] = { file: item.file.name, result };
                    } catch (error) {
                        this.results[item.index] = { file: item.file.name, error: error?.message || String(error) };
                    } finally {
                        completedFiles += 1;
                    }
                }
            };

            await Promise.all(Array.from({ length: Math.min(this.concurrency, Math.max(1, list.length)) }, worker));
            return this.results;
        }

        cleanup() {
            this.processor?.cleanup();
            this.processor = null;
            this.queue = [];
            this.results = [];
        }
    }

    class FormatConverter {
        static async convert(file, targetFormat, options = {}) {
            const normalized = String(targetFormat || '').trim().toLowerCase();
            const mimeType = normalizeFormat(normalized, '');
            if (!mimeType) throw new Error(`Unsupported target format: ${targetFormat}`);

            const processor = new ImageProcessor({
                ...options,
                format: mimeType,
                quality: options.quality ?? 0.9
            });
            try {
                const result = await processor.process(file);
                return {
                    ...result,
                    originalFormat: PixaroidCore.utils.getFileExtension(file.name || ''),
                    targetFormat: normalized.replace(/^image\//, '')
                };
            } finally {
                processor.cleanup();
            }
        }

        static async convertBatch(files, targetFormat, options = {}) {
            const results = [];
            for (const file of Array.from(files || [])) {
                try {
                    results.push(await this.convert(file, targetFormat, options));
                } catch (error) {
                    results.push({ fileName: file.name, error: error?.message || String(error) });
                }
            }
            return results;
        }
    }

    class SmartCompressor {
        static getPresets() { return CONFIG.COMPRESSION_PRESETS; }

        static async compressWithPreset(file, presetName) {
            const preset = CONFIG.COMPRESSION_PRESETS[presetName];
            if (!preset) throw new Error(`Unknown preset: ${presetName}`);
            const processor = new ImageProcessor({ quality: preset.quality });
            try {
                return { ...await processor.process(file), preset: presetName, presetLabel: preset.label };
            } finally {
                processor.cleanup();
            }
        }

        static async compressToTargetSize(file, targetSizeKB) {
            const processor = new ImageProcessor();
            try { return await processor.optimizeQuality(file, targetSizeKB); }
            finally { processor.cleanup(); }
        }
    }

    const ImageProcessingService = {
        version: '2.3.0',
        ImageProcessor,
        BatchProcessor,
        FormatConverter,
        SmartCompressor,
        createProcessor(options = {}) { return new ImageProcessor(options); },
        createBatchProcessor(concurrency = 4) { return new BatchProcessor(concurrency); },
        async compress(file, quality = 0.85) {
            const processor = new ImageProcessor({ quality });
            try { return await processor.process(file); }
            finally { processor.cleanup(); }
        },
        async resize(file, options = {}) {
            const processor = new ImageProcessor(options);
            try { return await processor.process(file); }
            finally { processor.cleanup(); }
        },
        async convert(file, format, options = {}) { return FormatConverter.convert(file, format, options); }
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = ImageProcessingService;
    if (typeof window !== 'undefined') window.ImageProcessingService = ImageProcessingService;
})(typeof PixaroidCore !== 'undefined' ? PixaroidCore : null);
