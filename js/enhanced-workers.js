/**
 * Pixaroid Enhanced Worker Wrapper — legacy compatibility.
 * Uses the shared enhanced worker with explicit job IDs and bounded retries.
 */
(function () {
'use strict';

function makeJobId() {
    return globalThis.crypto?.randomUUID?.() || `px_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

window.pxRunWorkerEnhanced = async function (workerPath, payload = {}, options = {}) {
    const retries = Math.max(0, Number(options.retries ?? 2));
    const timeout = Math.max(1000, Number(options.timeout ?? 60000));
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await runOnce(workerPath, payload, timeout, options.onProgress, options.jobId || makeJobId());
        } catch (error) {
            lastError = error;
            if (attempt < retries) await sleep(Math.min(1000 * 2 ** attempt, 5000));
        }
    }
    throw new Error(`Worker failed after ${retries + 1} attempt(s): ${lastError?.message || 'Unknown error'}`);
};

function runOnce(workerPath, payload, timeout, onProgress, jobId) {
    return new Promise((resolve, reject) => {
        let worker;
        try { worker = new Worker(workerPath); }
        catch (error) { reject(new Error(`Failed to load worker: ${workerPath}`)); return; }

        let settled = false;
        const finish = (fn, value) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            worker.terminate();
            fn(value);
        };
        const timer = setTimeout(() => finish(reject, new Error(`Processing timed out after ${Math.ceil(timeout / 1000)} seconds`)), timeout);

        worker.onmessage = e => {
            const data = e.data || {};
            if (data.jobId !== jobId) return;
            if (data.type === 'progress') {
                onProgress?.({ current:data.current, total:data.total, percent:data.percent, message:data.message });
                return;
            }
            if (data.type === 'error') { finish(reject, new Error(data.error || 'Worker failed.')); return; }
            if (data.type === 'batch-complete') { finish(resolve, data); return; }
            if (data.type !== 'complete') return;
            const blob = data.blob instanceof Blob
                ? data.blob
                : data.buffer instanceof ArrayBuffer ? new Blob([data.buffer], { type:data.mime || 'application/octet-stream' }) : null;
            if (!blob) { finish(reject, new Error('Worker returned no result data.')); return; }
            finish(resolve, {
                blob,
                width:data.width || null,
                height:data.height || null,
                format:data.format || null,
                mimeType:data.mime || blob.type,
                durationMs:0,
                originalSize:data.originalSize || null,
                resultSize:blob.size
            });
        };
        worker.onerror = e => finish(reject, new Error(e.message || 'Worker error.'));

        try {
            worker.postMessage({ jobId, ...payload });
        } catch (error) {
            finish(reject, new Error(`Failed to send data to worker: ${error.message}`));
        }
    });
}

window.pxProcessBatch = async function (files, workerPath, operation, settings = {}, options = {}) {
    const list = Array.from(files || []);
    const concurrency = Math.max(1, Math.min(8, Number(options.concurrency) || 3));
    const results = [];
    const errors = [];
    let next = 0;
    let completed = 0;

    async function lane() {
        while (true) {
            const index = next++;
            if (index >= list.length) return;
            const file = list[index];
            options.onBatchProgress?.({ current:index, total:list.length, filename:file.name, status:'processing' });
            try {
                const buffer = await file.arrayBuffer();
                const result = await window.pxRunWorkerEnhanced(workerPath, {
                    type:operation || 'compress', op:operation || 'compress', buffer, mime:file.type, ...settings
                }, { timeout:options.timeout, retries:options.retries, onProgress:options.onFileProgress });
                results.push({ filename:file.name, originalSize:file.size, result });
                completed++;
                options.onBatchProgress?.({ current:completed, total:list.length, filename:file.name, status:'completed', result });
            } catch (error) {
                errors.push({ filename:file.name, error:error.message });
                completed++;
                options.onBatchProgress?.({ current:completed, total:list.length, filename:file.name, status:'failed', error:error.message });
            }
        }
    }
    await Promise.all(Array.from({ length:Math.min(concurrency, list.length || 1) }, lane));
    return { successCount:results.length, errorCount:errors.length, total:list.length, results, errors };
};

window.pxFindOptimalQuality = async function (file, targetSizeKB, workerPath, options = {}) {
    const targetBytes = Number(targetSizeKB) * 1024;
    if (!Number.isFinite(targetBytes) || targetBytes <= 0) throw new Error('Target size must be positive.');
    const minQuality = Math.max(5, Number(options.minQuality ?? 10));
    const maxQuality = Math.min(100, Number(options.maxQuality ?? 95));
    const format = options.format || 'jpeg';
    const buffer = await file.arrayBuffer();
    let low = minQuality, high = maxQuality, best = null;
    while (low <= high) {
        const mid = Math.round((low + high) / 2);
        const result = await window.pxRunWorkerEnhanced(workerPath, {
            type:'compress', op:'compress', buffer, mime:file.type || 'image/jpeg', quality:mid, format
        }, options);
        if (result.blob.size <= targetBytes) { best = result; low = mid + 1; }
        else high = mid - 1;
    }
    if (best) return best;
    return window.pxRunWorkerEnhanced(workerPath, { type:'compress', op:'compress', buffer, mime:file.type || 'image/jpeg', quality:minQuality, format }, options);
};

console.log('[Pixaroid] Enhanced Workers compatibility module loaded');
})();
