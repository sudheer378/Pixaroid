/**
 * Pixaroid Compress Worker v2.0 - High Performance
 * Handles image compression with quality control, target-size compression, and batch processing
 * Optimized for speed with early-exit, smart quantization, and minimal allocations
 */
'use strict';

// Self-check for OffscreenCanvas support (faster than regular Canvas)
const useOffscreen = typeof OffscreenCanvas !== 'undefined';

self.onmessage = function(e) {
  const data = e.data;
  const jobId = data.jobId;

  try {
    if (data.op === 'compress') {
      compressImage(data);
    } else if (data.op === 'compress-target') {
      compressToTargetSize(data);
    } else if (data.op === 'compress-batch') {
      compressBatch(data);
    } else {
      throw new Error('Unknown operation: ' + data.op);
    }
  } catch (err) {
    self.postMessage({ jobId: jobId, error: err.message });
  }
};

/**
 * Fast image compression with quality control
 */
function compressImage(data) {
  const { jobId, buffer, mime, origSize, quality, format, maxWidth, maxHeight } = data;

  // Create blob from buffer
  const blob = new Blob([buffer], { type: mime });
  const img = new Image();

  img.onload = function() {
    try {
      // Calculate dimensions with optional max size constraint
      let width = img.naturalWidth;
      let height = img.naturalHeight;
      
      if (maxWidth > 0 || maxHeight > 0) {
        const ratio = Math.min(
          maxWidth > 0 ? maxWidth / width : Infinity,
          maxHeight > 0 ? maxHeight / height : Infinity,
          1
        );
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // Use OffscreenCanvas if available (2-3x faster)
      let canvas, ctx;
      if (useOffscreen) {
        canvas = new OffscreenCanvas(width, height);
        ctx = canvas.getContext('2d', { alpha: mime !== 'image/jpeg' });
      } else {
        canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        ctx = canvas.getContext('2d');
      }

      // High quality rendering with performance optimizations
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw with optional resize
      if (width !== img.naturalWidth || height !== img.naturalHeight) {
        ctx.drawImage(img, 0, 0, width, height);
      } else {
        ctx.drawImage(img, 0, 0);
      }

      // Determine output MIME type
      let outputMime = mime;
      if (format === 'jpeg' || format === 'jpg') outputMime = 'image/jpeg';
      else if (format === 'png') outputMime = 'image/png';
      else if (format === 'webp') outputMime = 'image/webp';
      else if (format === 'avif') outputMime = 'image/avif';

      // Smart quality adjustment based on format
      let q = (quality || 85) / 100;
      if (outputMime === 'image/png') {
        // PNG is lossless, quality controls compression level indirectly
        q = Math.max(0.6, Math.min(1.0, q));
      } else if (outputMime === 'image/webp') {
        // WebP is more efficient, can use lower quality
        q = Math.max(0.4, Math.min(1.0, q * 1.1));
      } else {
        q = Math.max(0.1, Math.min(1.0, q));
      }

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
              compressedSize: resultBlob.size,
              savings: origSize > 0 ? Math.round((1 - resultBlob.size / origSize) * 100) : 0
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

/**
 * Compress image to target file size using binary search
 */
function compressToTargetSize(data) {
  const { jobId, buffer, mime, origSize, targetBytes, format, minQuality } = data;
  
  const blob = new Blob([buffer], { type: mime });
  const img = new Image();
  
  img.onload = function() {
    try {
      const outputMime = getOutputMime(format, mime);
      const targetQuality = findOptimalQuality(img, outputMime, targetBytes, minQuality || 10);
      
      compressWithQuality(img, outputMime, targetQuality, jobId, origSize);
    } catch (err) {
      self.postMessage({ jobId: jobId, error: err.message });
    }
  };
  
  img.onerror = function() {
    self.postMessage({ jobId: jobId, error: 'Failed to load image' });
  };
  
  img.src = URL.createObjectURL(blob);
}

/**
 * Binary search to find optimal quality for target size
 */
function findOptimalQuality(img, mime, targetBytes, minQ) {
  let low = minQ, high = 100;
  let bestQuality = 85;
  let iterations = 0;
  const maxIterations = 8;
  
  while (low <= high && iterations < maxIterations) {
    const mid = Math.round((low + high) / 2);
    const size = estimateSize(img, mime, mid);
    
    if (Math.abs(size - targetBytes) < targetBytes * 0.05) {
      // Within 5% tolerance
      bestQuality = mid;
      break;
    }
    
    if (size > targetBytes) {
      high = mid - 1;
    } else {
      bestQuality = mid;
      low = mid + 1;
    }
    
    iterations++;
  }
  
  return bestQuality / 100;
}

/**
 * Quick size estimation without full compression
 */
function estimateSize(img, mime, quality) {
  // Rough estimation based on image dimensions and quality
  const baseSize = img.naturalWidth * img.naturalHeight * 3; // 3 bytes per pixel (RGB)
  const qualityFactor = quality / 100;
  
  // Format-specific compression ratios
  let ratio = 0.15; // JPEG default
  if (mime === 'image/webp') ratio = 0.12;
  if (mime === 'image/png') ratio = 0.35;
  
  return baseSize * ratio * qualityFactor;
}

/**
 * Compress with specific quality level
 */
function compressWithQuality(img, mime, quality, jobId, origSize) {
  const canvas = useOffscreen ? new OffscreenCanvas(img.naturalWidth, img.naturalHeight) : document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!useOffscreen) {
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
  }
  
  ctx.drawImage(img, 0, 0);
  
  canvas.toBlob(function(resultBlob) {
    if (!resultBlob) {
      self.postMessage({ jobId: jobId, error: 'Compression failed' });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(ev) {
      self.postMessage({
        jobId: jobId,
        buffer: ev.target.result,
        mime: mime,
        width: canvas.width,
        height: canvas.height,
        originalSize: origSize,
        compressedSize: resultBlob.size,
        savings: origSize > 0 ? Math.round((1 - resultBlob.size / origSize) * 100) : 0
      });
    };
    reader.readAsArrayBuffer(resultBlob);
  }, mime, quality);
}

/**
 * Batch compression for multiple images
 */
async function compressBatch(data) {
  const { jobId, files, options } = data;
  const results = [];
  const total = files.length;
  
  for (let i = 0; i < total; i++) {
    const file = files[i];
    const buffer = await readFileAsArrayBuffer(file);
    
    try {
      const result = await new Promise((resolve, reject) => {
        const tempJobId = jobId + '_' + i;
        const originalOnMessage = self.onmessage;
        
        self.onmessage = function(e) {
          if (e.data.jobId === tempJobId) {
            self.onmessage = originalOnMessage;
            if (e.data.error) {
              reject(new Error(e.data.error));
            } else {
              resolve(e.data);
            }
          }
        };
        
        compressImage({
          jobId: tempJobId,
          buffer: buffer,
          mime: file.type,
          origSize: file.size,
          quality: options.quality || 80,
          format: options.format || 'auto'
        });
        
        setTimeout(() => reject(new Error('Timeout')), 30000);
      });
      
      results.push({
        name: file.name,
        ...result
      });
      
      // Report progress
      self.postMessage({
        jobId: jobId,
        type: 'progress',
        percent: Math.round(((i + 1) / total) * 100),
        current: file.name
      });
      
    } catch (err) {
      results.push({
        name: file.name,
        error: err.message
      });
    }
  }
  
  self.postMessage({
    jobId: jobId,
    type: 'batch-complete',
    results: results
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

function getOutputMime(format, originalMime) {
  if (format === 'jpeg' || format === 'jpg') return 'image/jpeg';
  if (format === 'png') return 'image/png';
  if (format === 'webp') return 'image/webp';
  if (format === 'avif') return 'image/avif';
  return originalMime;
}

function autoFormat(mime) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  if (mime === 'image/avif') return 'avif';
  return 'jpeg';
}
