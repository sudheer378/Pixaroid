/**
 * Pixaroid Compress Worker v3.0
 * Browser-safe image compression worker.
 * Uses createImageBitmap + OffscreenCanvas; never accesses document or HTMLImageElement APIs.
 */
'use strict';

const hasOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';
const hasImageBitmap = typeof createImageBitmap === 'function';

self.onmessage = async function (event) {
  const data = event.data || {};
  const jobId = data.jobId;

  try {
    if (!hasOffscreenCanvas || !hasImageBitmap) {
      throw new Error('This browser does not support the image-processing APIs required by Pixaroid. Please use a current Chrome, Edge, Firefox, or Safari browser.');
    }

    if (data.op === 'compress') {
      const result = await compressImage(data);
      postResult(jobId, result);
    } else if (data.op === 'compress-target') {
      const result = await compressToTargetSize(data);
      postResult(jobId, result);
    } else if (data.op === 'compress-batch') {
      await compressBatch(data);
    } else {
      throw new Error('Unknown operation: ' + data.op);
    }
  } catch (error) {
    self.postMessage({ jobId, error: error && error.message ? error.message : String(error) });
  }
};

function postResult(jobId, result) {
  self.postMessage({ jobId, ...result }, result && result.buffer ? [result.buffer] : []);
}

async function decodeImage(buffer, mime) {
  const blob = new Blob([buffer], { type: mime || 'application/octet-stream' });
  const bitmap = await createImageBitmap(blob);
  return bitmap;
}

function outputMime(format, originalMime) {
  const f = String(format || '').toLowerCase();
  if (f === 'jpeg' || f === 'jpg') return 'image/jpeg';
  if (f === 'png') return 'image/png';
  if (f === 'webp') return 'image/webp';
  if (f === 'avif') return 'image/avif';
  return originalMime || 'image/jpeg';
}

function autoFormat(mime) {
  const m = String(mime || '').toLowerCase();
  if (m === 'image/png') return 'png';
  if (m === 'image/webp') return 'webp';
  if (m === 'image/avif') return 'avif';
  if (m === 'image/gif') return 'gif';
  return 'jpeg';
}

function dimensions(bitmap, maxWidth, maxHeight) {
  let width = bitmap.width;
  let height = bitmap.height;
  const mw = Number(maxWidth) || 0;
  const mh = Number(maxHeight) || 0;

  if (mw > 0 || mh > 0) {
    const ratio = Math.min(
      mw > 0 ? mw / width : Infinity,
      mh > 0 ? mh / height : Infinity,
      1
    );
    width = Math.max(1, Math.round(width * ratio));
    height = Math.max(1, Math.round(height * ratio));
  }

  return { width, height };
}

function makeCanvas(bitmap, width, height, mime) {
  const canvas = new OffscreenCanvas(width, height);
  const alpha = mime !== 'image/jpeg';
  const ctx = canvas.getContext('2d', { alpha });
  if (!ctx) throw new Error('Unable to create an image canvas.');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (mime === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas;
}

async function encode(canvas, mime, quality) {
  const q = Math.max(0.05, Math.min(1, Number(quality) || 0.85));
  const blob = await canvas.convertToBlob({ type: mime, quality: q });
  if (!blob) throw new Error('Compression failed - no output was produced.');
  const buffer = await blob.arrayBuffer();
  return { blob, buffer };
}

async function compressImage(data) {
  const bitmap = await decodeImage(data.buffer, data.mime);
  try {
    const mime = outputMime(data.format, data.mime);
    const { width, height } = dimensions(bitmap, data.maxWidth, data.maxHeight);
    const canvas = makeCanvas(bitmap, width, height, mime);
    const quality = Math.max(0.05, Math.min(1, (Number(data.quality) || 85) / 100));
    const encoded = await encode(canvas, mime, quality);

    return {
      buffer: encoded.buffer,
      mime: encoded.blob.type || mime,
      width,
      height,
      format: data.format && data.format !== 'auto' ? data.format : autoFormat(encoded.blob.type || mime),
      originalSize: Number(data.origSize) || data.buffer.byteLength || 0,
      compressedSize: encoded.blob.size,
      savings: Number(data.origSize) > 0 ? Math.round((1 - encoded.blob.size / data.origSize) * 100) : 0
    };
  } finally {
    bitmap.close();
  }
}

async function compressToTargetSize(data) {
  const bitmap = await decodeImage(data.buffer, data.mime);
  try {
    const mime = outputMime(data.format, data.mime);
    const targetBytes = Math.max(1, Number(data.targetBytes) || 100 * 1024);
    const minQuality = Math.max(1, Math.min(80, Number(data.minQuality) || 10));

    // PNG is lossless, so quality cannot reliably enforce a target size.
    // For PNG requests we still encode at the lowest practical quality value,
    // then report the actual output size instead of falsely claiming success.
    if (mime === 'image/png') {
      const canvas = makeCanvas(bitmap, bitmap.width, bitmap.height, mime);
      const encoded = await encode(canvas, mime, minQuality / 100);
      return targetResult(encoded, bitmap.width, bitmap.height, data, mime, targetBytes, minQuality);
    }

    let width = bitmap.width;
    let height = bitmap.height;
    let best = null;

    // First search quality at the original dimensions.
    best = await searchQuality(bitmap, width, height, mime, targetBytes, minQuality);

    // If the minimum quality is still too large, progressively reduce dimensions.
    // This makes 10KB/20KB/etc. tools much more useful on large photos.
    for (let pass = 0; pass < 6 && best.blob.size > targetBytes; pass++) {
      const ratio = Math.max(0.45, Math.sqrt(targetBytes / best.blob.size));
      const nextWidth = Math.max(32, Math.floor(width * ratio));
      const nextHeight = Math.max(32, Math.floor(height * ratio));
      if (nextWidth >= width && nextHeight >= height) break;
      width = nextWidth;
      height = nextHeight;
      best = await searchQuality(bitmap, width, height, mime, targetBytes, minQuality);
    }

    return targetResult(best, width, height, data, mime, targetBytes, minQuality);
  } finally {
    bitmap.close();
  }
}

async function searchQuality(bitmap, width, height, mime, targetBytes, minQuality) {
  let low = minQuality;
  let high = 100;
  let bestUnder = null;
  let smallest = null;

  for (let i = 0; i < 9; i++) {
    if (low > high) break;
    const quality = Math.round((low + high) / 2);
    const canvas = makeCanvas(bitmap, width, height, mime);
    const encoded = await encode(canvas, mime, quality / 100);
    const candidate = { ...encoded, quality };

    if (!smallest || candidate.blob.size < smallest.blob.size) smallest = candidate;

    if (candidate.blob.size <= targetBytes) {
      bestUnder = candidate;
      low = quality + 1;
    } else {
      high = quality - 1;
    }
  }

  return bestUnder || smallest;
}

function targetResult(encoded, width, height, data, mime, targetBytes, minQuality) {
  const size = encoded.blob.size;
  return {
    buffer: encoded.buffer,
    mime: encoded.blob.type || mime,
    width,
    height,
    format: data.format && data.format !== 'auto' ? data.format : autoFormat(encoded.blob.type || mime),
    originalSize: Number(data.origSize) || data.buffer.byteLength || 0,
    compressedSize: size,
    targetBytes,
    targetReached: size <= targetBytes,
    quality: encoded.quality || minQuality,
    savings: Number(data.origSize) > 0 ? Math.round((1 - size / data.origSize) * 100) : 0
  };
}

async function compressBatch(data) {
  const files = Array.isArray(data.files) ? data.files : [];
  const options = data.options || {};
  const results = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const buffer = await readFileAsArrayBuffer(file);
      const result = await compressImage({
        buffer,
        mime: file.type,
        origSize: file.size,
        quality: options.quality || 80,
        format: options.format || 'auto',
        maxWidth: options.maxWidth || 0,
        maxHeight: options.maxHeight || 0
      });
      results.push({ name: file.name, ...result });
    } catch (error) {
      results.push({ name: file.name, error: error && error.message ? error.message : String(error) });
    }

    self.postMessage({
      jobId: data.jobId,
      type: 'progress',
      percent: Math.round(((i + 1) / Math.max(1, files.length)) * 100),
      current: file.name
    });
  }

  self.postMessage({
    jobId: data.jobId,
    type: 'batch-complete',
    results,
    successCount: results.filter(r => !r.error).length,
    errorCount: results.filter(r => r.error).length
  });
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}
