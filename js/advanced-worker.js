/**
 * Pixaroid Advanced Worker — legacy Pro compatibility
 * Uses worker-safe createImageBitmap + OffscreenCanvas APIs.
 */
'use strict';

self.onmessage = async function (e) {
    const { type, file, settings = {}, taskId } = e.data || {};
    if (type !== 'process') return;
    try {
        await processImage(file, settings, taskId);
    } catch (error) {
        self.postMessage({ type:'error', taskId, error:error?.message || 'Processing failed.' });
    }
};

async function processImage(file, settings, taskId) {
    if (!(file instanceof Blob) || file.size === 0) throw new Error('Invalid or empty input file.');
    const bitmap = await createImageBitmap(file);
    try {
        self.postMessage({ type:'progress', taskId, progress:10 });
        const source = new OffscreenCanvas(bitmap.width, bitmap.height);
        const sourceCtx = source.getContext('2d');
        if (!sourceCtx) throw new Error('OffscreenCanvas 2D context unavailable.');
        sourceCtx.drawImage(bitmap, 0, 0);

        const format = normalizeFormat(settings.format || 'image/jpeg');
        const quality = clamp(Number(settings.quality ?? 0.8), 0.05, 1);
        let output;

        if (settings.operation === 'resize') {
            const { width, height } = dimensions(bitmap.width, bitmap.height, settings.width, settings.height);
            output = await resizeImage(source, width, height, format, quality);
        } else if (settings.operation === 'compress' && settings.targetSize) {
            output = await compressToTarget(source, format, quality, Number(settings.targetSize) * 1024);
        } else {
            output = await encode(source, format, quality);
        }

        if (!output) throw new Error('Worker produced no output.');
        self.postMessage({ type:'progress', taskId, progress:90 });
        self.postMessage({ type:'complete', taskId, blob:output, size:output.size });
    } finally {
        bitmap.close();
    }
}

function normalizeFormat(value) {
    const v = String(value).toLowerCase();
    if (v === 'jpg' || v === 'jpeg') return 'image/jpeg';
    if (v === 'png') return 'image/png';
    if (v === 'webp') return 'image/webp';
    return v.startsWith('image/') ? v : 'image/jpeg';
}

function clamp(value, min, max) { return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min; }

function dimensions(ow, oh, width, height) {
    let w = Number(width), h = Number(height);
    if (!Number.isFinite(w) || w <= 0) w = ow;
    if (!Number.isFinite(h) || h <= 0) h = oh;
    if (Number.isFinite(Number(width)) && Number(width) > 0 && (!height || Number(height) <= 0)) h = Math.max(1, Math.round(oh * w / ow));
    if (Number.isFinite(Number(height)) && Number(height) > 0 && (!width || Number(width) <= 0)) w = Math.max(1, Math.round(ow * h / oh));
    return { width:Math.max(1, Math.round(w)), height:Math.max(1, Math.round(h)) };
}

async function encode(canvas, format, quality) {
    return canvas.convertToBlob({ type:format, quality });
}

async function resizeImage(canvas, width, height, format, quality) {
    const resized = new OffscreenCanvas(width, height);
    const ctx = resized.getContext('2d');
    if (!ctx) throw new Error('Resize canvas unavailable.');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, width, height);
    return encode(resized, format, quality);
}

async function compressToTarget(canvas, format, initialQuality, targetBytes) {
    let low = 0.05, high = Math.min(1, Math.max(0.95, initialQuality)), best = null;
    for (let i = 0; i < 8; i++) {
        const q = (low + high) / 2;
        const blob = await encode(canvas, format, q);
        if (blob.size <= targetBytes) { best = blob; low = q; } else high = q;
    }
    return best || encode(canvas, format, low);
}
