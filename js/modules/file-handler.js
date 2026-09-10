/**
 * Pixaroid — File Handler v2.1
 * Unified browser file intake: click, drag/drop, paste, and CORS-permitted URL fetch.
 * Processing/validation remains delegated to the canonical /js/engine.js module.
 */
'use strict';

import { validateFile, MAX_FILE_SIZE_BYTES } from '/js/engine.js';

const DEFAULT_TYPES = Object.freeze([
  'image/jpeg','image/png','image/webp','image/heic','image/heif',
  'image/gif','image/bmp','image/tiff','image/avif',
]);

export class FileHandler {
  constructor({ dropzone, input, onFile, onFiles, onError, multiple=false, accept=DEFAULT_TYPES } = {}) {
    this.dropzone = dropzone;
    this.input = input;
    this.onFile = typeof onFile === 'function' ? onFile : () => {};
    this.onFiles = typeof onFiles === 'function' ? onFiles : () => {};
    this.onError = typeof onError === 'function' ? onError : (msg => console.warn('[FileHandler]', msg));
    this.multiple = Boolean(multiple);
    this.accept = Array.isArray(accept) && accept.length ? accept : [...DEFAULT_TYPES];
    this._bound = [];
    this._init();
  }

  _listen(target, type, handler, options) {
    if (!target) return;
    target.addEventListener(type, handler, options);
    this._bound.push([target, type, handler, options]);
  }

  _init() {
    const dz = this.dropzone;
    if (!dz) return;

    const prevent = e => e.preventDefault();
    const enter = e => { e.preventDefault(); dz.classList.add('drag-over'); };
    const leave = e => { if (!dz.contains(e.relatedTarget)) dz.classList.remove('drag-over'); };
    const drop = e => { e.preventDefault(); dz.classList.remove('drag-over'); this._handleDataTransfer(e.dataTransfer); };
    const click = () => this.input?.click();
    const keydown = e => { if ((e.key === 'Enter' || e.key === ' ') && this.input) { e.preventDefault(); this.input.click(); } };

    this._listen(dz, 'dragenter', enter);
    this._listen(dz, 'dragover', prevent);
    this._listen(dz, 'dragleave', leave);
    this._listen(dz, 'drop', drop);
    this._listen(dz, 'click', click);
    this._listen(dz, 'keydown', keydown);
    dz.setAttribute('tabindex', '0');
    dz.setAttribute('role', 'button');

    if (this.input) {
      this.input.multiple = this.multiple;
      this.input.accept = this.accept.join(',');
      this._listen(this.input, 'change', e => {
        const files = Array.from(e.target.files || []);
        if (files.length) this._processFiles(files);
        e.target.value = '';
      });
    }

    const paste = e => {
      const imageItems = Array.from(e.clipboardData?.items || []).filter(item => item.type.startsWith('image/'));
      if (!imageItems.length) return;
      e.preventDefault();
      this._processFiles(imageItems.map(item => item.getAsFile()).filter(Boolean));
    };
    this._listen(document, 'paste', paste);
  }

  _handleDataTransfer(dataTransfer) {
    if (!dataTransfer) return;
    const url = dataTransfer.getData?.('text/uri-list') || dataTransfer.getData?.('text/plain');
    if (url && !dataTransfer.files?.length && /^https?:\/\//i.test(url.trim())) {
      this.fetchFromURL(url.trim());
      return;
    }
    this._processFiles(Array.from(dataTransfer.files || []));
  }

  _processFiles(files) {
    const valid = [];
    const errors = [];
    for (const file of files) {
      const result = validateFile(file, { maxBytes: MAX_FILE_SIZE_BYTES });
      if (result.ok) valid.push(file);
      else errors.push(`${file?.name || 'Unnamed file'}: ${result.error}`);
    }
    if (errors.length) this.onError(errors.join('\n'));
    if (!valid.length) return;

    if (this.multiple) this.onFiles(valid);
    else {
      this.onFile(valid[0]);
      if (valid.length > 1) this.onError('Only the first file was used. Use a bulk tool for multiple files.');
    }
  }

  async fetchFromURL(url) {
    try {
      const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) throw new Error('URL does not point to an image.');
      const cleanPath = new URL(url).pathname;
      const filename = cleanPath.split('/').pop() || 'image';
      this._processFiles([new File([blob], filename, { type: blob.type })]);
    } catch (error) {
      this.onError(`Could not fetch image from URL: ${error?.message || 'request failed'}`);
    }
  }

  static readAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  static readAsBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  static async thumbnail(file, maxSize=120) {
    if (!(file instanceof Blob)) throw new Error('Invalid image file');
    const url = URL.createObjectURL(file);
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close?.();
      return canvas.toDataURL('image/jpeg', 0.7);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  destroy() {
    for (const [target, type, handler, options] of this._bound) target.removeEventListener(type, handler, options);
    this._bound = [];
  }
}

export { DEFAULT_TYPES as ACCEPTED_TYPES };
