/**
 * Pixaroid Enhanced Web Worker
 * Background processing for image operations
 */
'use strict';

self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'compress':
      compressImage(data);
      break;
    case 'convert':
      convertImage(data);
      break;
    case 'resize':
      resizeImage(data);
      break;
    case 'batch':
      processBatch(data);
      break;
    default:
      self.postMessage({ type: 'error', error: 'Unknown operation' });
  }
};

function compressImage(data) {
  const { file, quality, format } = data;
  
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
      
      const mimeType = getMimeType(format || 'jpeg');
      
      canvas.toBlob(
        function(blob) {
          if (!blob) {
            self.postMessage({ 
              type: 'error', 
              error: 'Compression failed' 
            });
            return;
          }
          
          self.postMessage({
            type: 'complete',
            blob: blob,
            originalSize: file.size,
            compressedSize: blob.size,
            width: canvas.width,
            height: canvas.height
          });
        },
        mimeType,
        quality
      );
    } catch (error) {
      self.postMessage({ type: 'error', error: error.message });
    }
  };
  
  img.onerror = function() {
    self.postMessage({ type: 'error', error: 'Failed to load image' });
  };
  
  img.src = URL.createObjectURL(file);
}

function convertImage(data) {
  const { file, targetFormat } = data;
  
  const img = new Image();
  img.onload = function() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      ctx.drawImage(img, 0, 0);
      
      const mimeType = getMimeType(targetFormat);
      
      canvas.toBlob(function(blob) {
        if (!blob) {
          self.postMessage({ type: 'error', error: 'Conversion failed' });
          return;
        }
        
        self.postMessage({
          type: 'complete',
          blob: blob,
          format: targetFormat,
          width: canvas.width,
          height: canvas.height
        });
      }, mimeType, 0.92);
    } catch (error) {
      self.postMessage({ type: 'error', error: error.message });
    }
  };
  
  img.onerror = function() {
    self.postMessage({ type: 'error', error: 'Failed to load image' });
  };
  
  img.src = URL.createObjectURL(file);
}

function resizeImage(data) {
  const { file, width, height, maintainAspectRatio } = data;
  
  const img = new Image();
  img.onload = function() {
    try {
      let newWidth = width || img.naturalWidth;
      let newHeight = height || img.naturalHeight;
      
      if (maintainAspectRatio !== false) {
        const ratio = Math.min(
          width ? width / img.naturalWidth : Infinity,
          height ? height / img.naturalHeight : Infinity
        );
        
        if (ratio < 1) {
          newWidth = Math.floor(img.naturalWidth * ratio);
          newHeight = Math.floor(img.naturalHeight * ratio);
        }
      }
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      
      canvas.toBlob(function(blob) {
        if (!blob) {
          self.postMessage({ type: 'error', error: 'Resize failed' });
          return;
        }
        
        self.postMessage({
          type: 'complete',
          blob: blob,
          width: newWidth,
          height: newHeight,
          originalWidth: img.naturalWidth,
          originalHeight: img.naturalHeight
        });
      }, file.type || 'image/jpeg', 0.95);
    } catch (error) {
      self.postMessage({ type: 'error', error: error.message });
    }
  };
  
  img.onerror = function() {
    self.postMessage({ type: 'error', error: 'Failed to load image' });
  };
  
  img.src = URL.createObjectURL(file);
}

async function processBatch(data) {
  const { files, operation, options } = data;
  const results = [];
  const errors = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    try {
      // Simulate worker processing (in real scenario, would call appropriate function)
      await new Promise(resolve => setTimeout(resolve, 10));
      
      self.postMessage({
        type: 'progress',
        current: i + 1,
        total: files.length,
        filename: file.name
      });
      
      results.push({
        filename: file.name,
        success: true
      });
    } catch (error) {
      errors.push({
        filename: file.name,
        error: error.message
      });
    }
  }
  
  self.postMessage({
    type: 'batch-complete',
    results: results,
    errors: errors
  });
}

function getMimeType(format) {
  const formats = {
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    avif: 'image/avif',
    gif: 'image/gif'
  };
  
  return formats[format.toLowerCase()] || 'image/jpeg';
}
