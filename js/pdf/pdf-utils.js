/**
 * Pixaroid PDF Utils v1.0
 * Shared utility functions for PDF tools
 */

const PDFUtils = {
  /**
   * Format file size in human-readable format
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  },

  /**
   * Generate unique ID
   */
  generateId() {
    return 'pdf-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  },

  /**
   * Download blob as file
   */
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Create ZIP file from multiple blobs
   */
  async createZip(files, outputFilename) {
    // Simple ZIP implementation
    const parts = [];
    let offset = 0;
    const centralDir = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const nameBytes = new TextEncoder().encode(file.name);
      const fileData = new Uint8Array(await file.data.arrayBuffer());
      const crc = this.crc32(fileData);

      const header = new Uint8Array(30 + nameBytes.length);
      const dv = new DataView(header.buffer);
      dv.setUint32(0, 0x04034b50, true);
      dv.setUint16(4, 20, true);
      dv.setUint16(6, 0, true);
      dv.setUint16(8, 0, true);
      dv.setUint16(10, 0, true);
      dv.setUint16(12, 0, true);
      dv.setUint32(14, crc, true);
      dv.setUint32(18, fileData.length, true);
      dv.setUint32(22, fileData.length, true);
      dv.setUint16(26, nameBytes.length, true);
      dv.setUint16(28, 0, true);
      header.set(nameBytes, 30);

      centralDir.push({ name: nameBytes, crc, size: fileData.length, offset });
      offset += header.length + fileData.length;
      parts.push(header, fileData);
    }

    const cdOffset = offset;
    const cdParts = [];

    centralDir.forEach(cd => {
      const ce = new Uint8Array(46 + cd.name.length);
      const dv = new DataView(ce.buffer);
      dv.setUint32(0, 0x02014b50, true);
      dv.setUint16(4, 20, true);
      dv.setUint16(6, 20, true);
      dv.setUint16(8, 0, true);
      dv.setUint16(10, 0, true);
      dv.setUint16(12, 0, true);
      dv.setUint16(14, 0, true);
      dv.setUint32(16, cd.crc, true);
      dv.setUint32(20, cd.size, true);
      dv.setUint32(24, cd.size, true);
      dv.setUint16(28, cd.name.length, true);
      dv.setUint16(30, 0, true);
      dv.setUint16(32, 0, true);
      dv.setUint16(34, 0, true);
      dv.setUint16(36, 0, true);
      dv.setUint16(38, 0, true);
      dv.setUint16(40, 0, true);
      dv.setUint16(42, 0, true);
      dv.setUint32(46, cd.offset, true);
      ce.set(cd.name, 46);
      cdParts.push(ce);
      offset += ce.length;
    });

    const eocd = new Uint8Array(22);
    const dv2 = new DataView(eocd.buffer);
    dv2.setUint32(0, 0x06054b50, true);
    dv2.setUint16(4, 0, true);
    dv2.setUint16(6, 0, true);
    dv2.setUint16(8, files.length, true);
    dv2.setUint16(10, files.length, true);
    dv2.setUint32(12, cdParts.reduce((sum, p) => sum + p.length, 0), true);
    dv2.setUint32(16, cdOffset, true);
    dv2.setUint16(20, 0, true);

    const zipParts = [...parts, ...cdParts, eocd];
    const zipBlob = new Blob(zipParts, { type: 'application/zip' });

    if (outputFilename) {
      this.downloadBlob(zipBlob, outputFilename);
    }

    return zipBlob;
  },

  /**
   * CRC32 checksum calculation
   */
  crc32(data) {
    let crc = 0xffffffff;
    const table = this.getCrc32Table();
    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  },

  getCrc32Table() {
    if (this.crcTable) return this.crcTable;

    this.crcTable = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      this.crcTable[i] = c;
    }
    return this.crcTable;
  },

  /**
   * Validate PDF file
   */
  isValidPdf(file) {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  },

  /**
   * Validate image file
   */
  isValidImage(file) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    return validTypes.includes(file.type) || 
           /\.(jpg|jpeg|png|webp)$/i.test(file.name);
  },

  /**
   * Get page count from PDF
   */
  async getPageCount(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const pdf = await window.pdfjsLib.getDocument({ data: reader.result }).promise;
          resolve(pdf.numPages);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  },

  /**
   * Create thumbnail preview of PDF page
   */
  async createPdfThumbnail(file, pageNum = 1, width = 150) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const pdf = await window.pdfjsLib.getDocument({ data: reader.result }).promise;
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1 });
          const scale = width / viewport.width;
          const scaledViewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          canvas.width = Math.round(scaledViewport.width);
          canvas.height = Math.round(scaledViewport.height);
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  },

  /**
   * Debounce function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Throttle function
   */
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * Check if device is mobile
   */
  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },

  /**
   * Get file icon based on type
   */
  getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
      pdf: '📄',
      jpg: '🖼️',
      jpeg: '🖼️',
      png: '🖼️',
      webp: '🖼️',
      zip: '📦'
    };
    return icons[ext] || '📁';
  },

  /**
   * Sanitize filename
   */
  sanitizeFilename(filename) {
    return filename.replace(/[^a-z0-9._-]/gi, '_');
  },

  /**
   * Estimate processing time
   */
  estimateProcessingTime(fileSizeMB, operation) {
    const baseTimes = {
      merge: 0.5,
      split: 0.3,
      compress: 1.0,
      rotate: 0.2,
      watermark: 0.4,
      convert: 0.8
    };
    const baseTime = baseTimes[operation] || 0.5;
    return Math.round(baseTime * fileSizeMB * 1000);
  }
};

// Export for browser usage
if (typeof window !== 'undefined') {
  window.PDFUtils = PDFUtils;
}
