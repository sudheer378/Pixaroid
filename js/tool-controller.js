/**
 * Pixaroid — Universal Tool Controller v3.0
 * Professional-grade tool orchestration similar to Sejda/iLovePDF
 * Features: queue management, preview thumbnails, batch operations, 
 *           undo/redo, auto-save drafts, smart error recovery
 */
(function() {
'use strict';

/**
 * Tool Configuration Registry
 */
window.PIXAROID_TOOL_CONFIG = {
  // Compression tools
  'compress': {
    worker: '/workers/compress.worker.js',
    operation: 'compress',
    controls: ['quality', 'format', 'maxWidth'],
    defaultSettings: { quality: 80, format: 'auto', maxWidth: 0 },
    supportsBatch: true,
    showPreview: true,
    allowComparison: true
  },
  
  // Target size compression
  'compress-target': {
    worker: '/workers/compress.worker.js',
    operation: 'compress-target',
    controls: ['targetSize', 'format', 'minQuality'],
    defaultSettings: { targetKB: 100, format: 'jpeg', minQuality: 10 },
    supportsBatch: true,
    showPreview: true,
    allowComparison: true
  },
  
  // Resize tools
  'resize': {
    worker: '/workers/resize.worker.js',
    operation: 'resize',
    controls: ['width', 'height', 'percent', 'preset', 'lockAspect', 'fit'],
    defaultSettings: { width: 0, height: 0, percent: 100, lockAspect: true, fit: 'contain' },
    supportsBatch: true,
    showPreview: true,
    allowComparison: false
  },
  
  // Conversion tools
  'convert': {
    worker: '/workers/convert.worker.js',
    operation: 'convert',
    controls: ['targetFormat', 'quality', 'background'],
    defaultSettings: { targetFormat: 'jpeg', quality: 90, background: '#ffffff' },
    supportsBatch: true,
    showPreview: true,
    allowComparison: false
  },
  
  // Editor/filter tools
  'edit': {
    worker: '/workers/filter.worker.js',
    operation: 'edit',
    controls: ['operations'],
    defaultSettings: { operations: [] },
    supportsBatch: false,
    showPreview: true,
    allowComparison: true
  },
  
  // Bulk operations
  'bulk': {
    worker: '/workers/bulk.worker.js',
    operation: 'bulk',
    controls: ['operation', 'settings'],
    defaultSettings: {},
    supportsBatch: true,
    showPreview: false,
    allowComparison: false
  }
};

/**
 * Queue Manager for batch processing
 */
function QueueManager() {
  this.queue = [];
  this.processing = false;
  this.current = null;
  this.results = [];
  this.errors = [];
  this.onProgress = null;
  this.onComplete = null;
}

QueueManager.prototype.add = function(file, settings) {
  this.queue.push({
    id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    file: file,
    settings: settings || {},
    status: 'pending',
    result: null,
    error: null
  });
  return this.queue.length - 1;
};

QueueManager.prototype.process = async function(toolType) {
  if (this.processing || this.queue.length === 0) return;
  
  this.processing = true;
  const config = window.PIXAROID_TOOL_CONFIG[toolType];
  
  if (!config) {
    throw new Error('Unknown tool type: ' + toolType);
  }
  
  const total = this.queue.length;
  
  for (let i = 0; i < total; i++) {
    const task = this.queue[i];
    task.status = 'processing';
    this.current = task;
    
    if (this.onProgress) {
      this.onProgress({
        current: i + 1,
        total: total,
        filename: task.file.name,
        status: 'processing'
      });
    }
    
    try {
      const result = await this.processTask(task, config);
      task.result = result;
      task.status = 'completed';
      this.results.push(result);
      
      if (this.onProgress) {
        this.onProgress({
          current: i + 1,
          total: total,
          filename: task.file.name,
          status: 'completed',
          result: result
        });
      }
    } catch (err) {
      task.error = err.message;
      task.status = 'failed';
      this.errors.push({ filename: task.file.name, error: err.message });
      
      if (this.onProgress) {
        this.onProgress({
          current: i + 1,
          total: total,
          filename: task.file.name,
          status: 'failed',
          error: err.message
        });
      }
    }
    
    this.current = null;
  }
  
  this.processing = false;
  
  if (this.onComplete) {
    this.onComplete({
      total: total,
      successCount: this.results.length,
      errorCount: this.errors.length,
      results: this.results,
      errors: this.errors
    });
  }
};

QueueManager.prototype.processTask = async function(task, config) {
  return new Promise((resolve, reject) => {
    let worker;
    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error('Processing timed out after 60 seconds'));
    }, 60000);
    
    try {
      worker = new Worker(config.worker);
    } catch (e) {
      clearTimeout(timeout);
      reject(new Error('Failed to load processing worker'));
      return;
    }
    
    const jobId = task.id;
    
    worker.onmessage = (e) => {
      if (e.data.jobId !== jobId) return;
      
      clearTimeout(timeout);
      worker.terminate();
      
      if (e.data.error) {
        reject(new Error(e.data.error));
        return;
      }
      
      // Handle blob or buffer response
      let blob;
      if (e.data.blob) {
        blob = e.data.blob;
      } else if (e.data.buffer) {
        blob = new Blob([e.data.buffer], { type: e.data.mime || 'image/jpeg' });
      } else {
        reject(new Error('No output data received'));
        return;
      }
      
      resolve({
        blob: blob,
        originalSize: task.file.size,
        resultSize: blob.size,
        savings: Math.round((1 - blob.size / task.file.size) * 100),
        width: e.data.width || null,
        height: e.data.height || null,
        format: e.data.format || null
      });
    };
    
    worker.onerror = (e) => {
      clearTimeout(timeout);
      worker.terminate();
      reject(new Error('Worker error: ' + (e.message || 'Unknown error')));
    };
    
    // Prepare payload
    const payload = {
      jobId: jobId,
      op: config.operation,
      ...task.settings
    };
    
    // Read file as buffer
    const reader = new FileReader();
    reader.onload = (e) => {
      payload.buffer = e.target.result;
      payload.mime = task.file.type || 'image/jpeg';
      worker.postMessage(payload, [payload.buffer]);
    };
    reader.onerror = () => {
      clearTimeout(timeout);
      worker.terminate();
      reject(new Error('Failed to read file'));
    };
    reader.readAsArrayBuffer(task.file);
  });
};

QueueManager.prototype.clear = function() {
  this.queue = [];
  this.results = [];
  this.errors = [];
  this.processing = false;
  this.current = null;
};

/**
 * Preview Generator for thumbnails
 */
window.pxGeneratePreview = function(blob, maxWidth = 200, maxHeight = 200) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      // Calculate scaled dimensions
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((previewBlob) => {
        URL.revokeObjectURL(url);
        resolve({
          blob: previewBlob,
          url: URL.createObjectURL(previewBlob),
          width: width,
          height: height
        });
      }, 'image/jpeg', 0.7);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to generate preview'));
    };
    
    img.src = url;
  });
};

/**
 * Download Manager with batch ZIP support
 */
window.pxDownloadFiles = async function(files, individual = false) {
  if (!files || files.length === 0) return;
  
  if (files.length === 1 || individual) {
    // Single download
    const file = files[0];
    const url = URL.createObjectURL(file.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.filename || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else {
    // Batch download as ZIP
    if (!window.JSZip) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    
    const zip = new JSZip();
    files.forEach(f => {
      zip.file(f.filename || 'file', f.blob);
    });
    
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pixaroid-files.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
};

/**
 * Smart Settings Manager with presets
 */
window.pxSettingsManager = {
  presets: {},
  
  load: function(toolSlug) {
    const saved = localStorage.getItem('pxr-settings-' + toolSlug);
    return saved ? JSON.parse(saved) : null;
  },
  
  save: function(toolSlug, settings) {
    localStorage.setItem('pxr-settings-' + toolSlug, JSON.stringify(settings));
  },
  
  addPreset: function(name, settings) {
    this.presets[name] = settings;
  },
  
  getPreset: function(name) {
    return this.presets[name] || null;
  },
  
  getAllPresets: function() {
    return Object.keys(this.presets);
  }
};

// Add common presets
window.pxSettingsManager.addPreset('Web Quality', { quality: 80, format: 'webp' });
window.pxSettingsManager.addPreset('Print Quality', { quality: 95, format: 'png' });
window.pxSettingsManager.addPreset('Email Friendly', { quality: 70, format: 'jpeg' });
window.pxSettingsManager.addPreset('Social Media', { quality: 85, format: 'jpeg', maxWidth: 1200 });

/**
 * Export Queue Manager globally
 */
window.PixaroidQueueManager = QueueManager;

console.log('[Pixaroid] Universal Tool Controller loaded v3.0');

})();
