/**
 * Pixaroid Enhanced Worker compatibility adapter.
 * Legacy callers remain functional while image processing is delegated to
 * the canonical /js/engine.js worker pipeline.
 */
(function () {
  'use strict';

  const enginePromise = import('/js/engine.js');

  window.pxRunWorkerEnhanced = async function (_workerPath, payload = {}, options = {}) {
    const { compressImage, compressToTargetSize, resizeImage, convertImage, editImage } = await enginePromise;
    const buffer = payload.buffer;
    if (!(buffer instanceof ArrayBuffer)) throw new Error('Enhanced worker payload requires an ArrayBuffer.');
    const file = new File([buffer], payload.filename || 'pixaroid-input', { type: payload.mime || 'image/jpeg' });
    const op = payload.operation || payload.op || payload.type || 'compress';
    const format = payload.format || 'auto';
    let result;
    const quality = Number(payload.quality ?? 85);
    if (op === 'compress-target') {
      result = await compressToTargetSize(file, { targetKB: Number(payload.targetKB || payload.targetSizeKB), format, minQuality: Number(payload.minQuality || 10) });
    } else if (op === 'resize') {
      result = await resizeImage(file, { width:Number(payload.width || 0), height:Number(payload.height || 0), percent:Number(payload.percent || 0), preset:payload.preset, lockAspect:payload.lockAspect !== false, fit:payload.fit || 'contain', format, quality });
    } else if (op === 'convert') {
      result = await convertImage(file, { targetFormat:payload.targetFormat || format || 'jpeg', quality, background:payload.background, lossless:payload.lossless });
    } else if (op === 'edit' || ['rotate','flip','watermark','crop','blur','sharpen','adjust'].includes(op)) {
      const operations = payload.operations || [{ type:op, ...payload }];
      result = await editImage(file, operations, { format, quality });
    } else {
      result = await compressImage(file, { quality, format, maxWidth:Number(payload.maxWidth || 0) });
    }
    options.onProgress?.({ current:1, total:1, percent:100, message:'Complete' });
    return { jobId: payload.jobId, type:'complete', blob:result.blob, buffer:await result.blob.arrayBuffer(), mime:result.blob.type, width:result.width, height:result.height, format:result.format, originalSize:result.originalSize, resultSize:result.resultSize };
  };

  window.pxFindOptimalQuality = async function (file, targetSizeKB, workerPath, options = {}) {
    const target = Number(targetSizeKB);
    if (!Number.isFinite(target) || target <= 0) throw new Error('Target size must be positive.');
    const buffer = await file.arrayBuffer();
    return window.pxRunWorkerEnhanced(workerPath, { buffer, mime:file.type || 'image/jpeg', operation:'compress-target', targetKB:target, format:options.format || 'jpeg', minQuality:options.minQuality || 10 }, options);
  };
})();
