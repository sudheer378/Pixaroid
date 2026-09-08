#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const CONFIG = path.join(ROOT, 'config', 'tools-config.js');
const TOOLS = path.join(ROOT, 'tools');
const BACKUP_MARKER = 'data-pixaroid-legacy-processing-backup="1"';
const RUNNER_TAG = /<script\b[^>]*\btool-runner\.js[^>]*><\/script>/i;
const CANDIDATES = new Set([
  'compress-image',
  'compress-image-to-20kb',
  'compress-image-to-50kb',
  'compress-image-to-100kb',
  'compress-image-to-200kb',
  'compress-image-to-500kb',
  'reduce-image-size',
  'reduce-jpg-size',
  'reduce-png-size'
]);

const src = fs.readFileSync(CONFIG, 'utf8');
const types = new Map();
for (const m of src.matchAll(/slug:\s*['"]([^'"]+)['"][\s\S]*?interfaceType:\s*['"]([^'"]+)['"]/g)) types.set(m[1], m[2]);

function findTool(slug) {
  const p = path.join(TOOLS, ...slug.split('/'), 'index.html');
  if (fs.existsSync(p)) return p;
  const all = [];
  function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const x=path.join(d,e.name);if(e.isDirectory())walk(x);else if(e.name==='index.html')all.push(x);}}
  walk(TOOLS);
  return all.find(p => path.basename(path.dirname(p)) === slug) || null;
}

const migrated = [];
for (const slug of CANDIDATES) {
  const itype = types.get(slug);
  if (itype !== 'compress' && itype !== 'compress-target') throw new Error(`[Pixaroid] ${slug} is not a verified compression type: ${itype}`);
  const file = findTool(slug);
  if (!file) throw new Error(`[Pixaroid] Missing page for ${slug}`);
  let html = fs.readFileSync(file, 'utf8');
  if (!html.includes('pxn:process')) throw new Error(`[Pixaroid] ${slug}: template lacks pxn:process contract.`);
  if (!html.includes('tool-runner.js')) {
    const tag = `<script type="module" data-tool="${slug}" data-category="compression" src="/js/pages/tool-runner.js"></script>`;
    html = html.replace(/<\/body>/i, `${tag}\n</body>`);
  }
  if (!RUNNER_TAG.test(html)) throw new Error(`[Pixaroid] ${slug}: runner tag injection failed.`);
  if (!html.includes(BACKUP_MARKER)) {
    html = html.replace(/(<script[^>]*>\s*\/\*\s*═+[^]*?<\/script>)/i, (m) => `<!-- ${BACKUP_MARKER} -->\n${m}`);
  }
  html = html.replace(/\s*<script\b[^>]*>\s*\/\*\s*═+[^]*?INLINE PROCESSING ENGINE[^]*?<\/script>\s*/i, '\n');
  fs.writeFileSync(file, html);
  migrated.push(path.relative(ROOT,file).replaceAll(path.sep,'/'));
}
console.log(`[Pixaroid] Compression migration complete: ${migrated.length} pages`);
for (const f of migrated) console.log(` - ${f}`);
