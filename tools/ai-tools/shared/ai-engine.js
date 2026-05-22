/**
 * Shared AI Engine for Browser-based Image Processing
 * Handles upscaling, background removal, enhancement, colorization, and OCR
 */

class AIEngine {
  constructor() {
    this.workers = new Map();
    this.onnxSession = null;
    this.tesseractWorker = null;
  }

  async init() {
    // Initialize ONNX Runtime if needed
    if (typeof ort !== 'undefined') {
      try {
        this.onnxSession = await ort.InferenceSession.create('/tools/ai-tools/models/u2net.onnx');
      } catch (e) {
        console.log('ONNX model not loaded, using fallback methods');
      }
    }
    
    // Initialize Tesseract for OCR
    if (typeof Tesseract !== 'undefined') {
      this.tesseractWorker = Tesseract.createWorker();
      await this.tesseractWorker.load();
    }
  }

  /**
   * Remove background from image using segmentation
   */
  async removeBackground(imageData, options = {}) {
    const { feather = 2, threshold = 0.5, backgroundColor = null } = options;
    
    return new Promise((resolve, reject) => {
      const worker = new Worker('/tools/ai-tools/workers/bg-removal.worker.js');
      
      worker.onmessage = (e) => {
        const { type, data, error } = e.data;
        
        if (type === 'progress') {
          if (options.onProgress) options.onProgress(data);
        } else if (type === 'complete') {
          worker.terminate();
          resolve(data);
        } else if (type === 'error') {
          worker.terminate();
          reject(new Error(error));
        }
      };
      
      worker.onerror = (err) => {
        worker.terminate();
        reject(err);
      };
      
      worker.postMessage({
        type: 'remove-background',
        imageData,
        options: { feather, threshold, backgroundColor }
      });
    });
  }

  /**
   * Upscale image using AI super-resolution
   */
  async upscaleImage(imageData, options = {}) {
    const { scale = 2, enhance = true, denoise = false } = options;
    
    return new Promise((resolve, reject) => {
      const worker = new Worker('/tools/ai-tools/workers/upscaler.worker.js');
      
      worker.onmessage = (e) => {
        const { type, data, error } = e.data;
        
        if (type === 'progress') {
          if (options.onProgress) options.onProgress(data);
        } else if (type === 'complete') {
          worker.terminate();
          resolve(data);
        } else if (type === 'error') {
          worker.terminate();
          reject(new Error(error));
        }
      };
      
      worker.onerror = (err) => {
        worker.terminate();
        reject(err);
      };
      
      worker.postMessage({
        type: 'upscale',
        imageData,
        options: { scale, enhance, denoise }
      });
    });
  }

  /**
   * Enhance photo with smart adjustments
   */
  async enhancePhoto(imageData, options = {}) {
    const { 
      brightness = 0, 
      contrast = 0, 
      saturation = 0, 
      sharpen = 0, 
      denoise = 0,
      faceEnhance = false 
    } = options;
    
    return new Promise((resolve, reject) => {
      const worker = new Worker('/tools/ai-tools/workers/enhancer.worker.js');
      
      worker.onmessage = (e) => {
        const { type, data, error } = e.data;
        
        if (type === 'progress') {
          if (options.onProgress) options.onProgress(data);
        } else if (type === 'complete') {
          worker.terminate();
          resolve(data);
        } else if (type === 'error') {
          worker.terminate();
          reject(new Error(error));
        }
      };
      
      worker.onerror = (err) => {
        worker.terminate();
        reject(err);
      };
      
      worker.postMessage({
        type: 'enhance',
        imageData,
        options: { brightness, contrast, saturation, sharpen, denoise, faceEnhance }
      });
    });
  }

  /**
   * Colorize grayscale image
   */
  async colorizePhoto(imageData, options = {}) {
    const { intensity = 1, vintage = false } = options;
    
    return new Promise((resolve, reject) => {
      const worker = new Worker('/tools/ai-tools/workers/colorizer.worker.js');
      
      worker.onmessage = (e) => {
        const { type, data, error } = e.data;
        
        if (type === 'progress') {
          if (options.onProgress) options.onProgress(data);
        } else if (type === 'complete') {
          worker.terminate();
          resolve(data);
        } else if (type === 'error') {
          worker.terminate();
          reject(new Error(error));
        }
      };
      
      worker.onerror = (err) => {
        worker.terminate();
        reject(err);
      };
      
      worker.postMessage({
        type: 'colorize',
        imageData,
        options: { intensity, vintage }
      });
    });
  }

  /**
   * Extract text from image using OCR
   */
  async extractText(imageData, options = {}) {
    const { lang = 'eng', detectOnly = false } = options;
    
    if (!this.tesseractWorker) {
      throw new Error('Tesseract not initialized');
    }
    
    try {
      await this.tesseractWorker.loadLanguage(lang);
      await this.tesseractWorker.initialize(lang);
      
      const result = await this.tesseractWorker.recognize(imageData);
      
      if (options.onProgress) {
        options.onProgress(100);
      }
      
      return {
        text: result.text,
        confidence: result.data.confidence,
        words: result.data.words,
        lines: result.data.lines,
        paragraphs: result.data.paragraphs
      };
    } catch (error) {
      throw new Error(`OCR failed: ${error.message}`);
    }
  }

  /**
   * Sharpen image details
   */
  async sharpenImage(imageData, options = {}) {
    const { amount = 1, radius = 1, threshold = 0 } = options;
    
    return new Promise((resolve, reject) => {
      const worker = new Worker('/tools/ai-tools/workers/sharpener.worker.js');
      
      worker.onmessage = (e) => {
        const { type, data, error } = e.data;
        
        if (type === 'progress') {
          if (options.onProgress) options.onProgress(data);
        } else if (type === 'complete') {
          worker.terminate();
          resolve(data);
        } else if (type === 'error') {
          worker.terminate();
          reject(new Error(error));
        }
      };
      
      worker.onerror = (err) => {
        worker.terminate();
        reject(err);
      };
      
      worker.postMessage({
        type: 'sharpen',
        imageData,
        options: { amount, radius, threshold }
      });
    });
  }

  async cleanup() {
    if (this.tesseractWorker) {
      await this.tesseractWorker.terminate();
      this.tesseractWorker = null;
    }
    
    this.workers.forEach(worker => worker.terminate());
    this.workers.clear();
  }
}

// Singleton instance
const aiEngine = new AIEngine();
