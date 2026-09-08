#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const TOOLS = path.join(ROOT, 'tools');
const OUT = path.join(ROOT, 'EXECUTION-MIGRATION-REPORT.md');

const SPECIAL = /(?:pdf|heic|ocr|ai-|background|upscal|enhanc|sharpen|coloriz|metadata|palette|calculator|qr|barcode|signature|watermark)/i;
const files = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, {withFileTypes:true})) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p); else if (e.name.endsWith('.html')) files.push(p);
  }
}
walk(TOOLS);

const rows = [];
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file).replaceAll(path.sep, '/');
  const slug = rel.replace(/^tools\//,'').replace(/\/index\.html$/,'');
  const hasRunner = /(?:src|href)=["'][^"']*tool-runner\.js/i.test(html) || html.includes('tool-runner.js');
  const hasLegacy = html.includes('tool-engine.js');
  const isPdf = /tools\/pdf-tools\//i.test(rel);
  const special = SPECIAL.test(slug);
  let status = 'UNMAPPED';
  if (hasRunner && !hasLegacy) status = 'RUNNER';
  else if (!hasRunner && hasLegacy) status = isPdf || special ? 'LEGACY-SPECIAL' : 'LEGACY-MIGRATE-CANDIDATE';
  else if (hasRunner && hasLegacy) status = 'CONFLICT';
  rows.push({rel, slug, status});
}

const counts = rows.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{});
let md = '# Pixaroid Execution Migration Report\n\n';
md += `Generated: ${new Date().toISOString()}\n\n`;
md += `Total tool HTML pages: **${rows.length}**\n\n`;
md += '| Status | Count |\n|---|---:|\n';
for (const k of ['RUNNER','LEGACY-MIGRATE-CANDIDATE','LEGACY-SPECIAL','CONFLICT','UNMAPPED']) md += `| ${k} | ${counts[k]||0} |\n`;
md += '\n## Migration candidates\n\n';
for (const r of rows.filter(x=>x.status==='LEGACY-MIGRATE-CANDIDATE')) md += `- ${r.rel}\n`;
md += '\n## Special/legacy pages\n\n';
for (const r of rows.filter(x=>x.status==='LEGACY-SPECIAL')) md += `- ${r.rel}\n`;
md += '\n## Safety\n\n';
md += '- This report does not modify tool pages.\n- CONFLICT pages are never auto-migrated.\n- PDF and special tools remain on their existing path until explicitly verified.\n- Only verified-compatible candidates should be migrated in a later step.\n';
fs.writeFileSync(OUT, md);
console.log(`[Pixaroid] Execution migration report: ${OUT}`);
console.log(`[Pixaroid] ${JSON.stringify(counts)}`);
if (counts.CONFLICT) throw new Error(`[Pixaroid] Found ${counts.CONFLICT} execution-path conflicts.`);
