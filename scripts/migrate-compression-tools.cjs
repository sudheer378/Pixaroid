#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const TOOLS = path.join(ROOT, 'tools');
const CANDIDATES = new Set([
  'compress-image','compress-image-to-20kb','compress-image-to-50kb',
  'compress-image-to-100kb','compress-image-to-200kb','compress-image-to-500kb',
  'reduce-image-size','reduce-jpg-size','reduce-png-size'
]);

function walk(dir, out=[]) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir,{withFileTypes:true})) {
    const p=path.join(dir,e.name);
    if(e.isDirectory()) walk(p,out); else if(e.name==='index.html') out.push(p);
  }
  return out;
}

const pages = walk(TOOLS);
const migrated = [];
for (const slug of CANDIDATES) {
  const file = pages.find(p => path.basename(path.dirname(p)) === slug);
  if (!file) throw new Error(`[Pixaroid] Missing compression page: ${slug}`);
  let html = fs.readFileSync(file,'utf8');

  // Safe phase only: ensure the central runner is present. Do NOT remove the
  // template's inline controller until its event contract has been migrated.
  // Removing it here can break the tool UI even when processing workers work.
  if (!html.includes('tool-runner.js')) {
    const tag = `<script type="module" data-tool="${slug}" data-category="compression" src="/js/pages/tool-runner.js"></script>`;
    if (!/<\/body>/i.test(html)) throw new Error(`[Pixaroid] ${slug}: no closing body tag.`);
    html = html.replace(/<\/body>/i, `${tag}\n</body>`);
  }
  if (!html.includes('tool-runner.js')) throw new Error(`[Pixaroid] ${slug}: runner injection failed.`);
  migrated.push(path.relative(ROOT,file).replaceAll(path.sep,'/'));
  fs.writeFileSync(file,html);
}

console.log(`[Pixaroid] Compression runner preparation complete: ${migrated.length} pages`);
for(const f of migrated) console.log(` - ${f}`);
console.log('[Pixaroid] Inline UI/controller code was preserved; processing migration remains gated.');
