/**
 * AI Worker Manager
 * Manages Web Workers for AI processing tasks
 */

class AIWorkerManager {
  constructor() {
    this.workers = new Map();
    this.maxWorkers = navigator.hardwareConcurrency || 4;
    this.taskQueue = [];
    this.activeWorkers = 0;
  }

  /**
   * Get or create a worker for a specific task type
   */
  getWorker(taskType) {
    if (!this.workers.has(taskType)) {
      const workerPath = this.getWorkerPath(taskType);
      const worker = new Worker(workerPath);
      this.workers.set(taskType, worker);
    }
    return this.workers.get(taskType);
  }

  /**
   * Get worker file path based on task type
   */
  getWorkerPath(taskType) {
    const paths = {
      'bg-removal': '/tools/ai-tools/workers/bg-removal.worker.js',
      'upscaler': '/tools/ai-tools/workers/upscaler.worker.js',
      'enhancer': '/tools/ai-tools/workers/enhancer.worker.js',
      'colorizer': '/tools/ai-tools/workers/colorizer.worker.js',
      'sharpener': '/tools/ai-tools/workers/sharpener.worker.js',
      'ocr': '/tools/ai-tools/workers/ocr.worker.js'
    };
    
    if (!paths[taskType]) {
      throw new Error(`Unknown task type: ${taskType}`);
    }
    
    return paths[taskType];
  }

  /**
   * Execute a task with progress tracking
   */
  async execute(taskType, data, options = {}) {
    return new Promise((resolve, reject) => {
      const worker = this.getWorker(taskType);
      
      const messageId = Date.now() + Math.random();
      
      const messageHandler = (e) => {
        const { type, id, data: result, error, progress } = e.data;
        
        if (id !== messageId) return;
        
        if (type === 'progress') {
          if (options.onProgress) {
            options.onProgress(progress);
          }
        } else if (type === 'complete') {
          worker.removeEventListener('message', messageHandler);
          resolve(result);
        } else if (type === 'error') {
          worker.removeEventListener('message', messageHandler);
          reject(new Error(error));
        }
      };
      
      worker.addEventListener('message', messageHandler);
      
      worker.onerror = (err) => {
        worker.removeEventListener('message', messageHandler);
        reject(err);
      };
      
      worker.postMessage({
        type: taskType,
        id: messageId,
        data,
        options
      });
    });
  }

  /**
   * Queue a task for later execution
   */
  queueTask(taskType, data, options = {}) {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({
        taskType,
        data,
        options,
        resolve,
        reject
      });
      
      this.processQueue();
    });
  }

  /**
   * Process queued tasks
   */
  async processQueue() {
    if (this.activeWorkers >= this.maxWorkers || this.taskQueue.length === 0) {
      return;
    }

    const task = this.taskQueue.shift();
    this.activeWorkers++;

    try {
      const result = await this.execute(task.taskType, task.data, task.options);
      task.resolve(result);
    } catch (error) {
      task.reject(error);
    } finally {
      this.activeWorkers--;
      this.processQueue();
    }
  }

  /**
   * Terminate all workers
   */
  terminateAll() {
    this.workers.forEach((worker) => {
      worker.terminate();
    });
    this.workers.clear();
    this.taskQueue = [];
    this.activeWorkers = 0;
  }

  /**
   * Terminate a specific worker
   */
  terminateWorker(taskType) {
    if (this.workers.has(taskType)) {
      this.workers.get(taskType).terminate();
      this.workers.delete(taskType);
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      activeWorkers: this.activeWorkers,
      maxWorkers: this.maxWorkers,
      queuedTasks: this.taskQueue.length,
      totalWorkers: this.workers.size
    };
  }
}

// Singleton instance
const aiWorkerManager = new AIWorkerManager();
