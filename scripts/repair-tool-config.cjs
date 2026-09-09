#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const CONFIG = path.join(ROOT, 'config', 'tools-config.js');
let src = fs.readFileSync(CONFIG, 'utf8');

const removed = [
  'bulk-image-compress',
  'bulk-image-resize',
  'bulk-image-convert',
  'bulk-image-watermark',
  'youtube-thumbnail-maker',
];

for (const slug of removed) {
  const re = new RegExp(`\\n  \\{\\n    slug:\\s*['"]${slug}['"][\\s\\S]*?\\n  \\},\\n`, 'm');
  src = src.replace(re, '\n');
}

// The public product has no bulk-tools category, so remove its remaining config block.
src = src.replace(/\n  \/\* ═+\n\s*CATEGORY: bulk-tools[\s\S]*?(?=\n  \/\* ═+\n\s*\/\/ ── NEW HIGH-TRAFFIC TOOLS)/, '\n');

fs.writeFileSync(CONFIG, src, 'utf8');
console.log('[Pixaroid] Removed deprecated bulk-tool and stale YouTube thumbnail capability entries from tools-config.js');
