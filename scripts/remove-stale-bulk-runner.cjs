#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const target = path.join(process.cwd(), 'js', 'pages', 'tool-runner.js');
let src = fs.readFileSync(target, 'utf8');
const before = src;

// Bulk tools were removed from the public product. Do not leave the runner
// pointing at a worker that no longer exists.
src = src.replace(/\n\s*if \(itype === 'bulk'\) \{\n\s*return runBulk\(slug, file, controls\);\n\s*\}\n/, '\n');

// Remove the obsolete bulk runner section, bounded by its existing section markers.
src = src.replace(/\n\/\* ═+\n\s*BULK RUNNER[\s\S]*?(?=\n\/\* ═+\n\s*UTILITY TOOLS)/, '\n');

if (src === before) {
  throw new Error('[Pixaroid] Expected stale bulk runner code was not found; refusing to modify tool-runner.js.');
}

if (src.includes("/workers/bulk.worker.js") || src.includes('runBulk(') || src.includes("itype === 'bulk'")) {
  throw new Error('[Pixaroid] Stale bulk runner reference remains after repair.');
}

fs.writeFileSync(target, src, 'utf8');
console.log('[Pixaroid] Removed stale bulk execution path from tool-runner.js');
