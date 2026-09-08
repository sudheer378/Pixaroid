#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const target = path.join(process.cwd(), 'js', 'pages', 'tool-runner.js');
let src = fs.readFileSync(target, 'utf8');
const marker = "  });\n}\n\n/* ══════════════════════════════════════════════════════════\n   PROCESSING — no UI here, returns result object";
const replacement = "  });\n  window.__pixaroidRunnerReady = true;\n  document.dispatchEvent(new CustomEvent('pxn:runner-ready'));\n}\n\n/* ══════════════════════════════════════════════════════════\n   PROCESSING — no UI here, returns result object";
if (!src.includes(marker)) {
  if (src.includes('window.__pixaroidRunnerReady = true;')) {
    console.log('[Pixaroid] Runner-ready signal already present.');
    process.exit(0);
  }
  throw new Error('[Pixaroid] Expected tool-runner init boundary not found; refusing to patch.');
}
src = src.replace(marker, replacement);
fs.writeFileSync(target, src, 'utf8');
console.log('[Pixaroid] Added central-runner readiness signal.');
