#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const TOOLS = path.join(ROOT, 'tools');
const files = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f);
    else if (e.isFile() && e.name.toLowerCase() === 'index.html') files.push(f);
  }
}
walk(TOOLS);

const issues = [];
let adPresent = 0;
let noindex = 0;
let missingCanonical = 0;
let missingScript = 0;
let suspicious = 0;

const SUSPICIOUS = /coming soon|not implemented|not connected|demo only|demo interface|placeholder|simulated|fake tool|example only/i;
const API = /fetch\(|XMLHttpRequest|axios|https?:\/\/[^\s"']+\/api|googleapis|openai|removebg|remove\.bg/i;
const DOWNLOAD = /download|toBlob\(|URL\.createObjectURL|saveAs\(/i;

for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const rel = '/' + path.relative(ROOT, file).replaceAll(path.sep, '/');
  const problems = [];

  if (/noindex/i.test(html.match(/<meta[^>]+name=["']robots["'][^>]*>/i)?.[0] || '')) { noindex++; problems.push('noindex'); }
  if (!/<link[^>]+rel=["']canonical["']/i.test(html)) { missingCanonical++; problems.push('missing canonical'); }
  if (/quge5\.com\/88\/tag\.min\.js/i.test(html) || /data-pixaroid-ad-slot=["']quge5["']/i.test(html)) adPresent++;
  else problems.push('missing ad slot');
  if (!/<script[^>]+src=|<script>/i.test(html)) { missingScript++; problems.push('no JavaScript'); }
  if (SUSPICIOUS.test(html)) { suspicious++; problems.push('suspicious/demo wording'); }

  const hasFileInput = /type=["']file["']/i.test(html) || /dropzone|drop-zone|drag.?drop/i.test(html);
  const isFileTool = /tools\/(compression|conversion|resize|editor|ai-tools|pdf-tools|social-tools)\//i.test(rel);
  if (isFileTool && !hasFileInput) problems.push('no obvious file input/dropzone');
  if (isFileTool && !DOWNLOAD.test(html)) problems.push('no obvious download/export path');
  if (API.test(html)) problems.push('external/API dependency');

  if (problems.length) issues.push({ rel, problems });
}

console.log(`FUNCTIONALITY AUDIT: ${files.length} tool pages scanned`);
console.log(`Ad integration: ${adPresent}/${files.length}`);
console.log(`Noindex pages: ${noindex}`);
console.log(`Missing canonical: ${missingCanonical}`);
console.log(`Missing script: ${missingScript}`);
console.log(`Suspicious/demo wording: ${suspicious}`);
console.log(`Pages with findings: ${issues.length}`);

for (const item of issues.slice(0, 40)) console.log(` - ${item.rel}: ${item.problems.join(', ')}`);
if (issues.length > 40) console.log(` - ... ${issues.length - 40} more pages with findings`);

// This is an audit, not a deployment gate. Runtime/browser testing follows in Phase 1 repair.
process.exit(0);
