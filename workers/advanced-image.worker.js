// Pixaroid Advanced Image Worker v2.0
self.onmessage = async function(e) {
  const { type, data, options } = e.data;
  try {
    if (type === 'process') {
      const bitmap = await createImageBitmap(data);
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');
      
      // Apply filters
      if (options.filter) applyFilter(ctx, options.filter);
      
      // Draw image
      ctx.drawImage(bitmap, 0, 0);
      
      // Compress/Convert
      const format = options.format || 'image/jpeg';
      const quality = options.quality || 0.8;
      const blob = await canvas.convertToBlob({ type: format, quality });
      
      self.postMessage({ success: true, blob, size: blob.size }, [blob]);
    }
  } catch (err) {
    self.postMessage({ success: false, error: err.message });
  }
};

function applyFilter(ctx, filterName) {
  // Implement filters (Grayscale, Sepia, Blur, etc.)
  if (filterName === 'grayscale') ctx.filter = 'grayscale(100%)';
  if (filterName === 'sepia') ctx.filter = 'sepia(100%)';
  if (filterName === 'blur') ctx.filter = 'blur(5px)';
}
