#!/usr/bin/env node
const { execFileSync } = require('node:child_process');

const steps = [
  'remove-bulk-tools.cjs',
  'index-noindex-pages.cjs',
  'upgrade-international-tools.cjs',
  'normalize-international-seo.cjs',
  'optimize-international-seo.cjs',
  'optimize-tier-a-seo.cjs',
  'generate-aeo.cjs',
  'generate-llms.cjs',
  'generate-entity-seo.cjs',
  'generate-semantic-network.cjs',
  'generate-sitemap-tools.cjs',
  'optimize-seo.cjs',
  'add-priority-links.cjs',
  'fix-category-nav.cjs',
  'repair-heic-and-formats.cjs',
  'repair-filter-worker.cjs',
  'repair-tool-runner.cjs',
  'remove-stale-bulk-runner.cjs',
  'audit-execution-paths.cjs',
  'audit-tool-functionality.cjs'
];

for (const script of steps) {
  console.log(`\n[Pixaroid SEO/AEO/GEO] Running ${script}`);
  execFileSync(process.execPath, [`scripts/${script}`], { stdio: 'inherit' });
}

console.log('\n[Pixaroid SEO/AEO/GEO] Build pipeline completed successfully.');
