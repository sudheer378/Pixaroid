#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const CONFIG = path.join(ROOT, 'config', 'tools-config.js');
const src = fs.readFileSync(CONFIG, 'utf8');

// Validate the declarative tool map without executing browser-side configuration code.
const entries = [...src.matchAll(/slug:\s*['"]([^'"]+)['"][\s\S]*?interfaceType:\s*['"]([^'"]+)['"][\s\S]*?workerFile:\s*['"]([^'"]*)['"]/g)]
  .map(m => ({ slug:m[1], interfaceType:m[2], workerFile:m[3] }));

if (!entries.length) throw new Error('[Pixaroid] No tool capability entries could be parsed.');

const runnerTypes = new Set([
  'compress','compress-target','convert','convert-multi','convert-pdf','resize','resize-social',
  'social-canvas','ai-bg-remove','ai-upscale','ai-enhance','ai-sharpen','ai-colorize','ai-ocr',
  'ai','utility','filter','editor','crop','rotate','flip','watermark','text-overlay','blur','sharpen',
  'adjust','meme','base64','base64decode','border'
]);
const specialTypes = new Set(['pdf','legacy','special','info','metadata','palette','calculator']);
const removedBulkSlugs = new Set([
  'bulk-image-compress','bulk-image-resize','bulk-image-convert','bulk-image-watermark','youtube-thumbnail-maker'
]);
const errors = [];
const seen = new Set();

for (const t of entries) {
  if (seen.has(t.slug)) errors.push(`Duplicate slug: ${t.slug}`);
  seen.add(t.slug);

  if (removedBulkSlugs.has(t.slug)) {
    errors.push(`Invalid/removed tool mapping: ${t.slug}`);
    continue;
  }

  if (!t.interfaceType) errors.push(`Missing interfaceType: ${t.slug}`);

  if (t.workerFile && t.workerFile.startsWith('/workers/')) {
    const local = path.join(ROOT, t.workerFile.replace(/^\//,''));
    if (!fs.existsSync(local)) errors.push(`Missing worker ${t.workerFile} for ${t.slug}`);
  }

  if (!runnerTypes.has(t.interfaceType) && !specialTypes.has(t.interfaceType)) {
    errors.push(`Unknown interfaceType ${t.interfaceType} for ${t.slug}`);
  }
}

console.log(`[Pixaroid] Capability validation: ${entries.length} configured tools`);
console.log(`[Pixaroid] runner-capable=${entries.filter(x=>runnerTypes.has(x.interfaceType)).length}, special/legacy=${entries.filter(x=>specialTypes.has(x.interfaceType)).length}`);
if (errors.length) {
  console.error(errors.map(e=>`[Pixaroid] ERROR: ${e}`).join('\n'));
  process.exit(1);
}
console.log('[Pixaroid] Capability map passed. No missing worker mappings or unknown execution types.');
