/**
 * Pixaroid Enhanced Engine compatibility adapter.
 * Legacy tool pages may still load this file; processing is delegated to the
 * canonical /js/engine.js implementation so two processing engines do not diverge.
 */
(function () {
  'use strict';

  window.PIXAROID = window.PIXAROID || {};
  window.PIXAROID.ENHANCED_ENGINE = window.PIXAROID.ENHANCED_ENGINE || {};

  const enginePromise = import('/js/engine.js');

  class ImageProcessor {
    constructor(options = {}) {
      this.options = { quality: 0.85, format: 'auto', maxWidth: 0, maxHeight: 0, ...options };
    }

    async process(file, onProgress) {
      const { compressImage, convertImage, resizeImage, editImage } = await enginePromise;
      onProgress?.({ progress: 0, current: 0, total: 1, file: file?.name });
      const type = this.options.operation || 'compress';
      let result;
      if (type === 'convert') {
        result = await convertImage(file, { targetFormat: this.options.format || 'jpeg', quality: Math.round((this.options.quality ?? 0.9) * 100) });
      } else if (type === 'resize') {
        result = await resizeImage(file, { width: this.options.maxWidth || 0, height: this.options.maxHeight || 0, quality: Math.round((this.options.quality ?? 0.9) * 100), format: this.options.format || 'auto' });
      } else if (type === 'edit') {
        result = await editImage(file, this.options.operations || [], { quality: Math.round((this.options.quality ?? 0.9) * 100), format: this.options.format || 'auto' });
      } else {
        result = await compressImage(file, { quality: Math.round((this.options.quality ?? 0.85) * 100), format: this.options.format || 'auto', maxWidth: this.options.maxWidth || 0 });
      }
      onProgress?.({ progress: 100, current: 1, total: 1, file: file?.name, result });
      return {
        ...result,
        compressedSize: result.resultSize,
        extension: result.format === 'jpeg' ? 'jpg' : result.format,
        filename: file?.name || 'output'
      };
    }

    cleanup() {}
  }

  class BatchProcessor {
    constructor(processor) { this.processor = processor; this.files = []; }
    addFiles(files) { this.files.push(...Array.from(files || [])); return this.files.length; }
    async process(onProgress, onComplete, onError) {
      const results = [];
      for (let i = 0; i < this.files.length; i++) {
        try {
          const result = await this.processor.process(this.files[i], p => onProgress?.({ ...p, current: i + 1, total: this.files.length, currentFile: this.files[i].name }));
          results.push(result);
        } catch (error) {
          onError?.({ file: this.files[i].name, error: error.message });
        }
      }
      const summary = { results, errors: [], totalFiles: this.files.length, successfulFiles: results.length, failedFiles: this.files.length - results.length };
      onComplete?.(summary);
      return summary;
    }
    clear() { this.files = []; }
  }

  class UIController {
    constructor() {}
    updateProgress(current, total, filename) {
      window.dispatchEvent(new CustomEvent('pxr:progress', { detail: { current, total, filename } }));
    }
    showResults(results) { window.dispatchEvent(new CustomEvent('pxr:processing-complete', { detail: { results } })); }
  }

  class PreviewManager {
    constructor(container) { this.container = typeof container === 'string' ? document.querySelector(container) : container; }
    setImages(beforeUrl, afterUrl) {
      if (!this.container) return;
      this.container.innerHTML = '';
      const wrap = document.createElement('div');
      const before = document.createElement('img');
      const after = document.createElement('img');
      before.src = beforeUrl; after.src = afterUrl;
      before.alt = 'Before processing'; after.alt = 'After processing';
      before.style.cssText = 'max-width:100%;display:block';
      after.style.cssText = 'max-width:100%;display:block;margin-top:8px';
      wrap.append(before, after); this.container.appendChild(wrap);
    }
    destroy() {}
  }

  const DownloadManager = class {
    static download(blob, filename) {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename || 'download';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }
  };

  window.PIXAROID.ENHANCED_ENGINE = {
    ...window.PIXAROID.ENHANCED_ENGINE,
    ImageProcessor,
    BatchProcessor,
    PreviewManager,
    DownloadManager,
    UIController,
    config: { VERSION: 'adapter-3.1' }
  };
})();
