#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const TOOLS = path.join(ROOT, 'tools');
const LEGACY = 'tool-engine.js';
const RUNNER = 'tool-runner.js';

let pages = 0;
let runner = 0;
let legacy = 0;
let both = 0;
let unmapped = 0;

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

for (const file of walk(TOOLS).filter(f => f.endsWith('.html'))) {
  const html = fs.readFileSync(file, 'utf8');
  const hasRunner = html.includes(RUNNER);
  const hasLegacy = html.includes(LEGACY);
  pages++;
  if (hasRunner) runner++;
  if (hasLegacy) legacy++;
  if (hasRunner && hasLegacy) both++;
  if (!hasRunner && !hasLegacy) unmapped++;
}

console.log(`[Pixaroid] Execution-path audit: ${pages} tool HTML pages`);
console.log(`[Pixaroid] runner=${runner} legacy=${legacy} both=${both} unmapped=${unmapped}`);

if (both > 0) {
  throw new Error(`[Pixaroid] ${both} pages load both execution engines; refusing ambiguous migration.`);
}

// This is intentionally an audit, not an automatic legacy-engine deletion.
// Pages without either engine remain visible for explicit migration work.
console.log('[Pixaroid] Execution-path audit passed: no page loads both engines.');
