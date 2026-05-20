/**
 * Pixaroid — Core Tool Initialization Module
 * Universal initialization for all image processing tools
 */
(function() {
'use strict';

// Global configuration
window.PIXAROID = window.PIXAROID || {};
window.PIXAROID.VERSION = '2.0.0';
window.PIXAROID.MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

// Supported formats
window.PIXAROID.SUPPORTED_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'avif', 'heic', 'heif'];

/**
 * Utility: Format bytes to human-readable string
 */
window.pxFormatBytes = function(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
};

/**
 * Utility: Clamp value between min and max
 */
window.pxClamp = function(val, min, max) {
  return Math.max(min, Math.min(max, parseFloat(val) || 0));
};

/**
 * Utility: Get file extension
 */
window.pxGetExt = function(filename) {
  return (filename || '').split('.').pop().toLowerCase();
};

/**
 * Utility: Validate file
 */
window.pxValidateFile = function(file) {
  if (!file || !(file instanceof Blob)) {
    return { valid: false, error: 'Invalid file object' };
  }
  if (file.size > window.PIXAROID.MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: 'File too large. Maximum size is 20MB.' 
    };
  }
  const ext = pxGetExt(file.name);
  const mime = file.type || '';
  const isSupported = window.PIXAROID.SUPPORTED_FORMATS.some(f => 
    mime.includes(f) || ext === f
  );
  if (!isSupported && !mime.startsWith('image/')) {
    return { 
      valid: false, 
      error: 'Unsupported file format. Please use JPG, PNG, WebP, GIF, BMP, TIFF, AVIF, or HEIC.' 
    };
  }
  if (file.size === 0) {
    return { valid: false, error: 'File is empty' };
  }
  return { valid: true };
};

/**
 * Utility: Read file as ArrayBuffer
 */
window.pxReadBuffer = function(file) {
  return new Promise(function(resolve, reject) {
    const reader = new FileReader();
    reader.onload = function(e) { resolve(e.target.result); };
    reader.onerror = function() { reject(new Error('Failed to read file')); };
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Utility: Create blob from ArrayBuffer
 */
window.pxBlobFromArrayBuffer = function(buffer, type) {
  return new Blob([buffer], { type: type || 'application/octet-stream' });
};

/**
 * Utility: Download blob as file
 */
window.pxDownload = function(blob, filename) {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'download';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
};

/**
 * Utility: Toast notification
 */
window.pxToast = function(message, type, duration) {
  type = type || 'info';
  duration = duration || 3500;
  
  let container = document.getElementById('px-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'px-toast-container';
    container.style.cssText = 'position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);z-index:99999;display:flex;flex-direction:column;gap:0.5rem;pointer-events:none;';
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.className = 'px-toast px-toast-' + type;
  toast.textContent = message;
  toast.style.cssText = 'padding:0.625rem 1.125rem;border-radius:8px;font-size:0.8125rem;font-weight:600;background:#15152A;color:#EEEEF8;border:1px solid rgba(255,255,255,0.11);box-shadow:0 4px 16px rgba(0,0,0,0.4);opacity:0;transform:translateY(8px);transition:opacity 0.25s,transform 0.25s;pointer-events:auto;';
  
  if (type === 'success') {
    toast.style.background = 'rgba(35,214,122,0.15)';
    toast.style.color = '#23D67A';
    toast.style.borderColor = 'rgba(35,214,122,0.3)';
  } else if (type === 'error') {
    toast.style.background = 'rgba(255,79,79,0.15)';
    toast.style.color = '#FF4F4F';
    toast.style.borderColor = 'rgba(255,79,79,0.3)';
  } else if (type === 'info') {
    toast.style.background = 'rgba(124,111,255,0.15)';
    toast.style.color = '#9D93FF';
    toast.style.borderColor = 'rgba(124,111,255,0.3)';
  }
  
  container.appendChild(toast);
  
  requestAnimationFrame(function() {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });
  
  setTimeout(function() {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    setTimeout(function() { toast.remove(); }, 300);
  }, duration);
};

/**
 * Worker runner with timeout and error handling
 */
window.pxRunWorker = function(workerPath, payload, timeout) {
  timeout = timeout || 60000;
  
  return new Promise(function(resolve, reject) {
    let worker;
    try {
      worker = new Worker(workerPath);
    } catch (e) {
      reject(new Error('Failed to load worker: ' + workerPath));
      return;
    }
    
    const jobId = 'px_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const timer = setTimeout(function() {
      worker.terminate();
      reject(new Error('Worker timed out after ' + (timeout/1000) + ' seconds'));
    }, timeout);
    
    worker.onmessage = function(e) {
      if (!e.data || e.data.jobId !== jobId) return;
      
      clearTimeout(timer);
      worker.terminate();
      
      if (e.data.error) {
        reject(new Error(e.data.error));
        return;
      }
      
      // Handle different response types
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
        mimeType: e.data.mime || resultBlob.type
      });
    };
    
    worker.onerror = function(e) {
      clearTimeout(timer);
      worker.terminate();
      reject(new Error('Worker error: ' + (e.message || 'Unknown error')));
    };
    
    // Send message with job ID
    const message = Object.assign({ jobId: jobId }, payload);
    delete message.origSize; // Don't transfer this
    
    try {
      worker.postMessage(message);
    } catch (err) {
      clearTimeout(timer);
      worker.terminate();
      reject(new Error('Failed to send message to worker: ' + err.message));
    }
  });
};

/**
 * Guess operation type from URL slug
 */
window.pxGuessOperation = function(slug) {
  slug = (slug || '').toLowerCase();
  
  if (/compress.*\d+kb$|to-\d+kb/.test(slug)) return 'compress-target';
  if (/compress|reduce|optim/.test(slug)) return 'compress';
  if (/resize|passport|dpi|for-|social/.test(slug)) return 'resize';
  if (/to-png|to-jpg|to-webp|to-bmp|to-gif|to-tiff|to-avif|convert|heic/.test(slug)) return 'convert';
  if (/crop/.test(slug)) return 'crop';
  if (/rotat/.test(slug)) return 'rotate';
  if (/flip/.test(slug)) return 'flip';
  if (/watermark/.test(slug)) return 'watermark';
  if (/\bblur\b/.test(slug)) return 'blur';
  if (/sharpen/.test(slug)) return 'sharpen';
  if (/bright|contrast|saturat|adjust/.test(slug)) return 'adjust';
  if (/bg-remov|background/.test(slug)) return 'ai-bg-remove';
  if (/upscal/.test(slug)) return 'ai-upscale';
  if (/enhanc/.test(slug)) return 'ai-enhance';
  if (/coloriz/.test(slug)) return 'ai-colorize';
  if (/ocr|text-ext/.test(slug)) return 'ai-ocr';
  if (/bulk/.test(slug)) return 'bulk';
  
  return 'compress';
};

/**
 * Initialize drag and drop for a dropzone element
 */
window.pxInitDropzone = function(dropzone, fileInput, onFile) {
  if (!dropzone || !onFile) return;
  
  // Drag over
  dropzone.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.add('on', 'drag-over');
  });
  
  // Drag leave
  dropzone.addEventListener('dragleave', function(e) {
    if (!dropzone.contains(e.relatedTarget)) {
      dropzone.classList.remove('on', 'drag-over');
    }
  });
  
  // Drop
  dropzone.addEventListener('drop', function(e) {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove('on', 'drag-over');
    
    const files = e.dataTransfer && e.dataTransfer.files;
    if (files && files.length > 0) {
      onFile(files[0]);
    }
  });
  
  // Click to upload (via label or direct)
  if (fileInput) {
    dropzone.addEventListener('click', function(e) {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'LABEL') {
        fileInput.click();
      }
    });
  }
  
  // Touch support
  dropzone.addEventListener('touchstart', function() {
    dropzone.style.background = 'rgba(124,111,255,0.12)';
  }, { passive: true });
  
  dropzone.addEventListener('touchend', function() {
    dropzone.style.background = '';
  }, { passive: true });
};

/**
 * Initialize file input handler
 */
window.pxInitFileInput = function(fileInput, onFile) {
  if (!fileInput || !onFile) return;
  
  // Reset input before opening (allows re-selecting same file)
  fileInput.addEventListener('mousedown', function() {
    try { this.value = ''; } catch(e) {}
  });
  
  fileInput.addEventListener('change', function() {
    const file = this.files && this.files[0];
    if (file) {
      onFile(file);
    }
    // Reset after delay
    setTimeout(function() {
      try { fileInput.value = ''; } catch(e) {}
    }, 1000);
  });
};

/**
 * Initialize paste handler
 */
window.pxInitPasteHandler = function(onFile) {
  if (!onFile) return;
  
  document.addEventListener('paste', function(e) {
    const items = (e.clipboardData || window.clipboardData || {}).items || [];
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file' && items[i].type.indexOf('image') >= 0) {
        const blob = items[i].getAsFile();
        if (blob) {
          e.preventDefault();
          onFile(blob);
          break;
        }
      }
    }
  });
};

/**
 * Auto-detect dark/light mode and apply theme
 */
window.pxInitTheme = function(toggleBtn) {
  const root = document.documentElement;
  
  function applyTheme(isLight) {
    root.classList.toggle('L', isLight);
    localStorage.setItem('px-theme', isLight ? 'light' : 'dark');
  }
  
  // Check saved preference or system preference
  const saved = localStorage.getItem('px-theme');
  const isLight = saved === 'light' || 
    (saved === null && window.matchMedia('(prefers-color-scheme: light)').matches);
  
  applyTheme(isLight);
  
  // Toggle button
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function() {
      const isLight = !root.classList.contains('L');
      applyTheme(isLight);
    });
  }
  
  // Listen for system changes
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function(e) {
    if (!localStorage.getItem('px-theme')) {
      applyTheme(e.matches);
    }
  });
};

console.log('[Pixaroid] Core module loaded v' + window.PIXAROID.VERSION);

})();
