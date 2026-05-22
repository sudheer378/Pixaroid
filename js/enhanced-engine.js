/**
 * Pixaroid Enhanced Engine v3.0
 * Professional-grade image processing engine inspired by Sejda/iLovePDF
 * Features: Batch processing, real-time preview, advanced compression, Web Workers
 */
(function() {
'use strict';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════
const CONFIG = {
  VERSION: '3.0.0',
  MAX_FILES: 50,
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  CHUNK_SIZE: 5 * 1024 * 1024, // 5MB chunks for large files
  SUPPORTED_FORMATS: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'avif', 'heic', 'heif', 'pdf'],
  OUTPUT_FORMATS: ['jpg', 'png', 'webp', 'pdf'],
  DEFAULT_QUALITY: 0.85,
  MIN_QUALITY: 0.1,
  MAX_QUALITY: 1.0,
  COMPRESSION_LEVELS: {
    low: { quality: 0.9, name: 'Low Compression' },
    medium: { quality: 0.75, name: 'Medium Compression' },
    high: { quality: 0.6, name: 'High Compression' },
    extreme: { quality: 0.4, name: 'Extreme Compression' }
  },
  WORKER_COUNT: navigator.hardwareConcurrency || 4,
  CACHE_ENABLED: true,
  CACHE_MAX_AGE: 3600000, // 1 hour
};

// ═══════════════════════════════════════════════════════════════
// GLOBAL STATE
// ═══════════════════════════════════════════════════════════════
window.PIXAROID = window.PIXAROID || {};
window.PIXAROID.ENHANCED_ENGINE = {
  config: CONFIG,
  state: {
    files: [],
    processing: false,
    progress: 0,
    currentFile: 0,
    totalFiles: 0,
    results: [],
    errors: [],
    startTime: null,
    endTime: null
  },
  workers: [],
  cache: new Map()
};

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/** Format bytes to human-readable string */
function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/** Get file extension */
function getExtension(filename) {
  return (filename || '').split('.').pop().toLowerCase();
}

/** Generate unique ID */
function generateId() {
  return 'pxr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/** Validate file */
function validateFile(file) {
  if (!file || !(file instanceof Blob)) {
    return { valid: false, error: 'Invalid file object' };
  }
  
  if (file.size > CONFIG.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${formatBytes(CONFIG.MAX_FILE_SIZE)}.`
    };
  }
  
  const ext = getExtension(file.name);
  const mime = file.type || '';
  const isSupported = CONFIG.SUPPORTED_FORMATS.some(f =>
    mime.includes(f) || ext === f
  );
  
  if (!isSupported && !mime.startsWith('image/') && !mime.includes('pdf')) {
    return {
      valid: false,
      error: `Unsupported file format. Supported: ${CONFIG.SUPPORTED_FORMATS.join(', ').toUpperCase()}`
    };
  }
  
  if (file.size === 0) {
    return { valid: false, error: 'File is empty' };
  }
  
  return { valid: true };
}

/** Calculate compression savings */
function calculateSavings(original, compressed) {
  const saved = original - compressed;
  const percentage = ((saved / original) * 100).toFixed(1);
  return {
    saved: saved,
    percentage: percentage,
    originalSize: original,
    compressedSize: compressed
  };
}

// ═══════════════════════════════════════════════════════════════
// WEB WORKER MANAGER
// ═══════════════════════════════════════════════════════════════

class WorkerManager {
  constructor(workerScript) {
    this.workers = [];
    this.queue = [];
    this.activeWorkers = 0;
    this.workerScript = workerScript;
    this.init();
  }
  
  init() {
    const workerCount = Math.min(CONFIG.WORKER_COUNT, 4);
    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker(this.workerScript);
      worker.id = i;
      worker.busy = false;
      worker.onmessage = (e) => this.handleWorkerMessage(i, e.data);
      worker.onerror = (e) => this.handleWorkerError(i, e);
      this.workers.push(worker);
    }
    console.log(`[Pixaroid] Initialized ${workerCount} web workers`);
  }
  
  handleWorkerMessage(workerId, data) {
    const worker = this.workers[workerId];
    worker.busy = false;
    
    if (data.type === 'complete') {
      this.processQueue();
      window.dispatchEvent(new CustomEvent('pxr:worker-complete', { detail: data }));
    } else if (data.type === 'progress') {
      window.dispatchEvent(new CustomEvent('pxr:worker-progress', { detail: data }));
    } else if (data.type === 'error') {
      window.dispatchEvent(new CustomEvent('pxr:worker-error', { detail: data }));
    }
  }
  
  handleWorkerError(workerId, error) {
    console.error(`[Pixaroid] Worker ${workerId} error:`, error);
    const worker = this.workers[workerId];
    worker.busy = false;
    window.dispatchEvent(new CustomEvent('pxr:worker-error', { 
      detail: { workerId, error: error.message } 
    }));
  }
  
  processQueue() {
    if (this.queue.length === 0) return;
    
    const worker = this.workers.find(w => !w.busy);
    if (!worker) return;
    
    const task = this.queue.shift();
    worker.busy = true;
    worker.postMessage(task);
  }
  
  enqueue(task) {
    this.queue.push(task);
    this.processQueue();
  }
  
  terminate() {
    this.workers.forEach(w => w.terminate());
    this.workers = [];
  }
}

// ═══════════════════════════════════════════════════════════════
// IMAGE PROCESSOR
// ═══════════════════════════════════════════════════════════════

class ImageProcessor {
  constructor(options = {}) {
    this.options = {
      quality: options.quality || CONFIG.DEFAULT_QUALITY,
      format: options.format || 'auto',
      maxWidth: options.maxWidth || null,
      maxHeight: options.maxHeight || null,
      maintainAspectRatio: options.maintainAspectRatio !== false,
      progressive: options.progressive || false,
      ...options
    };
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }
  
  async process(file, outputFormat = null) {
    const format = outputFormat || this.options.format;
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => this.processImage(img, file, format, resolve, reject);
      img.onerror = () => reject(new Error('Failed to load image'));
      
      const url = URL.createObjectURL(file);
      img.src = url;
    });
  }
  
  processImage(img, file, format, resolve, reject) {
    try {
      let width = img.naturalWidth;
      let height = img.naturalHeight;
      
      // Resize if needed
      if (this.options.maxWidth || this.options.maxHeight) {
        const ratio = Math.min(
          this.options.maxWidth ? this.options.maxWidth / width : Infinity,
          this.options.maxHeight ? this.options.maxHeight / height : Infinity
        );
        
        if (ratio < 1) {
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }
      }
      
      this.canvas.width = width;
      this.canvas.height = height;
      
      // High-quality scaling
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
      
      // Draw image
      this.ctx.drawImage(img, 0, 0, width, height);
      
      // Determine output format
      let mimeType = 'image/jpeg';
      let extension = 'jpg';
      
      if (format === 'png' || file.type === 'image/png') {
        mimeType = 'image/png';
        extension = 'png';
      } else if (format === 'webp') {
        mimeType = 'image/webp';
        extension = 'webp';
      } else if (format === 'avif') {
        mimeType = 'image/avif';
        extension = 'avif';
      }
      
      // Compress and export
      const blob = this.canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }
          
          URL.revokeObjectURL(img.src);
          
          resolve({
            blob: blob,
            mimeType: mimeType,
            extension: extension,
            originalSize: file.size,
            compressedSize: blob.size,
            width: width,
            height: height,
            savings: calculateSavings(file.size, blob.size)
          });
        },
        mimeType,
        this.options.quality
      );
    } catch (error) {
      reject(error);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// BATCH PROCESSOR
// ═══════════════════════════════════════════════════════════════

class BatchProcessor {
  constructor(processor, options = {}) {
    this.processor = processor;
    this.options = options;
    this.files = [];
    this.results = [];
    this.errors = [];
    this.progress = 0;
    this.isProcessing = false;
  }
  
  addFiles(files) {
    const fileArray = Array.from(files);
    const validFiles = [];
    
    fileArray.forEach(file => {
      const validation = validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        this.errors.push({ file: file.name, error: validation.error });
      }
    });
    
    if (validFiles.length > CONFIG.MAX_FILES) {
      validFiles.splice(CONFIG.MAX_FILES);
      this.errors.push({ 
        file: 'batch', 
        error: `Only ${CONFIG.MAX_FILES} files allowed at once` 
      });
    }
    
    this.files = [...this.files, ...validFiles];
    return validFiles.length;
  }
  
  async process(onProgress, onComplete, onError) {
    if (this.isProcessing || this.files.length === 0) return;
    
    this.isProcessing = true;
    this.results = [];
    this.errors = [];
    this.progress = 0;
    
    const total = this.files.length;
    let completed = 0;
    
    const startTime = Date.now();
    
    for (let i = 0; i < this.files.length; i++) {
      const file = this.files[i];
      
      try {
        const result = await this.processor.process(file);
        result.id = generateId();
        result.filename = file.name;
        result.index = i;
        this.results.push(result);
        
        completed++;
        this.progress = (completed / total) * 100;
        
        if (onProgress) {
          onProgress({
            current: completed,
            total: total,
            percentage: this.progress,
            currentFile: file.name,
            result: result
          });
        }
      } catch (error) {
        this.errors.push({ file: file.name, error: error.message });
        
        if (onError) {
          onError({ file: file.name, error: error.message });
        }
      }
    }
    
    const endTime = Date.now();
    this.isProcessing = false;
    
    if (onComplete) {
      onComplete({
        results: this.results,
        errors: this.errors,
        totalFiles: total,
        successfulFiles: this.results.length,
        failedFiles: this.errors.length,
        totalTime: endTime - startTime,
        averageTimePerFile: (endTime - startTime) / total
      });
    }
    
    return {
      results: this.results,
      errors: this.errors,
      success: this.errors.length === 0
    };
  }
  
  clear() {
    this.files = [];
    this.results = [];
    this.errors = [];
    this.progress = 0;
    this.isProcessing = false;
  }
}

// ═══════════════════════════════════════════════════════════════
// PREVIEW MANAGER (Before/After Comparison)
// ═══════════════════════════════════════════════════════════════

class PreviewManager {
  constructor(container) {
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    this.beforeImage = null;
    this.afterImage = null;
    this.sliderPosition = 50;
    this.isDragging = false;
    this.init();
  }
  
  init() {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="preview-comparison" style="position: relative; overflow: hidden; border-radius: 12px;">
        <div class="preview-after" style="width: 100%;"></div>
        <div class="preview-before" style="position: absolute; top: 0; left: 0; width: 50%; overflow: hidden; border-right: 3px solid #7C6FFF;">
          <div style="position: relative;"></div>
        </div>
        <div class="preview-slider" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 40px; height: 40px; background: #7C6FFF; border-radius: 50%; cursor: ew-resize; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(124, 111, 255, 0.4);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M18 8L22 12L18 16"/>
            <path d="M6 8L2 12L6 16"/>
          </svg>
        </div>
      </div>
    `;
    
    this.slider = this.container.querySelector('.preview-slider');
    this.beforeContainer = this.container.querySelector('.preview-before');
    this.afterContainer = this.container.querySelector('.preview-after');
    
    this.setupEvents();
  }
  
  setupEvents() {
    if (!this.slider) return;
    
    const startDrag = (e) => {
      this.isDragging = true;
      e.preventDefault();
    };
    
    const drag = (e) => {
      if (!this.isDragging) return;
      
      const rect = this.container.getBoundingClientRect();
      const x = (e.clientX || e.touches[0].clientX) - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      
      this.sliderPosition = percentage;
      this.beforeContainer.style.width = `${percentage}%`;
      this.slider.style.left = `${percentage}%`;
    };
    
    const endDrag = () => {
      this.isDragging = false;
    };
    
    this.slider.addEventListener('mousedown', startDrag);
    this.slider.addEventListener('touchstart', startDrag);
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
  }
  
  setImages(beforeUrl, afterUrl) {
    this.beforeImage = beforeUrl;
    this.afterImage = afterUrl;
    
    if (this.afterContainer) {
      this.afterContainer.innerHTML = `<img src="${afterUrl}" style="width: 100%; display: block;" alt="After compression">`;
    }
    
    if (this.beforeContainer) {
      const inner = this.beforeContainer.querySelector('div');
      if (inner) {
        inner.innerHTML = `<img src="${beforeUrl}" style="width: ${this.container.offsetWidth}px; max-width: none; display: block;" alt="Before compression">`;
      }
    }
  }
  
  destroy() {
    document.removeEventListener('mousemove', this.drag);
    document.removeEventListener('touchmove', this.drag);
    document.removeEventListener('mouseup', this.endDrag);
    document.removeEventListener('touchend', this.endDrag);
  }
}

// ═══════════════════════════════════════════════════════════════
// DOWNLOAD MANAGER
// ═══════════════════════════════════════════════════════════════

class DownloadManager {
  static download(blob, filename) {
    if (!blob) return;
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
  
  static downloadAll(results, zipFilename = 'pixaroid-compressed.zip') {
    if (results.length === 0) return;
    
    if (results.length === 1) {
      const result = results[0];
      const ext = result.extension || getExtension(result.filename);
      const baseName = result.filename.substring(0, result.filename.lastIndexOf('.'));
      const newFilename = `${baseName}-compressed.${ext}`;
      this.download(result.blob, newFilename);
      return;
    }
    
    // Multiple files - create ZIP
    this.createZip(results, zipFilename);
  }
  
  static async createZip(results, filename) {
    // Load JSZip dynamically
    if (!window.JSZip) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    
    const zip = new window.JSZip();
    
    results.forEach(result => {
      const ext = result.extension || getExtension(result.filename);
      const baseName = result.filename.substring(0, result.filename.lastIndexOf('.'));
      const newFilename = `${baseName}-compressed.${ext}`;
      zip.file(newFilename, result.blob);
    });
    
    zip.generateAsync({ type: 'blob' }).then(content => {
      this.download(content, filename);
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// UI CONTROLLER
// ═══════════════════════════════════════════════════════════════

class UIController {
  constructor(toolId) {
    this.toolId = toolId;
    this.elements = {};
    this.init();
  }
  
  init() {
    this.cacheElements();
    this.bindEvents();
  }
  
  cacheElements() {
    this.elements = {
      dropzone: document.querySelector('.dropzone, .dz'),
      fileInput: document.querySelector('input[type="file"]'),
      settingsPanel: document.querySelector('.settings-panel, .sp'),
      qualitySlider: document.querySelector('input[type="range"]'),
      qualityValue: document.querySelector('.quality-value, .cv'),
      formatSelect: document.querySelector('select[name="format"]'),
      compressBtn: document.querySelector('.compress-btn, .btnp'),
      downloadBtn: document.querySelector('.download-btn, .btnd'),
      progressBar: document.querySelector('.progress-bar, .pf'),
      progressText: document.querySelector('.progress-text, .pl'),
      previewContainer: document.querySelector('.preview-container, .prs'),
      savingsDisplay: document.querySelector('.savings-display, .sv'),
      fileList: document.querySelector('.file-list')
    };
  }
  
  bindEvents() {
    const { dropzone, fileInput } = this.elements;
    
    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
      
      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
      });
      
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          fileInput.files = files;
          this.handleFiles(files);
        }
      });
      
      fileInput.addEventListener('change', (e) => {
        this.handleFiles(e.target.files);
      });
    }
    
    // Quality slider
    if (this.elements.qualitySlider && this.elements.qualityValue) {
      this.elements.qualitySlider.addEventListener('input', (e) => {
        this.elements.qualityValue.textContent = `${Math.round(e.target.value * 100)}%`;
      });
    }
  }
  
  handleFiles(files) {
    window.dispatchEvent(new CustomEvent('pxr:files-selected', { 
      detail: { files: Array.from(files) } 
    }));
  }
  
  updateProgress(current, total, filename) {
    if (this.elements.progressBar) {
      const percentage = (current / total) * 100;
      this.elements.progressBar.style.width = `${percentage}%`;
    }
    
    if (this.elements.progressText) {
      this.elements.progressText.textContent = 
        `Processing ${current}/${total}: ${filename}`;
    }
  }
  
  showResults(results) {
    window.dispatchEvent(new CustomEvent('pxr:processing-complete', { 
      detail: { results } 
    }));
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPORT TO GLOBAL SCOPE
// ═══════════════════════════════════════════════════════════════

window.PIXAROID.ENHANCED_ENGINE = {
  ...window.PIXAROID.ENHANCED_ENGINE,
  ImageProcessor,
  BatchProcessor,
  PreviewManager,
  DownloadManager,
  UIController,
  WorkerManager,
  utils: {
    formatBytes,
    getExtension,
    generateId,
    validateFile,
    calculateSavings
  },
  config: CONFIG
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log(`[Pixaroid Enhanced Engine v${CONFIG.VERSION}] Loaded`);
});

})();
