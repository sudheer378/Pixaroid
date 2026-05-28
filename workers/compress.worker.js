/**
 * Pixaroid Compress Worker
 * Handles image compression with quality control
 */
'use strict';

self.onmessage = function(e) {
  const data = e.data;
  const jobId = data.jobId;
  
  try {
    if (data.op === 'compress') {
      compressImage(data);
    } else {
      throw new Error('Unknown operation: ' + data.op);
    }
  } catch (err) {
    self.postMessage({ jobId: jobId, error: err.message });
  }
};

function compressImage(data) {
  const { jobId, buffer, mime, origSize, quality, format } = data;
  
  // Create blob from buffer
  const blob = new Blob([buffer], { type: mime });
  const img = new Image();
  
  img.onload = function() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      // High quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0);
      
      // Determine output MIME type
      let outputMime = mime;
      if (format === 'jpeg' || format === 'jpg') outputMime = 'image/jpeg';
      else if (format === 'png') outputMime = 'image/png';
      else if (format === 'webp') outputMime = 'image/webp';
      
      // Convert quality from 1-100 to 0.1-1.0
      const q = Math.max(0.1, Math.min(1.0, (quality || 85) / 100));
      
      canvas.toBlob(
        function(resultBlob) {
          if (!resultBlob) {
            self.postMessage({ jobId: jobId, error: 'Compression failed - no output' });
            return;
          }
          
          // Send back as ArrayBuffer for compatibility
          const reader = new FileReader();
          reader.onload = function(ev) {
            self.postMessage({
              jobId: jobId,
              buffer: ev.target.result,
              mime: resultBlob.type,
              width: canvas.width,
              height: canvas.height,
              format: format || autoFormat(mime),
              originalSize: origSize,
              compressedSize: resultBlob.size
            });
          };
          reader.onerror = function() {
            self.postMessage({ jobId: jobId, error: 'Failed to read compressed blob' });
          };
          reader.readAsArrayBuffer(resultBlob);
        },
        outputMime,
        q
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

function autoFormat(mime) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  return 'jpeg';
}
