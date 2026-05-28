/**
 * Pixaroid Convert Worker
 * Handles image format conversion
 */
'use strict';

self.onmessage = function(e) {
  const data = e.data;
  const jobId = data.jobId;
  
  try {
    if (data.op === 'convert') {
      convertImage(data);
    } else {
      throw new Error('Unknown operation: ' + data.op);
    }
  } catch (err) {
    self.postMessage({ jobId: jobId, error: err.message });
  }
};

function convertImage(data) {
  const { jobId, buffer, mime, origSize, format, quality } = data;
  
  // Create blob from buffer
  const blob = new Blob([buffer], { type: mime });
  const img = new Image();
  
  img.onload = function() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0);
      
      // Determine output MIME type
      let outputMime = 'image/jpeg';
      let outputExt = 'jpg';
      
      if (format === 'png') {
        outputMime = 'image/png';
        outputExt = 'png';
      } else if (format === 'webp') {
        outputMime = 'image/webp';
        outputExt = 'webp';
      } else if (format === 'gif') {
        outputMime = 'image/gif';
        outputExt = 'gif';
      } else if (format === 'bmp') {
        outputMime = 'image/bmp';
        outputExt = 'bmp';
      } else if (format === 'avif') {
        outputMime = 'image/avif';
        outputExt = 'avif';
      }
      
      // Quality for lossy formats
      const q = Math.max(0.1, Math.min(1.0, (quality || 90) / 100));
      
      canvas.toBlob(
        function(resultBlob) {
          if (!resultBlob) {
            self.postMessage({ jobId: jobId, error: 'Conversion failed - no output' });
            return;
          }
          
          const reader = new FileReader();
          reader.onload = function(ev) {
            self.postMessage({
              jobId: jobId,
              buffer: ev.target.result,
              mime: resultBlob.type,
              width: canvas.width,
              height: canvas.height,
              format: outputExt,
              originalSize: origSize,
              convertedSize: resultBlob.size
            });
          };
          reader.onerror = function() {
            self.postMessage({ jobId: jobId, error: 'Failed to read converted blob' });
          };
          reader.readAsArrayBuffer(resultBlob);
        },
        outputMime,
        outputMime === 'image/png' ? undefined : q
      );
    } catch (err) {
      self.postMessage({ jobId: jobId, error: err.message });
    }
  };
  
  img.onerror = function() {
    self.postMessage({ jobId: jobId, error: 'Failed to load image' });
  };
  
  img.src = URL.createObjectURL(blob);
}
