/**
 * Pixaroid Image Processing Service v2.2
 * Legacy compatibility service for the standalone v2 tool family.
 * Current static tools use /js/engine.js and /workers/*.worker.js.
 */
(function (PixaroidCore) {
'use strict';

if (!PixaroidCore) throw new Error('PixaroidCore is required.');
const { CONFIG, logger, performanceMonitor } = PixaroidCore;

class ImageProcessor {
    constructor(options = {}) {
        this.options = { quality:0.85, format:'image/jpeg', maxWidth:null, maxHeight:null, scale:null, ...options };
        this.canvas = null;
        this.ctx = null;
        this._sourceUrl = null;
    }

    async process(file, progressCallback = null) {
        if (!(file instanceof Blob) || file.size === 0) throw new Error('Invalid or empty file.');
        const operationId = `process_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        performanceMonitor.start(operationId);
        try {
            progressCallback?.({stage:'loading', progress:10});
            const img = await this.loadImage(file);
            progressCallback?.({stage:'processing', progress:30});
            this.canvas = document.createElement('canvas');
            this.ctx = this.canvas.getContext('2d');
            if (!this.ctx) throw new Error('Canvas 2D context is unavailable.');
            const dimensions = this.calculateDimensions(img);
            this.canvas.width = dimensions.width; this.canvas.height = dimensions.height;
            progressCallback?.({stage:'processing', progress:50});
            this.ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height);
            progressCallback?.({stage:'encoding', progress:70});
            const blob = await this.encodeImage();
            progressCallback?.({stage:'complete', progress:100});
            const duration = performanceMonitor.end(operationId) ?? 0;
            return { blob, originalSize:file.size, compressedSize:blob.size, reduction: file.size ? ((1 - blob.size / file.size) * 100).toFixed(2) : '0.00', width:dimensions.width, height:dimensions.height, duration };
        } catch (error) {
            performanceMonitor.end(operationId);
            logger.error(`Processing failed: ${file.name || 'file'}`, error);
            throw error;
        } finally { this.revokeSource(); }
    }

    loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            this.revokeSource();
            this._sourceUrl = URL.createObjectURL(file);
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load image.'));
            img.src = this._sourceUrl;
        });
    }

    revokeSource() { if (this._sourceUrl) { URL.revokeObjectURL(this._sourceUrl); this._sourceUrl = null; } }

    calculateDimensions(img) {
        let width = img.naturalWidth || img.width, height = img.naturalHeight || img.height;
        if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) throw new Error('Invalid image dimensions.');
        if (this.options.scale) { const scale = Number(this.options.scale); if (Number.isFinite(scale) && scale > 0) { width *= scale; height *= scale; } }
        if (this.options.maxWidth && width > this.options.maxWidth) { height = (this.options.maxWidth / width) * height; width = this.options.maxWidth; }
        if (this.options.maxHeight && height > this.options.maxHeight) { width = (this.options.maxHeight / height) * width; height = this.options.maxHeight; }
        return { width:Math.max(1, Math.round(width)), height:Math.max(1, Math.round(height)) };
    }

    encodeImage() {
        return new Promise((resolve, reject) => {
            if (!this.canvas?.toBlob) return reject(new Error('Browser image encoding is unavailable.'));
            const quality = Math.min(1, Math.max(0.01, Number(this.options.quality) || 0.85));
            this.canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Failed to encode image.')), this.options.format, quality);
        });
    }

    async optimizeQuality(file, targetSizeKB) {
        const targetBytes = Number(targetSizeKB) * 1024;
        if (!Number.isFinite(targetBytes) || targetBytes <= 0) throw new Error('Target size must be a positive number.');
        const originalQuality = this.options.quality;
        let low = CONFIG.QUALITY_MIN, high = CONFIG.QUALITY_MAX, bestBlob = null, bestQuality = low, iterations = 0;
        try {
            for (let i = 0; i < 12 && low <= high + CONFIG.QUALITY_STEP / 2; i++) {
                iterations++;
                const q = (low + high) / 2;
                this.options.quality = q;
                const result = await this.process(file);
                if (result.compressedSize <= targetBytes) { bestBlob = result.blob; bestQuality = q; low = q + CONFIG.QUALITY_STEP; }
                else high = q - CONFIG.QUALITY_STEP;
            }
            return { blob:bestBlob, quality:bestQuality, iterations };
        } finally { this.options.quality = originalQuality; }
    }

    cleanup() { this.revokeSource(); if (this.canvas) { this.canvas.width = 0; this.canvas.height = 0; } this.canvas = null; this.ctx = null; }
}

class BatchProcessor {
    constructor(concurrency = 4) { this.concurrency = Math.max(1, Math.floor(Number(concurrency) || 1)); this.processor = new ImageProcessor(); this.queue = []; this.results = []; }

    async processBatch(files, options = {}, progressCallback = null) {
        const list = Array.from(files || []);
        this.processor.cleanup(); this.processor = new ImageProcessor(options); this.results = new Array(list.length); this.queue = list.map((file,index)=>({file,index}));
        let completedFiles = 0;
        const worker = async () => {
            while (this.queue.length) {
                const item = this.queue.shift(); if (!item) continue;
                try {
                    const result = await this.processFile(item.file, progressCallback, list.length, completedFiles);
                    this.results[item.index] = { file:item.file.name, result };
                } catch (error) { this.results[item.index] = { file:item.file.name, error:error.message }; }
                completedFiles++;
            }
        };
        await Promise.all(Array.from({length:Math.min(this.concurrency, list.length || 1)}, worker));
        return this.results.filter(Boolean);
    }

    async processFile(file, progressCallback, totalFiles, completedFiles) {
        return this.processor.process(file, progress => progressCallback?.({ ...progress, file:file.name, overallProgress: totalFiles ? ((completedFiles + progress.progress / 100) / totalFiles) * 100 : 100, completed:completedFiles, total:totalFiles }));
    }

    cleanup() { this.processor.cleanup(); this.queue=[]; this.results=[]; }
}

class FormatConverter {
    static async convert(file, targetFormat, options = {}) {
        const normalized = String(targetFormat || '').toLowerCase();
        const map = {jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',bmp:'image/bmp',tiff:'image/tiff'};
        const mimeType = map[normalized]; if (!mimeType) throw new Error(`Unsupported target format: ${targetFormat}`);
        const processor = new ImageProcessor({...options, format:mimeType, quality:options.quality ?? 0.9});
        try { const result = await processor.process(file); return {...result, originalFormat:PixaroidCore.utils.getFileExtension(file.name), targetFormat:normalized}; }
        finally { processor.cleanup(); }
    }
    static async convertBatch(files, targetFormat, options = {}) { const results=[]; for (const file of files) { try { results.push(await this.convert(file,targetFormat,options)); } catch(error) { results.push({fileName:file.name,error:error.message}); } } return results; }
}

class SmartCompressor {
    static getPresets() { return CONFIG.COMPRESSION_PRESETS; }
    static async compressWithPreset(file, presetName) { const preset=CONFIG.COMPRESSION_PRESETS[presetName]; if(!preset) throw new Error(`Unknown preset: ${presetName}`); const processor=new ImageProcessor({quality:preset.quality}); try { return {...await processor.process(file),preset:presetName,presetLabel:preset.label}; } finally { processor.cleanup(); } }
    static async compressToTargetSize(file,targetSizeKB) { const processor=new ImageProcessor(); try { return await processor.optimizeQuality(file,targetSizeKB); } finally { processor.cleanup(); } }
}

const ImageProcessingService = {
    ImageProcessor, BatchProcessor, FormatConverter, SmartCompressor,
    createProcessor(options={}) { return new ImageProcessor(options); },
    createBatchProcessor(concurrency=4) { return new BatchProcessor(concurrency); },
    async compress(file,quality=0.85) { const p=new ImageProcessor({quality}); try{return await p.process(file);}finally{p.cleanup();} },
    async resize(file,options={}) { const p=new ImageProcessor(options); try{return await p.process(file);}finally{p.cleanup();} },
    async convert(file,format,options={}) { return FormatConverter.convert(file,format,options); }
};

if (typeof module !== 'undefined' && module.exports) module.exports = ImageProcessingService;
if (typeof window !== 'undefined') window.ImageProcessingService = ImageProcessingService;
})(typeof PixaroidCore !== 'undefined' ? PixaroidCore : null);
