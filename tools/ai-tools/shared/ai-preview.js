/**
 * AI Preview Manager
 * Handles before/after previews and comparisons
 */

class AIPreviewManager {
  constructor() {
    this.beforeCanvas = null;
    this.afterCanvas = null;
    this.sliderElement = null;
    this.containerElement = null;
  }

  /**
   * Create preview container with before/after slider
   */
  createPreviewContainer(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="preview-wrapper relative overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
        <div class="before-after-slider relative" style="height: 500px;">
          <canvas id="after-canvas" class="absolute inset-0 w-full h-full"></canvas>
          <div id="before-clip" class="absolute inset-0 overflow-hidden border-r-2 border-white" style="width: 50%;">
            <canvas id="before-canvas" class="absolute"></canvas>
          </div>
          <div id="slider-handle" class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg cursor-ew-resize flex items-center justify-center text-gray-600 hover:scale-110 transition-transform">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"/>
            </svg>
          </div>
        </div>
        <div class="preview-controls flex justify-center gap-4 mt-4 p-4">
          <button id="toggle-view" class="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity">
            Toggle View
          </button>
          <button id="reset-slider" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
            Reset
          </button>
        </div>
      </div>
    `;

    this.containerElement = container.querySelector('.before-after-slider');
    this.beforeCanvas = document.getElementById('before-canvas');
    this.afterCanvas = document.getElementById('after-canvas');
    this.sliderElement = document.getElementById('slider-handle');
    this.beforeClip = document.getElementById('before-clip');

    this.setupSliderInteraction();
    this.setupControls();
  }

  /**
   * Setup slider drag interaction
   */
  setupSliderInteraction() {
    let isDragging = false;

    const handleMove = (e) => {
      if (!isDragging || !this.containerElement) return;

      const rect = this.containerElement.getBoundingClientRect();
      const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));

      this.beforeClip.style.width = `${percentage}%`;
      this.sliderElement.style.left = `${percentage}%`;

      // Update before canvas position
      if (this.beforeCanvas) {
        this.beforeCanvas.style.width = `${rect.width}px`;
        this.beforeCanvas.style.height = `${rect.height}px`;
      }
    };

    const handleStart = () => {
      isDragging = true;
      this.sliderElement.classList.add('scale-110');
    };

    const handleEnd = () => {
      isDragging = false;
      this.sliderElement.classList.remove('scale-110');
    };

    // Mouse events
    this.sliderElement.addEventListener('mousedown', handleStart);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);

    // Touch events
    this.sliderElement.addEventListener('touchstart', handleStart);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);
  }

  /**
   * Setup control buttons
   */
  setupControls() {
    const toggleBtn = document.getElementById('toggle-view');
    const resetBtn = document.getElementById('reset-slider');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const currentWidth = this.beforeClip.style.width;
        if (currentWidth === '50%') {
          this.beforeClip.style.width = '100%';
          this.sliderElement.style.left = '100%';
        } else {
          this.beforeClip.style.width = '0%';
          this.sliderElement.style.left = '0%';
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.beforeClip.style.width = '50%';
        this.sliderElement.style.left = '50%';
      });
    }
  }

  /**
   * Set before image
   */
  async setBeforeImage(source) {
    const img = await this.loadImage(source);
    
    if (!this.beforeCanvas || !this.containerElement) return;

    const rect = this.containerElement.getBoundingClientRect();
    
    // Calculate dimensions to fit
    const scale = Math.min(rect.width / img.width, rect.height / img.height);
    const width = img.width * scale;
    const height = img.height * scale;

    this.beforeCanvas.width = width;
    this.beforeCanvas.height = height;
    
    const ctx = this.beforeCanvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
  }

  /**
   * Set after image
   */
  async setAfterImage(source) {
    const img = await this.loadImage(source);
    
    if (!this.afterCanvas || !this.containerElement) return;

    const rect = this.containerElement.getBoundingClientRect();
    
    // Calculate dimensions to fit
    const scale = Math.min(rect.width / img.width, rect.height / img.height);
    const width = img.width * scale;
    const height = img.height * scale;

    this.afterCanvas.width = width;
    this.afterCanvas.height = height;
    
    const ctx = this.afterCanvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    // Sync before canvas size
    if (this.beforeCanvas) {
      this.beforeCanvas.width = width;
      this.beforeCanvas.height = height;
    }
  }

  /**
   * Load image from various sources
   */
  loadImage(source) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      
      if (typeof source === 'string') {
        img.src = source;
      } else if (source instanceof File) {
        const reader = new FileReader();
        reader.onload = (e) => img.src = e.target.result;
        reader.onerror = reject;
        reader.readAsDataURL(source);
      } else if (source instanceof HTMLCanvasElement) {
        img.src = source.toDataURL();
      } else if (source instanceof ImageData) {
        const canvas = document.createElement('canvas');
        canvas.width = source.width;
        canvas.height = source.height;
        const ctx = canvas.getContext('2d');
        ctx.putImageData(source, 0, 0);
        img.src = canvas.toDataURL();
      }
    });
  }

  /**
   * Update progress indicator
   */
  showProgress(percentage, message = 'Processing...') {
    const overlay = document.getElementById('processing-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
      const bar = overlay.querySelector('.progress-bar');
      const text = overlay.querySelector('.progress-text');
      if (bar) bar.style.width = `${percentage}%`;
      if (text) text.textContent = `${message} (${Math.round(percentage)}%)`;
    }
  }

  /**
   * Hide progress indicator
   */
  hideProgress() {
    const overlay = document.getElementById('processing-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  /**
   * Download result
   */
  downloadResult(filename = 'result.png', quality = 0.95) {
    if (!this.afterCanvas) return;
    
    const link = document.createElement('a');
    link.download = filename;
    link.href = this.afterCanvas.toDataURL('image/png', quality);
    link.click();
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.sliderElement) {
      this.sliderElement.removeEventListener('mousedown', () => {});
    }
    this.beforeCanvas = null;
    this.afterCanvas = null;
    this.sliderElement = null;
    this.containerElement = null;
  }
}

// Singleton instance
const aiPreviewManager = new AIPreviewManager();
