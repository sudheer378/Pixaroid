/**
 * Pixaroid PDF Preview v3.0
 * Reliable browser-side PDF.js preview with render cancellation,
 * exact API/worker version matching, cache eviction and cleanup.
 */

class PDFPreview {
  constructor() {
    this.pdfjs = null;
    this.cache = new Map();
    this.maxCacheSize = 50;
    this.renderTasks = new WeakMap();
    this.pdfDocuments = new Set();
    this.pdfJsVersion = '3.11.174';
  }

  async init() {
    if (!this.pdfjs) await this.loadPdfJs();
    return this;
  }

  async loadPdfJs() {
    if (window.pdfjsLib) {
      this.pdfjs = window.pdfjsLib;
      if (this.pdfjs.GlobalWorkerOptions) {
        this.pdfjs.GlobalWorkerOptions.workerSrc =
          `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${this.pdfJsVersion}/pdf.worker.min.js`;
      }
      return this.pdfjs;
    }

    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-pixaroid-pdfjs="true"]');
      if (existing) {
        existing.addEventListener('load', () => { this.pdfjs = window.pdfjsLib; resolve(this.pdfjs); }, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${this.pdfJsVersion}/pdf.min.js`;
      script.async = true;
      script.dataset.pixaroidPdfjs = 'true';
      script.onload = () => {
        if (!window.pdfjsLib) { reject(new Error('PDF.js loaded but pdfjsLib is unavailable')); return; }
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${this.pdfJsVersion}/pdf.worker.min.js`;
        this.pdfjs = window.pdfjsLib;
        resolve(this.pdfjs);
      };
      script.onerror = () => reject(new Error('Unable to load PDF.js'));
      document.head.appendChild(script);
    });
  }

  async openDocument(file) {
    await this.init();
    const data = await this.readFileAsArrayBuffer(file);
    const loadingTask = this.pdfjs.getDocument({ data });
    const pdf = await loadingTask.promise;
    this.pdfDocuments.add(pdf);
    return pdf;
  }

  async generateThumbnail(file, pageNum = 1, width = 200) {
    const cacheKey = `${file.name || 'file'}-${file.size}-${file.lastModified || 0}-${pageNum}-${width}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    let pdf = null;
    try {
      pdf = await this.openDocument(file);
      pageNum = Math.max(1, Math.min(pageNum, pdf.numPages));
      const page = await pdf.getPage(pageNum);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = width / baseViewport.width;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const task = page.render({ canvasContext: ctx, viewport });
      this.renderTasks.set(canvas, task);
      await task.promise;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      this.putCache(cacheKey, dataUrl);
      canvas.width = 1;
      canvas.height = 1;
      return dataUrl;
    } catch (error) {
      if (error && error.name !== 'RenderingCancelledException') console.error('Error generating thumbnail:', error);
      return null;
    } finally {
      if (pdf) this.destroyDocument(pdf);
    }
  }

  async generateThumbnails(file, maxPages = 10, width = 150) {
    const pdf = await this.openDocument(file);
    const numPages = Math.min(pdf.numPages, Math.max(1, maxPages));
    const thumbnails = [];
    try {
      for (let i = 1; i <= numPages; i++) {
        const thumbnail = await this.generateThumbnail(file, i, width);
        thumbnails.push({ pageNum: i, dataUrl: thumbnail });
      }
      return thumbnails;
    } finally {
      this.destroyDocument(pdf);
    }
  }

  async renderPage(file, pageNum, canvas, scale = 1.0) {
    if (!canvas) throw new Error('Preview canvas is required');
    const pdf = await this.openDocument(file);
    try {
      if (pageNum < 1 || pageNum > pdf.numPages) throw new Error(`PDF page ${pageNum} does not exist`);
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: Math.max(0.1, scale) });
      this.cancelRender(canvas);
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const task = page.render({ canvasContext: ctx, viewport });
      this.renderTasks.set(canvas, task);
      try {
        await task.promise;
      } finally {
        if (this.renderTasks.get(canvas) === task) this.renderTasks.delete(canvas);
      }
      return { width: canvas.width, height: canvas.height };
    } finally {
      this.destroyDocument(pdf);
    }
  }

  cancelRender(canvas) {
    const task = canvas && this.renderTasks.get(canvas);
    if (task) {
      try { task.cancel(); } catch (_) {}
      this.renderTasks.delete(canvas);
    }
  }

  async createComparison(originalFile, processedFile, container, options = {}) {
    if (!container) throw new Error('Preview container is required');
    container.innerHTML = `
      <div class="comparison-container" style="display:flex;gap:1rem;flex-wrap:wrap;">
        <div class="comparison-panel" style="flex:1;min-width:280px;">
          <div class="comparison-label" style="font-size:.75rem;font-weight:600;color:var(--mu);margin-bottom:.5rem;">Original</div>
          <canvas id="original-canvas" style="width:100%;border-radius:8px;border:1px solid var(--bd);"></canvas>
          <div class="file-info" style="font-size:.75rem;color:var(--mu);margin-top:.5rem;"></div>
        </div>
        <div class="comparison-panel" style="flex:1;min-width:280px;">
          <div class="comparison-label" style="font-size:.75rem;font-weight:600;color:var(--mu);margin-bottom:.5rem;">Processed</div>
          <canvas id="processed-canvas" style="width:100%;border-radius:8px;border:1px solid var(--bd);"></canvas>
          <div class="file-info" style="font-size:.75rem;color:var(--mu);margin-top:.5rem;"></div>
        </div>
      </div>`;
    const originalCanvas = container.querySelector('#original-canvas');
    const processedCanvas = container.querySelector('#processed-canvas');
    await Promise.all([
      this.renderPage(originalFile, 1, originalCanvas, options.scale || 0.8),
      this.renderPage(processedFile, 1, processedCanvas, options.scale || 0.8)
    ]);
    const infos = container.querySelectorAll('.file-info');
    if (originalFile.size && typeof PDFUtils !== 'undefined') infos[0].textContent = PDFUtils.formatFileSize(originalFile.size);
    if (processedFile.size && typeof PDFUtils !== 'undefined') infos[1].textContent = PDFUtils.formatFileSize(processedFile.size);
  }

  createImagePreview(imageFile, container, maxWidth = 300) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.alt = 'Image preview';
        img.style.maxWidth = `${maxWidth}px`;
        img.style.borderRadius = '8px';
        img.style.border = '1px solid var(--bd)';
        container.appendChild(img);
        resolve(img);
      };
      reader.onerror = () => reject(new Error('Unable to read image preview'));
      reader.readAsDataURL(imageFile);
    });
  }

  putCache(key, value) {
    if (this.cache.has(key)) this.cache.delete(key);
    this.cache.set(key, value);
    while (this.cache.size > this.maxCacheSize) {
      const oldest = this.cache.keys().next().value;
      this.cache.delete(oldest);
    }
  }

  clearCache() { this.cache.clear(); }

  destroyDocument(pdf) {
    if (!pdf) return;
    this.pdfDocuments.delete(pdf);
    try { pdf.destroy(); } catch (_) {}
  }

  destroy() {
    document.querySelectorAll('canvas').forEach(canvas => this.cancelRender(canvas));
    for (const pdf of this.pdfDocuments) {
      try { pdf.destroy(); } catch (_) {}
    }
    this.pdfDocuments.clear();
    this.clearCache();
  }

  readFileAsArrayBuffer(file) {
    if (file && typeof file.arrayBuffer === 'function') return file.arrayBuffer();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Unable to read PDF file'));
      reader.readAsArrayBuffer(file);
    });
  }
}

if (typeof window !== 'undefined') window.PDFPreview = PDFPreview;
