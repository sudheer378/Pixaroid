/**
 * Pixaroid Resize Worker
 * Handles image resizing by pixels, percentage, or preset dimensions
 */
'use strict';

self.onmessage = function(e) {
  const data = e.data;
  const jobId = data.jobId;
  
  try {
    if (data.op === 'resize') {
      resizeImage(data);
    } else {
      throw new Error('Unknown operation: ' + data.op);
    }
  } catch (err) {
    self.postMessage({ jobId: jobId, error: err.message });
  }
};

function resizeImage(data) {
  const { jobId, buffer, mime, origSize, width, height, percent, fit, format, quality } = data;
  
  // Create blob from buffer
  const blob = new Blob([buffer], { type: mime });
  const img = new Image();
  
  img.onload = function() {
    try {
      let newWidth, newHeight;
      
      // Calculate new dimensions
      if (percent) {
        // Resize by percentage
        const scale = parseFloat(percent) / 100;
        newWidth = Math.round(img.naturalWidth * scale);
        newHeight = Math.round(img.naturalHeight * scale);
      } else if (width && height && fit === 'cover') {
        // Cover fit (crop to fill)
        const targetRatio = width / height;
        const imgRatio = img.naturalWidth / img.naturalHeight;
        
        if (imgRatio > targetRatio) {
          newHeight = height;
          newWidth = Math.round(height * imgRatio);
        } else {
          newWidth = width;
          newHeight = Math.round(width / imgRatio);
        }
      } else if (width && height && fit === 'contain') {
        // Contain fit (fit within bounds)
        const targetRatio = width / height;
        const imgRatio = img.naturalWidth / img.naturalHeight;
        
        if (imgRatio > targetRatio) {
          newWidth = width;
          newHeight = Math.round(width / imgRatio);
        } else {
          newHeight = height;
          newWidth = Math.round(height * imgRatio);
        }
      } else if (width && height) {
        // Exact dimensions (stretch)
        newWidth = parseInt(width);
        newHeight = parseInt(height);
      } else if (width) {
        // Width only, maintain aspect ratio
        newWidth = parseInt(width);
        newHeight = Math.round(img.naturalHeight * (newWidth / img.naturalWidth));
      } else if (height) {
        // Height only, maintain aspect ratio
        newHeight = parseInt(height);
        newWidth = Math.round(img.naturalWidth * (newHeight / img.naturalHeight));
      } else {
        // Fallback to original size
        newWidth = img.naturalWidth;
        newHeight = img.naturalHeight;
      }
      
      // Ensure minimum dimensions
      newWidth = Math.max(1, newWidth);
      newHeight = Math.max(1, newHeight);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      // High quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw resized image
      if (fit === 'cover' && width && height) {
        // Center crop for cover fit
        const sx = (img.naturalWidth - newWidth * (img.naturalHeight / newHeight)) / 2;
        const sy = (img.naturalHeight - newHeight * (img.naturalWidth / newWidth)) / 2;
        
        if (img.naturalWidth / img.naturalHeight > width / height) {
          ctx.drawImage(img, sx, 0, img.naturalHeight * (width / height), img.naturalHeight, 0, 0, width, height);
        } else {
          ctx.drawImage(img, 0, sy, img.naturalWidth, img.naturalWidth / (width / height), 0, 0, width, height);
        }
      } else {
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
      }
      
      // Determine output MIME type
      let outputMime = mime;
      let outputFormat = autoFormat(mime);
      
      if (format === 'jpeg' || format === 'jpg') {
        outputMime = 'image/jpeg';
        outputFormat = 'jpeg';
      } else if (format === 'png') {
        outputMime = 'image/png';
        outputFormat = 'png';
      } else if (format === 'webp') {
        outputMime = 'image/webp';
        outputFormat = 'webp';
      }
      
      const q = Math.max(0.1, Math.min(1.0, (quality || 90) / 100));
      
      canvas.toBlob(
        function(resultBlob) {
          if (!resultBlob) {
            self.postMessage({ jobId: jobId, error: 'Resize failed - no output' });
            return;
          }
          
          const reader = new FileReader();
          reader.onload = function(ev) {
            self.postMessage({
              jobId: jobId,
              buffer: ev.target.result,
              mime: resultBlob.type,
              width: newWidth,
              height: newHeight,
              format: outputFormat,
              originalSize: origSize,
              resizedSize: resultBlob.size
            });
          };
          reader.onerror = function() {
            self.postMessage({ jobId: jobId, error: 'Failed to read resized blob' });
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

function autoFormat(mime) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  return 'jpeg';
}
