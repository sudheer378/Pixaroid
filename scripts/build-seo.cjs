#!/usr/bin/env node
const { execFileSync } = require('node:child_process');

const steps = [
  'index-noindex-pages.cjs',
  'normalize-international-seo.cjs',
  'optimize-international-seo.cjs',
  'optimize-tier-a-seo.cjs',
  'generate-sitemap-tools.cjs',
  'optimize-seo.cjs',
  'add-priority-links.cjs'
];

for (const script of steps) {
  console.log(`\n[Pixaroid SEO] Running ${script}`);
  execFileSync(process.execPath, [`scripts/${script}`], { stdio: 'inherit' });
}

console.log('\n[Pixaroid SEO] Build pipeline completed successfully.');
