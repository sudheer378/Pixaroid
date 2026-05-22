/**
 * Image Utilities for AI Tools
 * Common image processing functions
 */

const ImageUtils = {
  /**
   * Load image from file or URL
   */
  loadImage(source) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(new Error('Failed to load image'));
      
      if (typeof source === 'string') {
        img.src = source;
      } else if (source instanceof File) {
        const reader = new FileReader();
        reader.onload = (e) => img.src = e.target.result;
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(source);
      } else if (source instanceof Blob) {
        const reader = new FileReader();
        reader.onload = (e) => img.src = e.target.result;
        reader.onerror = () => reject(new Error('Failed to read blob'));
        reader.readAsDataURL(source);
      }
    });
  },

  /**
   * Convert image to canvas
   */
  imageToCanvas(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return canvas;
  },

  /**
   * Convert canvas to Blob
   */
  canvasToBlob(canvas, type = 'image/png', quality = 0.95) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      }, type, quality);
    });
  },

  /**
   * Convert canvas to data URL
   */
  canvasToDataURL(canvas, type = 'image/png', quality = 0.95) {
    return canvas.toDataURL(type, quality);
  },

  /**
   * Get image data from canvas
   */
  getImageData(canvas) {
    const ctx = canvas.getContext('2d');
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  },

  /**
   * Put image data to canvas
   */
  putImageData(canvas, imageData) {
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
  },

  /**
   * Create thumbnail from image
   */
  async createThumbnail(source, maxWidth = 300, maxHeight = 300) {
    const img = await this.loadImage(source);
    
    let width = img.width;
    let height = img.height;
    
    // Calculate aspect ratio
    if (width > height) {
      if (width > maxWidth) {
        height = Math.round(height * maxWidth / width);
        width = maxWidth;
      }
    } else {
      if (height > maxHeight) {
        width = Math.round(width * maxHeight / height);
        height = maxHeight;
      }
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    
    return canvas;
  },

  /**
   * Apply mask to image
   */
  applyMask(imageData, maskData) {
    const data = imageData.data;
    const mask = maskData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const alpha = mask[i + 3] / 255;
      data[i + 3] = Math.round(data[i + 3] * alpha);
    }
    
    return imageData;
  },

  /**
   * Create transparent background
   */
  makeTransparent(imageData, threshold = 250) {
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // If pixel is close to white
      if (r > threshold && g > threshold && b > threshold) {
        data[i + 3] = 0;
      }
    }
    
    return imageData;
  },

  /**
   * Resize canvas
   */
  resizeCanvas(canvas, newWidth, newHeight) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = newWidth;
    tempCanvas.height = newHeight;
    
    const ctx = tempCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, newWidth, newHeight);
    
    return tempCanvas;
  },

  /**
   * Download image
   */
  downloadImage(canvas, filename = 'image.png', type = 'image/png', quality = 0.95) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL(type, quality);
    link.click();
  },

  /**
   * Compare two images (before/after)
   */
  compareImages(beforeCanvas, afterCanvas) {
    const beforeData = this.getImageData(beforeCanvas);
    const afterData = this.getImageData(afterCanvas);
    
    let diff = 0;
    const total = beforeData.data.length;
    
    for (let i = 0; i < total; i++) {
      diff += Math.abs(beforeData.data[i] - afterData.data[i]);
    }
    
    return (diff / total) * 100;
  },

  /**
   * Create before/after slider container
   */
  createBeforeAfterSlider(beforeSrc, afterSrc) {
    const container = document.createElement('div');
    container.className = 'ba-slider';
    container.style.cssText = `
      position: relative;
      overflow: hidden;
      display: inline-block;
    `;
    
    const afterImg = document.createElement('img');
    afterImg.src = afterSrc;
    afterImg.style.cssText = `
      display: block;
      max-width: 100%;
    `;
    
    const beforeDiv = document.createElement('div');
    beforeDiv.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 50%;
      height: 100%;
      overflow: hidden;
      border-right: 2px solid white;
    `;
    
    const beforeImg = document.createElement('img');
    beforeImg.src = beforeSrc;
    beforeImg.style.cssText = `
      display: block;
      max-width: none;
    `;
    
    beforeDiv.appendChild(beforeImg);
    container.appendChild(afterImg);
    container.appendChild(beforeDiv);
    
    // Add slider handle
    const handle = document.createElement('div');
    handle.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 40px;
      height: 40px;
      background: white;
      border-radius: 50%;
      cursor: ew-resize;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    `;
    handle.innerHTML = '◀▶';
    handle.style.display = 'flex';
    handle.style.alignItems = 'center';
    handle.style.justifyContent = 'center';
    handle.style.fontSize = '12px';
    
    container.appendChild(handle);
    
    return container;
  }
};
