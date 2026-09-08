#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const TAG = '<script src="https://quge5.com/88/tag.min.js" data-zone="277292" async data-cfasync="false"></script>';
const MARKER = 'data-pixaroid-ad-slot="quge5"';
const MIN_HTML_BYTES = 800;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) files.push(full);
  }
  return files;
}

function inject(html, file) {
  if (Buffer.byteLength(html, 'utf8') < MIN_HTML_BYTES) {
    throw new Error(`Refusing to modify suspiciously small HTML: ${path.relative(ROOT, file)}`);
  }

  html = html.replace(/\s*<!-- PIXAROID_QUge5_AD_START -->[\s\S]*?<!-- PIXAROID_QUge5_AD_END -->\s*/gi, '\n');
  html = html.split(TAG).join('');
  if (!/<body\b[^>]*>/i.test(html)) return html;

  const block = `\n<!-- PIXAROID_QUge5_AD_START -->\n<div ${MARKER} class="pixaroid-ad-slot" role="complementary" aria-label="Advertisement">\n  <div class="pixaroid-ad-slot__label">Advertisement</div>\n  ${TAG}\n</div>\n<style>.pixaroid-ad-slot{position:relative;z-index:1;width:100%;min-height:90px;margin:0 auto 16px;padding:8px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;overflow:hidden;text-align:center}.pixaroid-ad-slot__label{font:10px/1.2 system-ui,sans-serif;opacity:.55;margin-bottom:4px}.pixaroid-ad-slot + *{position:relative;z-index:2}@media(max-width:640px){.pixaroid-ad-slot{min-height:70px;margin-bottom:12px}}</style>\n</div>\n<!-- PIXAROID_QUge5_AD_END -->\n`;
  return html.replace(/(<body\b[^>]*>)/i, `$1${block}`);
}

const files = walk(ROOT);
let changed = 0;
for (const file of files) {
  const original = fs.readFileSync(file, 'utf8');
  const updated = inject(original, file);
  if (updated !== original) {
    fs.writeFileSync(file, updated, 'utf8');
    changed++;
  }
}
console.log(`✓ Quge5 ad slots installed on ${changed}/${files.length} HTML pages`);
