#!/usr/bin/env node
const { execFileSync } = require('node:child_process');

// Production deployment must only run deterministic cleanup/validation tasks.
// Content-generation and large-scale HTML rewriting are intentionally excluded
// so Vercel builds do not mutate committed website data.
const steps = [
  'remove-bulk-tools.cjs',
  'repair-heic-and-formats.cjs',
  'repair-filter-worker.cjs',
  'repair-tool-runner.cjs',
  'repair-runner-ready.cjs',
  'remove-stale-bulk-runner.cjs',
  'repair-tool-config.cjs',
  'validate-tool-config-repair.cjs',
  'validate-tool-capabilities.cjs'
];

for (const script of steps) {
  console.log(`\n[Pixaroid build] Running ${script}`);
  execFileSync(process.execPath, [`scripts/${script}`], { stdio: 'inherit' });
}

console.log('\n[Pixaroid build] Deterministic production build checks completed successfully.');
