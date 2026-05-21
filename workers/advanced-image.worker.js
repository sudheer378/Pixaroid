self.onmessage = async function(e) {
  const { type, file, options } = e.data;
  try {
    if (type === 'compress') {
      const img = await createImageBitmap(file);
      const canvas = new OffscreenCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const blob = await canvas.convertToBlob({ type: options.format || 'image/jpeg', quality: options.quality || 0.8 });
      self.postMessage({ success: true, blob });
    }
  } catch (err) {
    self.postMessage({ success: false, error: err.message });
  }
};
