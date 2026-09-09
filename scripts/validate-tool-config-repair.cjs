#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const CONFIG = fs.readFileSync(path.join(ROOT, 'config', 'tools-config.js'), 'utf8');
const EXPECTED_REMOVED = ['bulk-image-compress','bulk-image-resize','bulk-image-convert','bulk-image-watermark','youtube-thumbnail-maker'];
const errors = [];
for (const slug of EXPECTED_REMOVED) {
  if (CONFIG.includes(`slug:          '${slug}'`) || CONFIG.includes(`slug: '${slug}'`)) errors.push(`Removed tool still configured: ${slug}`);
}
if (CONFIG.includes("CATEGORY: bulk-tools")) errors.push('Removed bulk-tools category still configured');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('[Pixaroid] Tool-config repair guard passed.');
