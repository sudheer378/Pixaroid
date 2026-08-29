/**
 * Pixaroid Resize Worker v2.0 - High Performance
 * Handles image resizing with smart scaling algorithms
 * Optimized for speed with OffscreenCanvas and batch processing
 */
'use strict';

const useOffscreen = typeof OffscreenCanvas !== 'undefined';

self.onmessage = function(e) {
  const data = e.data;
  const jobId = data.jobId;

  try {
    if (data.op === 'resize') {
      resizeImage(data);
    } else if (data.op === 'resize-batch') {
      resizeBatch(data);
    } else {
      throw new Error('Unknown operation: ' + data.op);
    }
  } catch (err) {
    self.postMessage({ jobId: jobId, error: err.message });
  }
};

function resizeImage(data) {
  const { jobId, buffer, mime, origSize, width, height, percent, preset, fit, lockAspect, format, quality } = data;

  const blob = new Blob([buffer], { type: mime });
  const img = new Image();

  img.onload = function() {
    try {
      let targetWidth = img.naturalWidth;
      let targetHeight = img.naturalHeight;

      // Calculate dimensions based on input parameters
      if (percent && percent > 0) {
        // Percentage-based resize
        const scale = percent / 100;
        targetWidth = Math.round(img.naturalWidth * scale);
        targetHeight = Math.round(img.naturalHeight * scale);
      } else if (preset) {
        // Preset sizes (social media, etc.)
        const presets = {
          'instagram-square': 1080,
          'instagram-portrait': 1080,
          'instagram-landscape': 1080,
          'facebook-post': 1200,
          'twitter-post': 1200,
          'youtube-thumbnail': 1280,
          'linkedin-post': 1200,
          'tiktok': 1080,
          'pinterest': 1000
        };
        
        if (presets[preset]) {
          if (preset.includes('square')) {
            targetWidth = targetHeight = presets[preset];
          } else if (preset.includes('portrait')) {
            targetWidth = presets[preset];
            targetHeight = Math.round(presets[preset] * 1.25);
          } else if (preset === 'youtube-thumbnail') {
            targetWidth = 1280;
            targetHeight = 720;
          } else if (preset === 'tiktok') {
            targetWidth = 1080;
            targetHeight = 1920;
          } else {
            // Landscape default
            targetWidth = presets[preset];
            targetHeight = Math.round(presets[preset] * 0.75);
          }
        }
      } else if (width || height) {
        // Dimension-based resize
        if (lockAspect !== false) {
          // Maintain aspect ratio
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

      // High quality scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Apply background for JPEG output
      if (format === 'jpeg' || format === 'jpg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw resized image
      if (fit === 'cover') {
        // Cover fit (crop to fill)
        const scale = Math.max(targetWidth / img.naturalWidth, targetHeight / img.naturalHeight);
        const x = (targetWidth - img.naturalWidth * scale) / 2;
        const y = (targetHeight - img.naturalHeight * scale) / 2;
        ctx.drawImage(img, x, y, img.naturalWidth * scale, img.naturalHeight * scale);
      } else if (fit === 'contain') {
        // Contain fit (letterbox)
        const scale = Math.min(targetWidth / img.naturalWidth, targetHeight / img.naturalHeight);
        const x = (targetWidth - img.naturalWidth * scale) / 2;
        const y = (targetHeight - img.naturalHeight * scale) / 2;
        ctx.drawImage(img, x, y, img.naturalWidth * scale, img.naturalHeight * scale);
      } else {
        // Stretch to fill
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      }

      // Determine output MIME type
      let outputMime = 'image/jpeg';
      if (format === 'png') outputMime = 'image/png';
      else if (format === 'webp') outputMime = 'image/webp';

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

async function resizeBatch(data) {
  const { jobId, files, options } = data;
  const results = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    const buffer = await readFileAsArrayBuffer(file);

    try {
      const result = await new Promise((resolve, reject) => {
        const tempJobId = jobId + '_' + i;
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
          quality: options.quality || 90
        });

        self.onmessage = function(e) {
          if (e.data.jobId === tempJobId) {
            if (e.data.error) {
              reject(new Error(e.data.error));
            } else {
              resolve(e.data);
            }
          }
        };

        setTimeout(() => reject(new Error('Timeout')), 30000);
      });

      results.push({
        name: file.name,
        ...result
      });

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
