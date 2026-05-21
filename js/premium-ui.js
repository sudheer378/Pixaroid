/**
 * Pixaroid Premium UI Controller v2.0
 * Adds Sejda/iLovePDF-level UX to all tool pages
 */

(function() {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // State
  let originalFile = null;
  let processedBlob = null;
  let worker = null;

  // Initialize when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    const dropzone = $('#premium-dropzone');
    if (!dropzone) return;

    setupDropzone(dropzone);
    setupPaste();
    setupPresets();
    setupComparisonSlider();
    console.log('[PremiumUI] Initialized');
  }

  function setupDropzone(dropzone) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    ['dragenter', 'dragover'].forEach(evt => {
      dropzone.addEventListener(evt, () => dropzone.classList.add('drag-over'));
    });

    ['dragleave', 'drop'].forEach(evt => {
      dropzone.addEventListener(evt, () => dropzone.classList.remove('drag-over'));
    });

    dropzone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length) handleFiles(files);
    });

    dropzone.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,.pdf';
      input.multiple = true;
      input.onchange = (e) => handleFiles(e.target.files);
      input.click();
    });
  }

  function setupPaste() {
    document.addEventListener('paste', (e) => {
      const items = e.clipboardData.items;
      for (let item of items) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          handleFiles([file]);
          break;
        }
      }
    });
  }

  function setupPresets() {
    $$('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const quality = parseFloat(btn.dataset.quality);
        if (quality && originalFile) {
          processFile(originalFile, quality);
        }
      });
    });
  }

  function setupComparisonSlider() {
    const slider = $('.comp-slider');
    const container = $('.comparison-container');
    if (!slider || !container) return;

    let isDragging = false;

    slider.addEventListener('mousedown', () => isDragging = true);
    document.addEventListener('mouseup', () => isDragging = false);
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const rect = container.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percent = (x / rect.width) * 100;
      slider.style.left = percent + '%';
      $('.comp-img-after').style.clipPath = `polygon(${percent}% 0, 100% 0, 100% 100%, ${percent}% 100%)`;
    });

    // Touch support
    slider.addEventListener('touchstart', () => isDragging = true);
    document.addEventListener('touchend', () => isDragging = false);
    document.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      const rect = container.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.touches[0].clientX - rect.left, rect.width));
      const percent = (x / rect.width) * 100;
      slider.style.left = percent + '%';
      $('.comp-img-after').style.clipPath = `polygon(${percent}% 0, 100% 0, 100% 100%, ${percent}% 100%)`;
    });
  }

  function handleFiles(files) {
    const file = files[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith('image/') && !file.type.includes('pdf')) {
      showToast('Please upload an image or PDF file', 'error');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      showToast('File size must be under 20MB', 'error');
      return;
    }

    originalFile = file;
    
    // Show preview
    showPreview(file);
    
    // Auto-process with default preset
    const activePreset = $('.preset-btn.active');
    const quality = activePreset ? parseFloat(activePreset.dataset.quality) : 0.8;
    processFile(file, quality);
  }

  function showPreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const beforeImg = $('.comp-img-before');
      if (beforeImg) {
        beforeImg.src = e.target.result;
      }
    };
    reader.readAsDataURL(file);
  }

  function processFile(file, quality) {
    const processingArea = $('.processing-area');
    const progressBar = $('.progress-bar-fill');
    const progressText = $('.progress-text');
    
    processingArea.classList.add('active');
    progressBar.style.width = '0%';
    
    // Simulate progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      if (progress > 90) progress = 90;
      progressBar.style.width = progress + '%';
      if (progressText) {
        progressText.innerHTML = `<span>Processing...</span><span>${progress}%</span>`;
      }
    }, 100);

    // Use existing worker logic
    const workerPath = getWorkerPath();
    worker = new Worker(workerPath);
    
    worker.onmessage = (e) => {
      clearInterval(interval);
      const { blob, error } = e.data;
      
      if (error) {
        showToast(error, 'error');
        processingArea.classList.remove('active');
        return;
      }
      
      processedBlob = blob;
      progressBar.style.width = '100%';
      if (progressText) {
        const savings = ((file.size - blob.size) / file.size * 100).toFixed(1);
        progressText.innerHTML = `<span>Complete!</span><span>Saved ${savings}%</span>`;
      }
      
      // Show after image
      const afterUrl = URL.createObjectURL(blob);
      const afterImg = $('.comp-img-after');
      if (afterImg) {
        afterImg.src = afterUrl;
      }
      
      // Show comparison and buttons
      $('.comparison-wrapper').classList.add('active');
      $('.action-buttons').classList.add('active');
      $('.tool-controls').classList.add('active');
      
      // Update stats
      updateStats(file.size, blob.size);
      
      showToast('Processing complete!', 'success');
    };

    worker.onerror = (err) => {
      clearInterval(interval);
      showToast('Processing failed: ' + err.message, 'error');
      processingArea.classList.remove('active');
    };

    // Send to worker
    worker.postMessage({
      file: file,
      quality: quality,
      type: getToolType()
    });
  }

  function getWorkerPath() {
    const path = window.location.pathname;
    if (path.includes('compress')) return '/workers/compress.worker.js';
    if (path.includes('resize')) return '/workers/resize.worker.js';
    if (path.includes('convert')) return '/workers/convert.worker.js';
    if (path.includes('filter')) return '/workers/filter.worker.js';
    return '/workers/compress.worker.js';
  }

  function getToolType() {
    const path = window.location.pathname;
    if (path.includes('compress')) return 'compress';
    if (path.includes('resize')) return 'resize';
    if (path.includes('convert')) return 'convert';
    if (path.includes('filter')) return 'filter';
    return 'compress';
  }

  function updateStats(originalSize, newSize) {
    const originalStat = $('.stat-original .stat-value');
    const compressedStat = $('.stat-compressed .stat-value');
    const savingsStat = $('.stat-savings .stat-value');
    
    if (originalStat) originalStat.textContent = formatBytes(originalSize);
    if (compressedStat) compressedStat.textContent = formatBytes(newSize);
    if (savingsStat) {
      const savings = ((originalSize - newSize) / originalSize * 100).toFixed(1);
      savingsStat.textContent = savings + '%';
    }
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function showToast(message, type = 'success') {
    const container = $('#toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${type === 'success' 
          ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
          : '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'}
      </svg>
      <span>${message}</span>
    `;
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideIn 0.3s ease reverse forwards';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
  }

  // Download handler
  window.downloadProcessed = function() {
    if (!processedBlob) return;
    const url = URL.createObjectURL(processedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pixaroid-processed-' + Date.now() + '.' + getOutputFormat();
    a.click();
    URL.revokeObjectURL(url);
    showToast('Download started!', 'success');
  };

  function getOutputFormat() {
    const path = window.location.pathname;
    if (path.includes('png')) return 'png';
    if (path.includes('webp')) return 'webp';
    if (path.includes('jpg') || path.includes('jpeg')) return 'jpg';
    return 'jpg';
  }

})();
