/**
 * Pixaroid Filter/Editor Worker v4.0 - High Performance
 * Handles image filters and edits (rotate, flip, crop, watermark, blur, etc.)
 * Features: OffscreenCanvas, Parallel Batch Processing, Smart Filters
 * Optimized for speed with concurrent processing and enhanced quality
 */
'use strict';

const useOffscreen = typeof OffscreenCanvas !== 'undefined';
const MAX_CONCURRENT = 4; // Process 4 images in parallel for batch operations

self.onmessage = function(e) {
  const data = e.data;
  const jobId = data.jobId;

  try {
    if (data.op === 'edit') {
      editImage(data);
    } else if (data.op === 'edit-batch') {
      editBatchParallel(data);
    } else {
      throw new Error('Unknown operation: ' + data.op);
    }
  } catch (err) {
    self.postMessage({ jobId: jobId, error: err.message, stack: err.stack });
  }
};

// Parallel batch processing for multiple images
async function editBatchParallel(data) {
  const { jobId, items, format, quality } = data;
  const results = [];
  let completed = 0;
  
  // Process in chunks of MAX_CONCURRENT
  const chunks = [];
  for (let i = 0; i < items.length; i += MAX_CONCURRENT) {
    chunks.push(items.slice(i, i + MAX_CONCURRENT));
  }
  
  for (const chunk of chunks) {
    const promises = chunk.map(item => 
      processEditItem(item, format, quality)
        .then(result => {
          completed++;
          self.postMessage({ jobId, type: 'progress', progress: Math.round((completed / items.length) * 100) });
          return { success: true, ...result };
        })
        .catch(err => {
          completed++;
          return { success: false, error: err.message, id: item.id };
        })
    );
    
    const chunkResults = await Promise.all(promises);
    results.push(...chunkResults);
  }
  
  self.postMessage({ jobId, type: 'complete', results });
}

async function processEditItem(item, format, quality) {
  return new Promise((resolve, reject) => {
    const { buffer, mime, operations, id } = item;
    
    const blob = new Blob([buffer], { type: mime });
    const img = new Image();
    
    img.onload = function() {
      try {
        const canvas = useOffscreen ? new OffscreenCanvas(img.naturalWidth, img.naturalHeight) : document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!useOffscreen) {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
        }
        
        let width = canvas.width;
        let height = canvas.height;
        
        // Calculate final dimensions after transforms
        operations.forEach(op => {
          if (op.type === 'rotate' && (op.angle === 90 || op.angle === 270 || op.angle === -90 || op.angle === -270)) {
            const tmp = width;
            width = height;
            height = tmp;
          }
        });
        
        if (width !== canvas.width || height !== canvas.height) {
          const newCanvas = useOffscreen ? new OffscreenCanvas(width, height) : document.createElement('canvas');
          if (!useOffscreen) {
            newCanvas.width = width;
            newCanvas.height = height;
          }
          const newCtx = newCanvas.getContext('2d');
          newCtx.imageSmoothingEnabled = true;
          newCtx.imageSmoothingQuality = 'high';
          newCtx.drawImage(canvas, 0, 0, width, height);
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(newCanvas, 0, 0);
        }
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Apply operations
        ctx.save();
        
        operations.forEach(op => {
          switch (op.type) {
            case 'rotate':
              ctx.translate(canvas.width / 2, canvas.height / 2);
              ctx.rotate((op.angle || 90) * Math.PI / 180);
              ctx.translate(-canvas.width / 2, -canvas.height / 2);
              break;
              
            case 'flip':
              ctx.scale(op.horizontal ? -1 : 1, op.vertical ? -1 : 1);
              if (op.horizontal) ctx.translate(-canvas.width, 0);
              if (op.vertical) ctx.translate(0, -canvas.height);
              break;
              
            case 'brightness':
              ctx.filter = (ctx.filter || '') + ' brightness(' + (100 + (op.value || 0)) + '%)';
              break;
              
            case 'contrast':
              ctx.filter = (ctx.filter || '') + ' contrast(' + (100 + (op.value || 0)) + '%)';
              break;
              
            case 'saturation':
              ctx.filter = (ctx.filter || '') + ' saturate(' + (100 + (op.value || 0)) + '%)';
              break;
              
            case 'blur':
              ctx.filter = (ctx.filter || '') + ' blur(' + (op.radius || 2) + 'px)';
              break;
              
            case 'grayscale':
              ctx.filter = (ctx.filter || '') + ' grayscale(100%)';
              break;
              
            case 'sepia':
              ctx.filter = (ctx.filter || '') + ' sepia(' + ((op.intensity || 80) / 100) + ')';
              break;
              
            case 'invert':
              ctx.filter = (ctx.filter || '') + ' invert(100%)';
              break;
              
            case 'round-corners':
              const radius = (op.radius || 30) / 100 * Math.min(canvas.width, canvas.height);
              ctx.beginPath();
              ctx.moveTo(radius, 0);
              ctx.lineTo(canvas.width - radius, 0);
              ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
              ctx.lineTo(canvas.width, canvas.height - radius);
              ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height);
              ctx.lineTo(radius, canvas.height);
              ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius);
              ctx.lineTo(0, radius);
              ctx.quadraticCurveTo(0, 0, radius, 0);
              ctx.closePath();
              ctx.clip();
              break;
          }
        });
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        
        // Apply text overlays
        operations.forEach(op => {
          if (op.type === 'watermark' || op.type === 'text') {
            applyTextOverlay(ctx, canvas, op);
          }
        });
        
        // Determine output MIME type
        let outputMime = mime;
        if (format === 'jpeg' || format === 'jpg') outputMime = 'image/jpeg';
        else if (format === 'png') outputMime = 'image/png';
        else if (format === 'webp') outputMime = 'image/webp';
        
        const q = Math.max(0.1, Math.min(1.0, (quality || 90) / 100));
        
        canvas.toBlob(
          resultBlob => {
            if (!resultBlob) {
              reject(new Error('Edit failed - no output'));
              return;
            }
            
            const reader = new FileReader();
            reader.onload = ev => {
              resolve({
                id,
                buffer: ev.target.result,
                mime: resultBlob.type,
                width: canvas.width,
                height: canvas.height,
                size: resultBlob.size
              });
            };
            reader.onerror = () => reject(new Error('Failed to read blob'));
            reader.readAsArrayBuffer(resultBlob);
          },
          outputMime,
          outputMime === 'image/png' ? undefined : q
        );
      } catch (err) {
        reject(err);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(blob);
  });
}

function editImage(data) {
  const { jobId, buffer, mime, origSize, operations, format, quality } = data;

  const blob = new Blob([buffer], { type: mime });
  const img = new Image();

  img.onload = function() {
    try {
      const canvas = useOffscreen ? new OffscreenCanvas(img.naturalWidth, img.naturalHeight) : document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!useOffscreen) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
      }

      let width = canvas.width;
      let height = canvas.height;

      // First pass: calculate final dimensions after transforms
      operations.forEach(op => {
        if (op.type === 'rotate' && (op.angle === 90 || op.angle === 270 || op.angle === -90 || op.angle === -270)) {
          const tmp = width;
          width = height;
          height = tmp;
        }
      });

      if (width !== canvas.width || height !== canvas.height) {
        const newCanvas = useOffscreen ? new OffscreenCanvas(width, height) : document.createElement('canvas');
        if (!useOffscreen) {
          newCanvas.width = width;
          newCanvas.height = height;
        }
        const newCtx = newCanvas.getContext('2d');
        newCtx.imageSmoothingEnabled = true;
        newCtx.imageSmoothingQuality = 'high';
        newCtx.drawImage(canvas, 0, 0, width, height);
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(newCanvas, 0, 0);
      }

      // High quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Apply operations
      ctx.save();

      operations.forEach(op => {
        switch (op.type) {
          case 'rotate':
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((op.angle || 90) * Math.PI / 180);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);
            break;

          case 'flip':
            ctx.scale(op.horizontal ? -1 : 1, op.vertical ? -1 : 1);
            if (op.horizontal) ctx.translate(-canvas.width, 0);
            if (op.vertical) ctx.translate(0, -canvas.height);
            break;

          case 'crop':
            // Crop handled separately
            break;

          case 'brightness':
            ctx.filter = (ctx.filter || '') + ' brightness(' + (100 + (op.value || 0)) + '%)';
            break;

          case 'contrast':
            ctx.filter = (ctx.filter || '') + ' contrast(' + (100 + (op.value || 0)) + '%)';
            break;

          case 'saturation':
            ctx.filter = (ctx.filter || '') + ' saturate(' + (100 + (op.value || 0)) + '%)';
            break;

          case 'blur':
            ctx.filter = (ctx.filter || '') + ' blur(' + (op.radius || 2) + 'px)';
            break;

          case 'grayscale':
            ctx.filter = (ctx.filter || '') + ' grayscale(100%)';
            break;

          case 'sepia':
            ctx.filter = (ctx.filter || '') + ' sepia(' + ((op.intensity || 80) / 100) + ')';
            break;

          case 'invert':
            ctx.filter = (ctx.filter || '') + ' invert(100%)';
            break;

          case 'round-corners':
            const radius = (op.radius || 30) / 100 * Math.min(canvas.width, canvas.height);
            ctx.beginPath();
            ctx.moveTo(radius, 0);
            ctx.lineTo(canvas.width - radius, 0);
            ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
            ctx.lineTo(canvas.width, canvas.height - radius);
            ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height);
            ctx.lineTo(radius, canvas.height);
            ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius);
            ctx.lineTo(0, radius);
            ctx.quadraticCurveTo(0, 0, radius, 0);
            ctx.closePath();
            ctx.clip();
            break;
        }
      });

      // Draw the image with transforms applied
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      ctx.restore();

      // Apply additional post-processing operations
      operations.forEach(op => {
        if (op.type === 'watermark' || op.type === 'text') {
          applyTextOverlay(ctx, canvas, op);
        }
      });

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
            self.postMessage({ jobId: jobId, error: 'Edit failed - no output' });
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
              format: outputFormat,
              originalSize: origSize,
              editedSize: resultBlob.size
            });
          };
          reader.onerror = function() {
            self.postMessage({ jobId: jobId, error: 'Failed to read edited blob' });
          };
          reader.readAsArrayBuffer(resultBlob);
        },
        outputMime,
        outputMime === 'image/png' ? undefined : q
      );
    } catch (err) {
      self.postMessage({ jobId: jobId, error: err.message, stack: err.stack });
    }
  };

  img.onerror = function() {
    self.postMessage({ jobId: jobId, error: 'Failed to load image' });
  };

  img.src = URL.createObjectURL(blob);
}

function applyTextOverlay(ctx, canvas, op) {
  ctx.save();

  if (op.type === 'watermark' || op.type === 'text') {
    const text = op.text || '© Pixaroid';
    const fontSize = op.fontSize || 40;
    const color = op.color || '#ffffff';
    const opacity = (op.opacity || 50) / 100;
    const position = op.position || 'bottom-right';

    ctx.globalAlpha = opacity;
    ctx.font = 'bold ' + fontSize + 'px Arial';
    ctx.fillStyle = color;
    ctx.strokeStyle = op.strokeColor || '#000000';
    ctx.lineWidth = op.strokeWidth || 2;

    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize;

    let x, y;
    const padding = 20;

    switch (position) {
      case 'top-left':
        x = padding;
        y = padding + textHeight;
        break;
      case 'top-right':
        x = canvas.width - textWidth - padding;
        y = padding + textHeight;
        break;
      case 'bottom-left':
        x = padding;
        y = canvas.height - padding;
        break;
      case 'center':
        x = (canvas.width - textWidth) / 2;
        y = canvas.height / 2;
        break;
      case 'bottom-right':
      default:
        x = canvas.width - textWidth - padding;
        y = canvas.height - padding;
        break;
    }

    if (op.tile) {
      // Tile watermark across image
      for (let tx = 0; tx < canvas.width; tx += textWidth + 50) {
        for (let ty = 0; ty < canvas.height; ty += textHeight + 50) {
          if (op.strokeWidth > 0) {
            ctx.strokeText(text, tx, ty);
          }
          ctx.fillText(text, tx, ty);
        }
      }
    } else {
      if (op.strokeWidth > 0) {
        ctx.strokeText(text, x, y);
      }
      ctx.fillText(text, x, y);
    }
  }

  ctx.restore();
}

function autoFormat(mime) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  return 'jpeg';
}
