/**
 * Pixaroid Enhanced Worker — legacy compatibility
 * Uses worker-safe image APIs and preserves the legacy message protocol.
 */
'use strict';

self.onmessage = async function (e) {
    const data = e.data || {};
    const jobId = data.jobId;
    try {
        const input = data.file || (data.buffer ? new Blob([data.buffer], { type:data.mime || 'application/octet-stream' }) : null);
        if (!(input instanceof Blob) || input.size === 0) throw new Error('Invalid or empty input file.');

        if (data.type === 'batch') {
            await processBatch(data, jobId);
            return;
        }

        const bitmap = await createImageBitmap(input);
        try {
            const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable.');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(bitmap, 0, 0);
            self.postMessage({ type:'progress', jobId, current:0, total:1, percent:25, message:'Processing...' });

            const operation = data.type || data.op || 'compress';
            const format = normalizeFormat(data.format || data.targetFormat || 'jpeg');
            const quality = clampQuality(data.quality, 0.9);
            let output = canvas;

            if (operation === 'resize') {
                const dims = getDimensions(bitmap.width, bitmap.height, data.width, data.height, data.maintainAspectRatio !== false);
                output = new OffscreenCanvas(dims.width, dims.height);
                const outCtx = output.getContext('2d');
                outCtx.imageSmoothingEnabled = true;
                outCtx.imageSmoothingQuality = 'high';
                outCtx.drawImage(canvas, 0, 0, dims.width, dims.height);
            }

            const blob = await output.convertToBlob({ type:format, quality });
            if (!blob) throw new Error('Processing failed.');
            self.postMessage({ type:'progress', jobId, current:1, total:1, percent:100, message:'Complete' });
            self.postMessage({ type:'complete', jobId, blob, originalSize:input.size, compressedSize:blob.size, size:blob.size, width:output.width, height:output.height, format:format.replace('image/',''), mime:format });
        } finally {
            bitmap.close();
        }
    } catch (error) {
        self.postMessage({ type:'error', jobId, error:error?.message || 'Worker processing failed.' });
    }
};

async function processBatch(data, jobId) {
    const files = Array.from(data.files || []);
    const results = [];
    const errors = [];
    for (let i = 0; i < files.length; i++) {
        try {
            const file = files[i];
            const bitmap = await createImageBitmap(file);
            const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bitmap, 0, 0);
            const blob = await canvas.convertToBlob({ type:normalizeFormat(data.options?.format || 'jpeg'), quality:clampQuality(data.options?.quality, 0.9) });
            bitmap.close();
            results.push({ filename:file.name, blob });
            self.postMessage({ type:'progress', jobId, current:i + 1, total:files.length, percent:Math.round(((i + 1) / Math.max(1, files.length)) * 100) });
        } catch (error) {
            errors.push({ filename:files[i]?.name || `file-${i + 1}`, error:error?.message || 'Processing failed.' });
        }
    }
    self.postMessage({ type:'batch-complete', jobId, results, errors });
}

function normalizeFormat(value) {
    const v = String(value).toLowerCase();
    if (v === 'jpg' || v === 'jpeg' || v === 'image/jpg') return 'image/jpeg';
    if (v === 'png' || v === 'image/png') return 'image/png';
    if (v === 'webp' || v === 'image/webp') return 'image/webp';
    if (v === 'avif' || v === 'image/avif') return 'image/avif';
    return v.startsWith('image/') ? v : 'image/jpeg';
}

function clampQuality(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    const q = n > 1 ? n / 100 : n;
    return Math.min(1, Math.max(0.05, q));
}

function getDimensions(ow, oh, width, height, maintain) {
    let w = Number(width), h = Number(height);
    if (!Number.isFinite(w) || w <= 0) w = ow;
    if (!Number.isFinite(h) || h <= 0) h = oh;
    if (maintain) {
        const ratio = Math.min(w / ow, h / oh);
        if (ratio > 0 && ratio !== 1) { w = Math.round(ow * ratio); h = Math.round(oh * ratio); }
    }
    return { width:Math.max(1, w), height:Math.max(1, h) };
}
