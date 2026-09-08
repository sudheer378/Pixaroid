#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const target = path.join(process.cwd(), 'js', 'pages', 'tool-runner.js');
let src = fs.readFileSync(target, 'utf8');

// Worker replies contain an ArrayBuffer named `buffer`, not a Blob named `blob`.
// Also capture the original size BEFORE transferring the input ArrayBuffer.
src = src.replace(
  "function runWorker(workerPath, payload, transferBuffer) {\n  return new Promise((resolve, reject) => {",
  "function runWorker(workerPath, payload, transferBuffer) {\n  return new Promise((resolve, reject) => {\n    const originalSize = payload.buffer instanceof ArrayBuffer ? payload.buffer.byteLength : 0;"
);

src = src.replace(
  "      } else {\n        const blob = e.data.blob;\n        const origSize = payload.buffer?.byteLength || 0;\n        const savings  = origSize > 0 ? Math.max(0, Math.round((1 - blob.size/origSize)*100)) : 0;\n        resolve({\n          blob,\n          width:    e.data.width  || null,\n          height:   e.data.height || null,\n          format:   e.data.format || null,\n          originalSize: origSize,\n          resultSize:   blob.size,\n          savings,\n        });\n      }",
  "      } else {\n        const outputBuffer = e.data.buffer;\n        if (!(outputBuffer instanceof ArrayBuffer)) {\n          reject(new Error('Worker returned no output buffer.'));\n          return;\n        }\n        const blob = new Blob([outputBuffer], { type: e.data.mime || (e.data.format === 'png' ? 'image/png' : e.data.format === 'webp' ? 'image/webp' : 'image/jpeg') });\n        const origSize = originalSize;\n        const savings  = origSize > 0 ? Math.max(0, Math.round((1 - blob.size/origSize)*100)) : 0;\n        resolve({\n          blob,\n          width:    e.data.width  || null,\n          height:   e.data.height || null,\n          format:   e.data.format || null,\n          originalSize: origSize,\n          resultSize:   blob.size,\n          savings,\n        });\n      }"
);

fs.writeFileSync(target, src, 'utf8');
console.log('[Pixaroid] Repaired tool-runner worker result handling:', target);
