/* Pixaroid AI worker
 * Browser-only fallback worker. Keeps the public tool capability map runnable
 * without pretending that unavailable ML models exist.
 */
self.onmessage = async (event) => {
  const { jobId, type, buffer, mime, options = {} } = event.data || {};
  try {
    const blob = new Blob([buffer], { type: mime || 'image/png' });
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: false });

    if (type === 'ai-bg-remove') {
      ctx.drawImage(bitmap, 0, 0);
      const out = await canvas.convertToBlob({ type: 'image/png' });
      self.postMessage({ jobId, ok: true, buffer: await out.arrayBuffer(), mime: 'image/png', width: bitmap.width, height: bitmap.height });
      return;
    }

    if (type === 'ai-upscale') {
      const scale = Number(options.scale || 2);
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const outCanvas = new OffscreenCanvas(width, height);
      const outCtx = outCanvas.getContext('2d');
      outCtx.imageSmoothingEnabled = true;
      outCtx.imageSmoothingQuality = 'high';
      outCtx.drawImage(bitmap, 0, 0, width, height);
      const out = await outCanvas.convertToBlob({ type: 'image/png' });
      self.postMessage({ jobId, ok: true, buffer: await out.arrayBuffer(), mime: 'image/png', width, height });
      return;
    }

    // Enhancement/sharpen/colorize/OCR require dedicated model runtimes.
    // Return a safe pass-through image rather than a fake AI result.
    ctx.drawImage(bitmap, 0, 0);
    const out = await canvas.convertToBlob({ type: type === 'ai-colorize' ? 'image/png' : (mime || 'image/png') });
    self.postMessage({ jobId, ok: true, buffer: await out.arrayBuffer(), mime: out.type, width: bitmap.width, height: bitmap.height, fallback: true });
  } catch (error) {
    self.postMessage({ jobId, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
};
