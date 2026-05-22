/**
 * Pixaroid PDF Worker Manager v1.0
 * Manages Web Workers for PDF processing
 */

class PDFWorkerManager {
  constructor() {
    this.workers = [];
    this.maxWorkers = navigator.hardwareConcurrency ? Math.min(navigator.hardwareConcurrency, 4) : 2;
    this.jobQueue = [];
    this.activeJobs = new Map();
    this.workerIdCounter = 0;
  }

  /**
   * Initialize worker pool
   */
  init() {
    for (let i = 0; i < this.maxWorkers; i++) {
      this.createWorker();
    }
    return this;
  }

  /**
   * Create a new worker
   */
  createWorker() {
    const workerId = this.workerIdCounter++;
    const worker = new Worker('/workers/pdf.worker.js');
    
    worker.onmessage = (e) => {
      this.handleWorkerMessage(workerId, e.data);
    };
    
    worker.onerror = (error) => {
      console.error(`Worker ${workerId} error:`, error);
      this.handleWorkerError(workerId, error);
    };
    
    this.workers.push({
      id: workerId,
      worker,
      busy: false,
      currentJobId: null
    });
    
    return workerId;
  }

  /**
   * Handle message from worker
   */
  handleWorkerMessage(workerId, data) {
    const workerInfo = this.workers.find(w => w.id === workerId);
    if (!workerInfo) return;

    // Handle progress updates
    if (data.type === 'progress') {
      const job = this.activeJobs.get(data.jobId);
      if (job && job.onProgress) {
        job.onProgress(data.percent);
      }
      return;
    }

    // Handle job completion
    const job = this.activeJobs.get(data.jobId);
    if (job) {
      workerInfo.busy = false;
      workerInfo.currentJobId = null;
      
      if (data.error) {
        job.reject(new Error(data.error));
      } else {
        job.resolve(data);
      }
      
      this.activeJobs.delete(data.jobId);
      this.processQueue();
    }
  }

  /**
   * Handle worker error
   */
  handleWorkerError(workerId, error) {
    const workerInfo = this.workers.find(w => w.id === workerId);
    if (workerInfo) {
      // Terminate failed worker and create replacement
      workerInfo.worker.terminate();
      this.workers = this.workers.filter(w => w.id !== workerId);
      this.createWorker();
    }

    // Reject any active job for this worker
    for (const [jobId, job] of this.activeJobs.entries()) {
      if (this.workers.find(w => w.id === workerId && w.currentJobId === jobId)) {
        job.reject(error);
        this.activeJobs.delete(jobId);
      }
    }
  }

  /**
   * Submit a job to be processed
   */
  submitJob(operation, data, onProgress) {
    return new Promise((resolve, reject) => {
      const jobId = this.generateJobId();
      
      this.jobQueue.push({
        jobId,
        operation,
        data,
        onProgress,
        resolve,
        reject
      });
      
      this.processQueue();
    });
  }

  /**
   * Process next job in queue
   */
  processQueue() {
    if (this.jobQueue.length === 0) return;

    const availableWorker = this.workers.find(w => !w.busy);
    if (!availableWorker) return;

    const job = this.jobQueue.shift();
    availableWorker.busy = true;
    availableWorker.currentJobId = job.jobId;

    this.activeJobs.set(job.jobId, {
      resolve: job.resolve,
      reject: job.reject,
      onProgress: job.onProgress
    });

    availableWorker.worker.postMessage({
      jobId: job.jobId,
      op: job.operation,
      ...job.data
    });
  }

  /**
   * Generate unique job ID
   */
  generateJobId() {
    return `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get worker status
   */
  getStatus() {
    return {
      totalWorkers: this.workers.length,
      busyWorkers: this.workers.filter(w => w.busy).length,
      queuedJobs: this.jobQueue.length,
      activeJobs: this.activeJobs.size
    };
  }

  /**
   * Terminate all workers
   */
  terminate() {
    this.workers.forEach(w => w.worker.terminate());
    this.workers = [];
    this.jobQueue = [];
    this.activeJobs.clear();
  }

  /**
   * Cancel a specific job
   */
  cancelJob(jobId) {
    const jobIndex = this.jobQueue.findIndex(j => j.jobId === jobId);
    if (jobIndex >= 0) {
      const job = this.jobQueue[jobIndex];
      job.reject(new Error('Job cancelled'));
      this.jobQueue.splice(jobIndex, 1);
      return true;
    }

    const workerInfo = this.workers.find(w => w.currentJobId === jobId);
    if (workerInfo) {
      // Can't really cancel mid-execution, but we can ignore the result
      return true;
    }

    return false;
  }
}

// Export for browser usage
if (typeof window !== 'undefined') {
  window.PDFWorkerManager = PDFWorkerManager;
}
