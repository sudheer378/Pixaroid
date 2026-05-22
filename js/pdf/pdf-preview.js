/**
 * Pixaroid PDF Preview v1.0
 * Live preview generation for PDF tools
 */

class PDFPreview {
  constructor() {
    this.pdfjs = null;
    this.cache = new Map();
  }

  async init() {
    if (!this.pdfjs) {
      await this.loadPdfJs();
    }
    return this;
  }

  async loadPdfJs() {
    return new Promise((resolve, reject) => {
      if (window.pdfjsLib) {
        this.pdfjs = window.pdfjsLib;
        resolve(this.pdfjs);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        this.pdfjs = window.pdfjsLib;
        resolve(this.pdfjs);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Generate thumbnail for PDF file
   */
  async generateThumbnail(file, pageNum = 1, width = 200) {
    await this.init();
    
    const cacheKey = `${file.name}-${file.size}-${pageNum}-${width}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      const pdf = await this.pdfjs.getDocument({ data: arrayBuffer }).promise;
      
      if (pageNum > pdf.numPages) {
        pageNum = pdf.numPages;
      }
      
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1 });
      const scale = width / viewport.width;
      const scaledViewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(scaledViewport.width);
      canvas.height = Math.round(scaledViewport.height);
      const ctx = canvas.getContext('2d');
      
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      await page.render({
        canvasContext: ctx,
        viewport: scaledViewport
      }).promise;

      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      this.cache.set(cacheKey, dataUrl);
      
      return dataUrl;
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      return null;
    }
  }

  /**
   * Generate multiple thumbnails for all pages
   */
  async generateThumbnails(file, maxPages = 10, width = 150) {
    await this.init();
    
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    const pdf = await this.pdfjs.getDocument({ data: arrayBuffer }).promise;
    const numPages = Math.min(pdf.numPages, maxPages);
    
    const thumbnails = [];
    
    for (let i = 1; i <= numPages; i++) {
      const thumbnail = await this.generateThumbnail(file, i, width);
      thumbnails.push({
        pageNum: i,
        dataUrl: thumbnail
      });
    }
    
    return thumbnails;
  }

  /**
   * Render PDF page to canvas for live preview
   */
  async renderPage(file, pageNum, canvas, scale = 1.0) {
    await this.init();
    
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    const pdf = await this.pdfjs.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    await page.render({
      canvasContext: ctx,
      viewport: viewport
    }).promise;

    return { width: canvas.width, height: canvas.height };
  }

  /**
   * Create before/after comparison preview
   */
  async createComparison(originalFile, processedFile, container, options = {}) {
    const width = options.width || 400;
    const height = options.height || 500;

    container.innerHTML = `
      <div class="comparison-container" style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <div class="comparison-panel" style="flex: 1; min-width: 280px;">
          <div class="comparison-label" style="font-size: 0.75rem; font-weight: 600; color: var(--mu); margin-bottom: 0.5rem;">Original</div>
          <canvas id="original-canvas" style="width: 100%; border-radius: 8px; border: 1px solid var(--bd);"></canvas>
          <div class="file-info" style="font-size: 0.75rem; color: var(--mu); margin-top: 0.5rem;"></div>
        </div>
        <div class="comparison-panel" style="flex: 1; min-width: 280px;">
          <div class="comparison-label" style="font-size: 0.75rem; font-weight: 600; color: var(--mu); margin-bottom: 0.5rem;">Processed</div>
          <canvas id="processed-canvas" style="width: 100%; border-radius: 8px; border: 1px solid var(--bd);"></canvas>
          <div class="file-info" style="font-size: 0.75rem; color: var(--mu); margin-top: 0.5rem;"></div>
        </div>
      </div>
    `;

    const originalCanvas = container.querySelector('#original-canvas');
    const processedCanvas = container.querySelector('#processed-canvas');

    // Render original
    await this.renderPage(originalFile, 1, originalCanvas, 0.8);
    
    // Render processed
    await this.renderPage(processedFile, 1, processedCanvas, 0.8);

    // Update file info
    const originalInfo = container.querySelectorAll('.file-info')[0];
    const processedInfo = container.querySelectorAll('.file-info')[1];
    
    if (originalFile.size) {
      originalInfo.textContent = PDFUtils.formatFileSize(originalFile.size);
    }
    if (processedFile.size) {
      processedInfo.textContent = PDFUtils.formatFileSize(processedFile.size);
    }
  }

  /**
   * Create image preview for images-to-PDF tools
   */
  async createImagePreview(imageFile, container, maxWidth = 300) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.style.maxWidth = maxWidth + 'px';
        img.style.borderRadius = '8px';
        img.style.border = '1px solid var(--bd)';
        container.appendChild(img);
        resolve(img);
      };
      reader.readAsDataURL(imageFile);
    });
  }

  /**
   * Clear preview cache
   */
  clearCache() {
    this.cache.clear();
  }

  readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }
}

// Export for browser usage
if (typeof window !== 'undefined') {
  window.PDFPreview = PDFPreview;
}
