#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const BULK_DIR = path.join(ROOT, 'tools', 'bulk-tools');
const INDEX = path.join(ROOT, 'index.html');

function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }
function write(file, content) { fs.writeFileSync(file, content, 'utf8'); }

// Bulk processing is intentionally removed from the public product surface.
if (fs.existsSync(BULK_DIR)) {
  fs.rmSync(BULK_DIR, { recursive: true, force: true });
  console.log('✓ Removed tools/bulk-tools from build output');
}

if (fs.existsSync(INDEX)) {
  let html = read(INDEX);
  const before = html.length;

  // Remove the Bulk category tab.
  html = html.replace(/\s*<button\b[^>]*data-cat=["']bulk-tools["'][^>]*>[\s\S]*?<\/button>/gi, '');

  // Remove single-line entries from the homepage TOOLS registry.
  html = html.replace(/^\s*\{[^\n]*c:\s*['"]bulk-tools['"][^\n]*\},?\s*$/gmi, '');

  // Remove direct bulk-tool links from generated navigation/related blocks.
  html = html.replace(/<a\b[^>]*href=["'][^"']*\/tools\/bulk-tools\/[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, '');
  html = html.replace(/<a\b[^>]*href=["']\/bulk["'][^>]*>[\s\S]*?<\/a>/gi, '');

  if (html.length < 50000) throw new Error(`Safety check failed: index.html shrank from ${before} to ${html.length} bytes`);
  write(INDEX, html);
  console.log('✓ Removed Bulk category and bulk links from homepage build');
}

// Remove obsolete bulk category metadata from small routing/config files when present.
const replacements = [
  [path.join(ROOT, 'js', 'modules', 'internal-links.js'), /\n\s*['"]bulk-tools['"]\s*:\s*\{[^}]*\},?/g, ''],
  [path.join(ROOT, 'js', 'modules', 'seo-meta.js'), /\n\s*['"]bulk-tools['"]\s*:\s*['"][^'"]*['"],?/g, ''],
  [path.join(ROOT, 'scripts', 'regenerate-sitemaps.py'), /\n\s*['"]bulk-tools['"]\s*:\s*['"][^'"]*['"],?/g, ''],
];
for (const [file, pattern, replacement] of replacements) {
  if (!fs.existsSync(file)) continue;
  const old = read(file);
  const next = old.replace(pattern, replacement);
  if (next !== old) write(file, next);
}

// Remove stale bulk URLs from remaining HTML source files without creating replacement pages.
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const f = path.join(dir, e.name);
    return e.isDirectory() ? walk(f) : (e.isFile() && f.endsWith('.html') ? [f] : []);
  });
}
for (const file of walk(path.join(ROOT, 'guides'))) {
  const old = read(file);
  const next = old.replace(/\s*<a\b[^>]*href=["'][^"']*\/tools\/bulk-tools\/[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, '');
  if (next !== old) write(file, next);
}

console.log('✓ Bulk-tool references removed from the generated site surface');
