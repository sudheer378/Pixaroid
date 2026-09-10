/**
 * Pixaroid Pro Engine — legacy compatibility adapter
 *
 * Kept only for the remaining standalone Pro tool page. New static tools use
 * /js/pages/tool-runner.js and /workers/*.worker.js.
 */
'use strict';

class PixaroidProEngine {
    constructor(options = {}) {
        this.maxFileSize = options.maxFileSize || 100 * 1024 * 1024;
        this.maxBatchSize = options.maxBatchSize || 50;
        this.workers = [];
        this.queue = [];
        this.processing = false;
        this.onProgress = options.onProgress || (() => {});
        this.onComplete = options.onComplete || (() => {});
        this.onError = options.onError || (() => {});
        this.initWorkers();
    }

    initWorkers() {
        const workerCount = navigator.hardwareConcurrency ? Math.min(4, navigator.hardwareConcurrency) : 2;
        for (let i = 0; i < workerCount; i++) {
            try {
                const worker = new Worker('/js/advanced-worker.js');
                const slot = { instance: worker, busy: false, id: i, taskId: null };
                worker.onmessage = e => this.handleWorkerMessage(slot, e);
                worker.onerror = e => this.handleWorkerError(slot, e);
                this.workers.push(slot);
            } catch (err) {
                console.warn('[Pixaroid] Pro worker unavailable:', err);
            }
        }
    }

    async processFiles(files, settings = {}) {
        const list = Array.from(files || []);
        if (list.length > this.maxBatchSize) throw new Error(`Maximum ${this.maxBatchSize} files allowed per batch.`);
        for (const file of list) {
            if (file.size > this.maxFileSize) throw new Error(`${file.name} exceeds the maximum file size.`);
        }

        this.queue = list.map((file, index) => ({ file, settings, status:'pending', progress:0, result:null, error:null, taskId:index }));
        if (!this.queue.length) return [];

        if (!this.workers.length) {
            throw new Error('No compatible Pro worker is available.');
        }

        this.processing = true;
        this._dispatch();
        await new Promise(resolve => { this._resolveQueue = resolve; });
        this.processing = false;
        return this.queue;
    }

    _dispatch() {
        for (const worker of this.workers) {
            if (worker.busy) continue;
            const task = this.queue.find(t => t.status === 'pending');
            if (!task) break;
            task.status = 'processing';
            worker.busy = true;
            worker.taskId = task.taskId;
            try {
                worker.instance.postMessage({ type:'process', file:task.file, settings:task.settings, taskId:task.taskId });
            } catch (error) {
                task.status = 'failed';
                task.error = error.message;
                worker.busy = false;
                worker.taskId = null;
                this.onError(error.message, task.file);
            }
        }
        this._finishIfDone();
    }

    handleWorkerMessage(worker, e) {
        const data = e.data || {};
        const task = this.queue.find(t => t.taskId === data.taskId);
        if (!task) return;

        if (data.type === 'progress') {
            task.progress = Math.max(0, Math.min(100, Number(data.progress) || 0));
            this.onProgress(this.getOverallProgress());
            return;
        }

        worker.busy = false;
        worker.taskId = null;

        if (data.type === 'complete') {
            task.status = 'completed';
            task.result = data.blobUrl || data.blob || null;
            task.resultSize = data.size || null;
            task.progress = 100;
        } else if (data.type === 'error') {
            task.status = 'failed';
            task.error = data.error || 'Processing failed.';
            this.onError(task.error, task.file);
        }

        this.onProgress(this.getOverallProgress());
        this._dispatch();
    }

    handleWorkerError(worker, e) {
        const task = this.queue.find(t => t.taskId === worker.taskId);
        worker.busy = false;
        worker.taskId = null;
        if (task) {
            task.status = 'failed';
            task.error = e?.message || 'Processing worker failed.';
            this.onError(task.error, task.file);
        }
        this._dispatch();
    }

    getOverallProgress() {
        if (!this.queue.length) return 0;
        const total = this.queue.reduce((sum, t) => sum + (t.status === 'completed' || t.status === 'failed' ? 100 : t.progress), 0);
        return Math.round(total / this.queue.length);
    }

    isAllComplete() {
        return this.queue.length > 0 && this.queue.every(t => t.status === 'completed' || t.status === 'failed');
    }

    _finishIfDone() {
        if (!this.isAllComplete()) return;
        this.onComplete(this.queue);
        this._resolveQueue?.();
        this._resolveQueue = null;
    }

    destroy() {
        this.workers.forEach(w => w.instance.terminate());
        this.workers = [];
        this.queue = [];
        this.processing = false;
        this._resolveQueue?.();
        this._resolveQueue = null;
    }
}

async function smartCompress(imageBlob, targetSizeKB) {
    const target = Number(targetSizeKB) * 1024;
    if (!Number.isFinite(target) || target <= 0) throw new Error('Target size must be positive.');
    const bitmap = await createImageBitmap(imageBlob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) { bitmap.close(); throw new Error('Canvas 2D context unavailable.'); }
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    let low = 0.1, high = 0.95, best = null;
    for (let i = 0; i < 8; i++) {
        const quality = (low + high) / 2;
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
        if (!blob) break;
        if (blob.size <= target) { best = blob; low = quality; } else high = quality;
    }
    if (best) return best;
    return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.1));
}

window.PixaroidProEngine = PixaroidProEngine;
window.smartCompress = smartCompress;
