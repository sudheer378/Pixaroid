/**
 * Pixaroid — Enhanced Worker Wrapper v2.0
 * Provides advanced error handling, retry logic, and progress tracking
 * for all Web Workers, similar to professional tools like Sejda/iLovePDF
 */
(function() {
'use strict';

/**
 * Enhanced Worker Runner with retry logic and progress callbacks
 */
window.pxRunWorkerEnhanced = function(workerPath, payload, options) {
  options = options || {};
  const maxRetries = options.retries || 2;
  const timeout = options.timeout || 60000;
  const onProgress = options.onProgress || null;
  
  return new Promise(async function(resolve, reject) {
    let attempts = 0;
    let lastError = null;
    
    while (attempts <= maxRetries) {
      try {
        const result = await runWorkerWithTimeout(workerPath, payload, timeout, onProgress);
        resolve(result);
        return;
      } catch (err) {
        lastError = err;
        attempts++;
        
        if (attempts <= maxRetries) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempts - 1), 5000);
          console.log('[Pixaroid] Worker failed, retrying in ' + delay + 'ms... (attempt ' + attempts + '/' + maxRetries + ')');
          await sleep(delay);
        }
      }
    }
    
    reject(new Error('Worker failed after ' + maxRetries + ' retries: ' + (lastError && lastError.message || 'Unknown error')));
  });
};

function runWorkerWithTimeout(workerPath, payload, timeout, onProgress) {
  return new Promise(function(resolve, reject) {
    let worker;
    
    try {
      worker = new Worker(workerPath);
    } catch (e) {
      reject(new Error('Failed to load worker: ' + workerPath));
      return;
    }
    
    const jobId = 'px_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const startTime = Date.now();
    
    const timer = setTimeout(function() {
      worker.terminate();
      reject(new Error('Processing timed out after ' + (timeout/1000) + ' seconds'));
    }, timeout);
    
    worker.onmessage = function(e) {
      if (!e.data || e.data.jobId !== jobId) return;
      
      // Handle progress updates
      if (e.data.type === 'progress' && onProgress) {
        onProgress({
          current: e.data.current,
          total: e.data.total,
          percent: e.data.percent,
          message: e.data.message
        });
        return;
      }
      
      clearTimeout(timer);
      const duration = Date.now() - startTime;
      worker.terminate();
      
      if (e.data.error) {
        reject(new Error(e.data.error));
        return;
      }
      
      // Process result
      let resultBlob;
      try {
        if (e.data.buffer && e.data.buffer.byteLength > 0) {
          resultBlob = new Blob([e.data.buffer], { type: e.data.mime || 'image/jpeg' });
        } else if (e.data.blob) {
          resultBlob = e.data.blob;
        } else {
          reject(new Error('Worker returned no data'));
          return;
        }
      } catch (err) {
        reject(new Error('Cannot create result blob: ' + err.message));
        return;
      }
      
      resolve({
        blob: resultBlob,
        width: e.data.width || null,
        height: e.data.height || null,
        format: e.data.format || null,
        mimeType: e.data.mime || resultBlob.type,
        durationMs: duration,
        originalSize: e.data.originalSize || null,
        resultSize: resultBlob.size
      });
    };
    
    worker.onerror = function(e) {
      clearTimeout(timer);
      worker.terminate();
      reject(new Error('Worker error: ' + (e.message || 'Unknown error')));
    };
    
    // Send message with job ID
    const message = Object.assign({ jobId: jobId }, payload);
    
    try {
      worker.postMessage(message);
    } catch (err) {
      clearTimeout(timer);
      worker.terminate();
      reject(new Error('Failed to send message to worker: ' + err.message));
    }
  });
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Batch Processor for multiple files
 */
window.pxProcessBatch = async function(files, workerPath, operation, settings, options) {
  options = options || {};
  const concurrency = options.concurrency || 3; // Process 3 files simultaneously
  const onFileProgress = options.onFileProgress || null;
  const onBatchProgress = options.onBatchProgress || null;
  
  const results = [];
  const errors = [];
  const total = files.length;
  
  // Process files in batches
  for (let i = 0; i < total; i += concurrency) {
    const batch = files.slice(i, Math.min(i + concurrency, total));
    const promises = batch.map(async (file, index) => {
      const globalIndex = i + index;
      
      if (onBatchProgress) {
        onBatchProgress({
          current: globalIndex,
          total: total,
          filename: file.name,
          status: 'processing'
        });
      }
      
      try {
        const payload = {
          op: operation,
          ...settings
        };
        
        const result = await window.pxRunWorkerEnhanced(workerPath, payload, {
          timeout: options.timeout || 60000,
          retries: options.retries || 1
        });
        
        results.push({
          filename: file.name,
          originalSize: file.size,
          result: result
        });
        
        if (onBatchProgress) {
          onBatchProgress({
            current: globalIndex + 1,
            total: total,
            filename: file.name,
            status: 'completed',
            result: result
          });
        }
        
        return result;
      } catch (err) {
        errors.push({
          filename: file.name,
          error: err.message
        });
        
        if (onBatchProgress) {
          onBatchProgress({
            current: globalIndex + 1,
            total: total,
            filename: file.name,
            status: 'failed',
            error: err.message
          });
        }
        
        return null;
      }
    });
    
    await Promise.all(promises);
  }
  
  return {
    successCount: results.length,
    errorCount: errors.length,
    total: total,
    results: results,
    errors: errors
  };
};

/**
 * Smart Quality Finder - Binary search for optimal quality
 */
window.pxFindOptimalQuality = async function(file, targetSizeKB, workerPath, options) {
  options = options || {};
  const minQuality = options.minQuality || 10;
  const maxQuality = options.maxQuality || 95;
  const format = options.format || 'jpeg';
  
  return new Promise(async function(resolve, reject) {
    const targetBytes = targetSizeKB * 1024;
    
    // Quick check - if file is already smaller, return with high quality
    if (file.size <= targetBytes) {
      try {
        const result = await window.pxRunWorkerEnhanced(workerPath, {
          op: 'compress',
          quality: 92,
          format: format
        }, options);
        resolve(result);
        return;
      } catch (err) {
        reject(err);
        return;
      }
    }
    
    // Binary search for optimal quality
    let low = minQuality;
    let high = maxQuality;
    let bestResult = null;
    
    try {
      const buffer = await new Promise((ok, fail) => {
        const reader = new FileReader();
        reader.onload = e => ok(e.target.result);
        reader.onerror = () => fail(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
      });
      
      while (low <= high) {
        const mid = Math.round((low + high) / 2);
        
        const result = await window.pxRunWorkerEnhanced(workerPath, {
          op: 'compress',
          buffer: buffer,
          mime: file.type || 'image/jpeg',
          quality: mid,
          format: format
        }, options);
        
        if (result.blob.size <= targetBytes) {
          bestResult = result;
          low = mid + 1; // Try higher quality
        } else {
          high = mid - 1; // Need lower quality
        }
      }
      
      if (!bestResult) {
        // Even minimum quality is too large, return with min quality
        bestResult = await window.pxRunWorkerEnhanced(workerPath, {
          op: 'compress',
          buffer: buffer,
          mime: file.type || 'image/jpeg',
          quality: minQuality,
          format: format
        }, options);
      }
      
      resolve(bestResult);
    } catch (err) {
      reject(err);
    }
  });
};

console.log('[Pixaroid] Enhanced Workers module loaded v2.0');

})();
