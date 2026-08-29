/**
 * Resize & Dimension Worker v3.0 - High Performance
 * Handles image resizing, cropping, and dimension manipulation
 * Features: OffscreenCanvas, Parallel Batch Processing, Smart Scaling
 * Optimized for speed with multi-step downscaling and concurrent processing
 */
'use strict';

const useOffscreen = typeof OffscreenCanvas !== 'undefined';
const MAX_CONCURRENT = 4; // Process 4 images in parallel for batch operations

self.onmessage = function(e) {
  const data = e.data;
  const jobId = data.jobId;
  
  try {
    if (data.op === 'resize') {
      resizeImage(data);
    } else if (data.op === 'crop') {
      cropImage(data);
    } else if (data.op === 'get-dimensions') {
      getDimensions(data);
    } else if (data.op === 'resize-batch') {
      resizeBatchParallel(data);
    } else {
      throw new Error('Unknown operation: ' + data.op);
    }
  } catch (err) {
    self.postMessage({ jobId: jobId, error: err.message, stack: err.stack });
  }
};

// Smart multi-step downscaling for better quality
function smartScale(ctx, img, targetWidth, targetHeight, quality = 'high') {
  let source = img;
  let currentWidth = img.width;
  let currentHeight = img.height;
  
  // Multi-step downscaling when reducing by more than 50%
  if (quality === 'high' && targetWidth < currentWidth * 0.6) {
    while (currentWidth > targetWidth * 1.3) {
      const stepRatio = 0.6;
      const stepWidth = Math.max(targetWidth, Math.floor(currentWidth * stepRatio));
      const stepHeight = Math.floor(currentHeight * stepRatio);
      
      const stepCanvas = useOffscreen ? new OffscreenCanvas(stepWidth, stepHeight) : document.createElement('canvas');
      if (!useOffscreen) {
        stepCanvas.width = stepWidth;
        stepCanvas.height = stepHeight;
      }
      const stepCtx = stepCanvas.getContext('2d');
      stepCtx.imageSmoothingEnabled = true;
      stepCtx.imageSmoothingQuality = 'high';
      stepCtx.drawImage(source, 0, 0, stepWidth, stepHeight);
      
      source = stepCanvas;
      currentWidth = stepWidth;
      currentHeight = stepHeight;
    }
  }
  
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = quality === 'high' ? 'high' : 'medium';
  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
}

function resizeImage(data) {
  const { jobId, buffer, mime, origSize, width, height, percent, preset, fit, lockAspect, format, quality, qualityMode } = data;

  const blob = new Blob([buffer], { type: mime });
  const img = new Image();

  img.onload = function() {
    try {
      let targetWidth = img.naturalWidth;
      let targetHeight = img.naturalHeight;

      // Calculate dimensions based on input parameters
      if (percent && percent > 0) {
        const scale = percent / 100;
        targetWidth = Math.round(img.naturalWidth * scale);
        targetHeight = Math.round(img.naturalHeight * scale);
      } else if (preset) {
        const presets = {
          'instagram-square': { w: 1080, h: 1080 },
          'instagram-portrait': { w: 1080, h: 1350 },
          'instagram-landscape': { w: 1080, h: 566 },
          'facebook-post': { w: 1200, h: 630 },
          'twitter-post': { w: 1200, h: 675 },
          'youtube-thumbnail': { w: 1280, h: 720 },
          'linkedin-post': { w: 1200, h: 627 },
          'tiktok': { w: 1080, h: 1920 },
          'pinterest': { w: 1000, h: 1500 }
        };
        
        if (presets[preset]) {
          targetWidth = presets[preset].w;
          targetHeight = presets[preset].h;
        }
      } else if (width || height) {
        if (lockAspect !== false) {
          const ratio = Math.min(
            width ? width / img.naturalWidth : Infinity,
            height ? height / img.naturalHeight : Infinity
          );
          targetWidth = Math.round(img.naturalWidth * ratio);
          targetHeight = Math.round(img.naturalHeight * ratio);
        } else {
          targetWidth = width || img.naturalWidth;
          targetHeight = height || img.naturalHeight;
        }
      }

      // Use OffscreenCanvas if available
      let canvas, ctx;
      if (useOffscreen) {
        canvas = new OffscreenCanvas(targetWidth, targetHeight);
        ctx = canvas.getContext('2d', { alpha: format !== 'jpeg' });
      } else {
        canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        ctx = canvas.getContext('2d');
      }

      // Apply background for JPEG output
      if (format === 'jpeg' || format === 'jpg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw resized image with smart scaling
      if (fit === 'cover') {
        const scale = Math.max(targetWidth / img.naturalWidth, targetHeight / img.naturalHeight);
        const x = (targetWidth - img.naturalWidth * scale) / 2;
        const y = (targetHeight - img.naturalHeight * scale) / 2;
        ctx.drawImage(img, x, y, img.naturalWidth * scale, img.naturalHeight * scale);
      } else if (fit === 'contain') {
        const scale = Math.min(targetWidth / img.naturalWidth, targetHeight / img.naturalHeight);
        const x = (targetWidth - img.naturalWidth * scale) / 2;
        const y = (targetHeight - img.naturalHeight * scale) / 2;
        ctx.drawImage(img, x, y, img.naturalWidth * scale, img.naturalHeight * scale);
      } else {
        smartScale(ctx, img, targetWidth, targetHeight, qualityMode || 'high');
      }

      // Determine output MIME type
      let outputMime = 'image/jpeg';
      if (format === 'png') outputMime = 'image/png';
      else if (format === 'webp') outputMime = 'image/webp';
      else if (format === 'avif') outputMime = 'image/avif';

      const q = Math.max(0.1, Math.min(1.0, (quality || 90) / 100));

      const convertBlob = () => {
        if (useOffscreen) {
          return canvas.convertToBlob({ type: outputMime, quality: q });
        } else {
          return new Promise(resolve => canvas.toBlob(resolve, outputMime, q));
        }
      };

      convertBlob().then(function(resultBlob) {
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
            width: canvas.width,
            height: canvas.height,
            format: format || 'jpeg',
            originalSize: origSize,
            resizedSize: resultBlob.size,
            savings: origSize > 0 ? Math.round((1 - resultBlob.size / origSize) * 100) : 0
          });
        };
        reader.onerror = function() {
          self.postMessage({ jobId: jobId, error: 'Failed to read resized blob' });
        };
        reader.readAsArrayBuffer(resultBlob);
      }).catch(err => {
        self.postMessage({ jobId: jobId, error: err.message });
      });
    } catch (err) {
      self.postMessage({ jobId: jobId, error: err.message, stack: err.stack });
    }
  };

  img.onerror = function() {
    self.postMessage({ jobId: jobId, error: 'Failed to load image' });
  };

  img.src = URL.createObjectURL(blob);
}

function cropImage(data) {
  const { jobId, buffer, mime, origSize, x, y, width, height, format, quality } = data;

  const blob = new Blob([buffer], { type: mime });
  const img = new Image();

  img.onload = function() {
    try {
      // Ensure crop area is within bounds
      const cropX = Math.max(0, Math.min(x || 0, img.naturalWidth - 1));
      const cropY = Math.max(0, Math.min(y || 0, img.naturalHeight - 1));
      const cropW = Math.min(width || img.naturalWidth, img.naturalWidth - cropX);
      const cropH = Math.min(height || img.naturalHeight, img.naturalHeight - cropY);

      let canvas, ctx;
      if (useOffscreen) {
        canvas = new OffscreenCanvas(cropW, cropH);
        ctx = canvas.getContext('2d', { alpha: format !== 'jpeg' });
      } else {
        canvas = document.createElement('canvas');
        canvas.width = cropW;
        canvas.height = cropH;
        ctx = canvas.getContext('2d');
      }

      if (format === 'jpeg' || format === 'jpg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      let outputMime = 'image/png';
      if (format === 'jpeg' || format === 'jpg') outputMime = 'image/jpeg';
      else if (format === 'webp') outputMime = 'image/webp';

      const q = Math.max(0.1, Math.min(1.0, (quality || 90) / 100));

      const convertBlob = () => {
        if (useOffscreen) {
          return canvas.convertToBlob({ type: outputMime, quality: q });
        } else {
          return new Promise(resolve => canvas.toBlob(resolve, outputMime, q));
        }
      };

      convertBlob().then(function(resultBlob) {
        const reader = new FileReader();
        reader.onload = function(ev) {
          self.postMessage({
            jobId: jobId,
            buffer: ev.target.result,
            mime: resultBlob.type,
            width: cropW,
            height: cropH,
            format: format || 'png',
            originalSize: origSize,
            croppedSize: resultBlob.size
          });
        };
        reader.readAsArrayBuffer(resultBlob);
      });
    } catch (err) {
      self.postMessage({ jobId: jobId, error: err.message });
    }
  };

  img.onerror = function() {
    self.postMessage({ jobId: jobId, error: 'Failed to load image' });
  };

  img.src = URL.createObjectURL(blob);
}

function getDimensions(data) {
  const { jobId, buffer, mime } = data;

  const blob = new Blob([buffer], { type: mime });
  const img = new Image();

  img.onload = function() {
    self.postMessage({
      jobId: jobId,
      width: img.naturalWidth,
      height: img.naturalHeight,
      aspectRatio: (img.naturalWidth / img.naturalHeight).toFixed(4)
    });
  };

  img.onerror = function() {
    self.postMessage({ jobId: jobId, error: 'Failed to load image' });
  };

  img.src = URL.createObjectURL(blob);
}

async function resizeBatchParallel(data) {
  const { jobId, files, options } = data;
  const results = [];
  const total = files.length;
  const errors = [];

  // Process in chunks of MAX_CONCURRENT
  for (let i = 0; i < total; i += MAX_CONCURRENT) {
    const chunk = files.slice(i, i + MAX_CONCURRENT);
    const chunkPromises = chunk.map(async (file, idx) => {
      const fileIndex = i + idx;
      try {
        const buffer = await readFileAsArrayBuffer(file);
        
        return new Promise((resolve) => {
          const tempJobId = `${jobId}_${fileIndex}`;
          const originalHandler = self.onmessage;
          
          const handler = function(e) {
            if (e.data.jobId === tempJobId) {
              self.onmessage = originalHandler;
              if (e.data.error) {
                resolve({ name: file.name, error: e.data.error });
              } else {
                resolve({ name: file.name, ...e.data });
              }
            }
          };
          
          self.onmessage = handler;
          
          resizeImage({
            jobId: tempJobId,
            buffer: buffer,
            mime: file.type,
            origSize: file.size,
            width: options.width || 0,
            height: options.height || 0,
            percent: options.percent || 0,
            preset: options.preset || '',
            fit: options.fit || 'contain',
            lockAspect: options.lockAspect !== false,
            format: options.format || 'jpeg',
            quality: options.quality || 90,
            qualityMode: options.qualityMode || 'high'
          });
          
          // Timeout after 60 seconds
          setTimeout(() => {
            self.onmessage = originalHandler;
            resolve({ name: file.name, error: 'Timeout' });
          }, 60000);
        });
      } catch (err) {
        return { name: file.name, error: err.message };
      }
    });
    
    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
    
    // Report progress
    const processed = Math.min(i + MAX_CONCURRENT, total);
    self.postMessage({
      jobId: jobId,
      type: 'progress',
      percent: Math.round((processed / total) * 100),
      processed: processed,
      total: total
    });
  }

  self.postMessage({
    jobId: jobId,
    type: 'batch-complete',
    results: results,
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
