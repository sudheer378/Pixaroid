/**
 * AI Download Manager
 * Handles downloading processed images and text results
 */

const AIDownloadManager = {
  /**
   * Download canvas as image
   */
  downloadCanvas(canvas, filename = 'result.png', type = 'image/png', quality = 0.95) {
    if (!canvas) {
      throw new Error('No canvas provided');
    }

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL(type, quality);
    link.click();
    
    // Cleanup
    setTimeout(() => {
      URL.revokeObjectURL(link.href);
    }, 100);
  },

  /**
   * Download blob as file
   */
  downloadBlob(blob, filename) {
    if (!blob) {
      throw new Error('No blob provided');
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    link.click();
    
    // Cleanup
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  },

  /**
   * Download text content
   */
  downloadText(text, filename = 'extracted-text.txt', format = 'txt') {
    let content = text;
    let mimeType = 'text/plain';

    if (format === 'doc') {
      // Simple DOC format with basic HTML
      content = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' 
              xmlns:w='urn:schemas-microsoft-com:office:word'>
          <head><meta charset='utf-8'></head>
          <body>${text.replace(/\n/g, '<br>')}</body>
        </html>
      `;
      mimeType = 'application/msword';
    }

    const blob = new Blob([content], { type: mimeType });
    this.downloadBlob(blob, filename);
  },

  /**
   * Download multiple files as ZIP
   */
  async downloadAsZIP(files, zipFilename = 'results.zip') {
    if (typeof JSZip === 'undefined') {
      // Fallback: download files individually
      files.forEach((file, index) => {
        this.downloadBlob(file.blob, file.name || `file-${index + 1}.${file.type.split('/')[1]}`);
      });
      return;
    }

    const zip = new JSZip();
    
    files.forEach((file) => {
      zip.file(file.name, file.blob);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    this.downloadBlob(content, zipFilename);
  },

  /**
   * Create download button with animation
   */
  createDownloadButton(containerId, options = {}) {
    const {
      label = 'Download Result',
      icon = 'download',
      variant = 'primary',
      onClick
    } = options;

    const container = document.getElementById(containerId);
    if (!container) return;

    const variants = {
      primary: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white',
      secondary: 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white',
      success: 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
    };

    const icons = {
      download: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>',
      image: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>',
      text: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>'
    };

    container.innerHTML = `
      <button id="download-btn" class="${variants[variant]} px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2">
        ${icons[icon] || icons.download}
        <span>${label}</span>
      </button>
    `;

    const btn = document.getElementById('download-btn');
    if (btn && onClick) {
      btn.addEventListener('click', onClick);
    }

    return btn;
  },

  /**
   * Show download success notification
   */
  showSuccess(message = 'Download started!') {
    const notification = document.createElement('div');
    notification.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-up z-50';
    notification.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
      </svg>
      <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(20px)';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  },

  /**
   * Get file size formatted
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Estimate download time
   */
  estimateDownloadTime(fileSize, speed = 1024 * 1024) {
    // Default speed: 1 MB/s
    const seconds = fileSize / speed;
    
    if (seconds < 1) return 'Instant';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${Math.round(seconds % 60)}s`;
  }
};
