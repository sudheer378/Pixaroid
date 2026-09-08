#!/usr/bin/env node
/**
 * Pixaroid — first verified image-tool execution migration
 *
 * This build-time migration is intentionally allowlisted. It does not touch
 * PDFs, AI, HEIC, utilities, bulk tools, or unverified editor variants.
 * The existing page UI remains in place; only the processing trigger is
 * delegated to the central tool-runner.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const BASE = path.join(ROOT, 'tools');

// First batch: shared compression worker contract has already been repaired.
const BATCH = new Set([
  'compression/compress-image',
  'compression/compress-image-to-20kb',
  'compression/compress-image-to-50kb',
  'compression/compress-image-to-100kb',
  'compression/compress-image-to-200kb',
  'compression/compress-image-to-500kb',
  'compression/reduce-image-size',
  'compression/reduce-jpg-size',
  'compression/reduce-png-size',
]);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

let migrated = 0;
let skipped = 0;
const failures = [];

for (const file of walk(BASE).filter(f => f.endsWith('.html'))) {
  const rel = path.relative(BASE, file).replaceAll(path.sep, '/').replace(/\/index\.html$/, '');
  if (!BATCH.has(rel)) continue;

  let html = fs.readFileSync(file, 'utf8');
  const slug = rel.split('/').at(-1);
  const category = rel.split('/')[0];

  // Hard safety checks: do not mutate an unexpected page shape.
  if (!html.includes(`var SLUG  = '${slug}'`) || !html.includes(`var CAT   = '${category}'`)) {
    failures.push(`${rel}: expected template identifiers not found`);
    continue;
  }
  if (!html.includes('var result=await process(curFile,itype,controls);')) {
    failures.push(`${rel}: expected legacy process trigger not found`);
    continue;
  }
  if (html.includes('/js/pages/tool-runner.js')) {
    skipped++;
    continue;
  }

  const runnerTag = `\n<script type="module" data-tool="${slug}" data-category="${category}" src="/js/pages/tool-runner.js"></script>\n`;
  html = html.replace('</body>', runnerTag + '</body>');

  // Bridge the existing UI controller to the central runner. The UI/error
  // handling remains exactly where it was; only the processing implementation
  // changes. A readiness wait prevents a module-startup race.
  const bridge = `\n/* PIXAROID FIRST-BATCH RUNNER BRIDGE — ${slug} */\nasync function runViaCentralRunner(file, controls){\n  if (!window.__pixaroidRunnerReady) {\n    await new Promise(function(resolve, reject){\n      var timer=setTimeout(function(){document.removeEventListener('pxn:runner-ready', ready);reject(new Error('Central tool runner did not initialize.'));},10000);\n      function ready(){clearTimeout(timer);document.removeEventListener('pxn:runner-ready', ready);resolve();}\n      document.addEventListener('pxn:runner-ready', ready);\n    });\n  }\n  return new Promise(function(resolve, reject){\n    function onResult(e){cleanup();resolve(e.detail);}\n    function onError(e){cleanup();reject(new Error((e.detail&&e.detail.message)||'Processing failed.'));}\n    function cleanup(){document.removeEventListener('pxn:result',onResult);document.removeEventListener('pxn:error',onError);}\n    document.addEventListener('pxn:result',onResult);\n    document.addEventListener('pxn:error',onError);\n    document.dispatchEvent(new CustomEvent('pxn:process',{detail:{file:file,controls:controls}}));\n  });\n}\n`;

  const marker = '/* PIXAROID FIRST-BATCH RUNNER BRIDGE';
  const insertionPoint = html.indexOf('/* ── FILE HANDLING ── */');
  if (insertionPoint < 0) {
    failures.push(`${rel}: file-handling insertion point not found`);
    continue;
  }
  html = html.slice(0, insertionPoint) + bridge + '\n' + html.slice(insertionPoint);

  html = html.replace('var result=await process(curFile,itype,controls);', 'var result=await runViaCentralRunner(curFile,controls);');
  html = html.replace('var result=await process(curFile,itype,controls);', 'var result=await runViaCentralRunner(curFile,controls);');

  // Make the legacy processor unreachable for migrated pages without deleting
  // the surrounding UI code. This is the reversible safety boundary for the
  // first batch; later cleanup can remove the dead implementation after runtime
  // verification.
  html = html.replace("async function process(file,itype,ctrl){", "async function legacyProcessDisabled(file,itype,ctrl){");

  if (!html.includes('runViaCentralRunner(curFile,controls)') || !html.includes('data-tool="' + slug + '"')) {
    failures.push(`${rel}: post-migration verification failed`);
    continue;
  }

  fs.writeFileSync(file, html, 'utf8');
  migrated++;
  console.log(`[Pixaroid] Migrated central runner: ${rel}`);
}

console.log(`[Pixaroid] First image batch: migrated=${migrated}, skipped=${skipped}, failures=${failures.length}`);
if (failures.length) {
  console.error(failures.map(x => `[Pixaroid] ERROR: ${x}`).join('\n'));
  process.exit(1);
}
console.log('[Pixaroid] First image batch migration passed.');
