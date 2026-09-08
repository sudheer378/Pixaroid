#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const target = path.join(process.cwd(), 'js', 'pages', 'tool-runner.js');
let src = fs.readFileSync(target, 'utf8');

const start = src.indexOf('function runWorker(workerPath, payload, transferBuffer) {');
const end = src.indexOf('\n/* ══════════════════════════════════════════════════════════\n   AI RUNNER', start);
if (start < 0 || end < 0) throw new Error('Could not locate runWorker block safely.');

const replacement = `function runWorker(workerPath, payload, transferBuffer) {
  return new Promise((resolve, reject) => {
    const originalSize = payload.buffer instanceof ArrayBuffer ? payload.buffer.byteLength : 0;
    let worker;
    try { worker = new Worker(workerPath); }
    catch(e) { reject(new Error('Worker failed to load: ' + workerPath)); return; }

    const jobId = (Math.random()*1e9|0).toString(36);
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error('Processing timed out after 60s. Try a smaller image.'));
    }, 60000);

    worker.onmessage = (e) => {
      if (e.data?.jobId !== jobId) return;
      clearTimeout(timer);
      worker.terminate();
      if (e.data.error) {
        reject(new Error(e.data.error));
        return;
      }
      const outputBuffer = e.data.buffer;
      if (!(outputBuffer instanceof ArrayBuffer)) {
        reject(new Error('Worker returned no output buffer.'));
        return;
      }
      const mime = e.data.mime || (
        e.data.format === 'png' ? 'image/png' :
        e.data.format === 'webp' ? 'image/webp' :
        e.data.format === 'avif' ? 'image/avif' :
        'image/jpeg'
      );
      const blob = new Blob([outputBuffer], { type: mime });
      const savings = originalSize > 0
        ? Math.max(0, Math.round((1 - blob.size / originalSize) * 100))
        : 0;
      resolve({
        blob,
        width: e.data.width || null,
        height: e.data.height || null,
        format: e.data.format || null,
        originalSize,
        resultSize: blob.size,
        savings,
      });
    };

    worker.onerror = (e) => {
      clearTimeout(timer);
      worker.terminate();
      reject(new Error(e.message || 'Worker crashed. Check browser console.'));
    };

    const msg = { jobId, ...payload };
    const transfers = transferBuffer instanceof ArrayBuffer ? [transferBuffer] : [];
    worker.postMessage(msg, transfers);
  });
}
`;

src = src.slice(0, start) + replacement + src.slice(end);
fs.writeFileSync(target, src, 'utf8');
console.log('[Pixaroid] Repaired tool-runner worker result handling:', target);
