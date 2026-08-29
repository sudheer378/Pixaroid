/**
 * Pixaroid Convert Worker v2.0 - High Performance
 * Handles image format conversion with quality control
 * Optimized for speed with OffscreenCanvas and smart format detection
 */
'use strict';

const useOffscreen = typeof OffscreenCanvas !== 'undefined';

self.onmessage = function(e) {
  const data = e.data;
  const jobId = data.jobId;

  try {
    if (data.op === 'convert') {
      convertImage(data);
    } else if (data.op === 'convert-batch') {
      convertBatch(data);
    } else {
      throw new Error('Unknown operation: ' + data.op);
    }
  } catch (err) {
    self.postMessage({ jobId: jobId, error: err.message });
  }
};

function convertImage(data) {
  const { jobId, buffer, mime, origSize, targetFormat, quality, background, lossless } = data;

  const blob = new Blob([buffer], { type: mime });
  const img = new Image();

  img.onload = function() {
    try {
      // Use OffscreenCanvas if available
      let canvas, ctx;
      if (useOffscreen) {
        canvas = new OffscreenCanvas(img.naturalWidth, img.naturalHeight);
        ctx = canvas.getContext('2d', { alpha: targetFormat !== 'jpeg' });
      } else {
        canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx = canvas.getContext('2d');
      }

      // Apply background for transparent images converting to JPEG
      if (targetFormat === 'jpeg' || targetFormat === 'jpg') {
        ctx.fillStyle = background || '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0);

      // Determine output MIME type
      let outputMime = 'image/jpeg';
      if (targetFormat === 'png') outputMime = 'image/png';
      else if (targetFormat === 'webp') outputMime = 'image/webp';
      else if (targetFormat === 'avif') outputMime = 'image/avif';
      else if (targetFormat === 'bmp') outputMime = 'image/bmp';

      // Quality setting (PNG is lossless)
      const q = targetFormat === 'png' ? undefined : Math.max(0.1, Math.min(1.0, (quality || 90) / 100));

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
              format: targetFormat,
              originalSize: origSize,
              convertedSize: resultBlob.size,
              savings: origSize > 0 ? Math.round((1 - resultBlob.size / origSize) * 100) : 0
            });
          };
          reader.onerror = function() {
            self.postMessage({ jobId: jobId, error: 'Failed to read converted blob' });
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

async function convertBatch(data) {
  const { jobId, files, options } = data;
  const results = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    const buffer = await readFileAsArrayBuffer(file);

    try {
      const result = await new Promise((resolve, reject) => {
        const tempJobId = jobId + '_' + i;
        convertImage({
          jobId: tempJobId,
          buffer: buffer,
          mime: file.type,
          origSize: file.size,
          targetFormat: options.targetFormat || 'jpeg',
          quality: options.quality || 90,
          background: options.background || '#ffffff'
        });

        const checkResult = setInterval(() => {
          // Simple timeout handling
        }, 30000);

        self.onmessage = function(e) {
          if (e.data.jobId === tempJobId) {
            clearInterval(checkResult);
            if (e.data.error) {
              reject(new Error(e.data.error));
            } else {
              resolve(e.data);
            }
          }
        };
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
