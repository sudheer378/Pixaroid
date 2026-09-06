#!/usr/bin/env node
/**
 * Pixaroid SEO build pass: convert legacy noindex tool pages into
 * indexable, self-canonical pages.
 *
 * This runs BEFORE sitemap generation so newly indexable URLs are
 * included in sitemap-tools.xml.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TOOLS_DIR = path.join(ROOT, 'tools');
const DOMAIN = 'https://pixaroid.vercel.app';

let changed = 0;

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name.toLowerCase() === 'index.html') out.push(full);
  }
  return out;
}

function escapeAttr(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

for (const file of walk(TOOLS_DIR)) {
  let html = fs.readFileSync(file, 'utf8');
  if (!/meta[^>]+name=["']robots["'][^>]+content=["']noindex\s*,/i.test(html)) continue;

  const relative = path.relative(ROOT, file).split(path.sep).join('/');
  const toolPath = relative.replace(/\/index\.html$/i, '/');
  const canonical = `${DOMAIN}/${toolPath}`;

  html = html.replace(
    /(<meta\s+name=["']robots["']\s+content=["'])noindex\s*,\s*(?:no)?follow(["'][^>]*>)/i,
    '$1index, follow$2'
  );

  // Legacy noindex pages frequently canonicalized to another tool.
  // Once promoted to indexable, each URL must have its own canonical.
  html = html.replace(
    /(<link\s+rel=["']canonical["']\s+href=["'])[^"']*(["'][^>]*>)/i,
    `$1${escapeAttr(canonical)}$2`
  );

  fs.writeFileSync(file, html);
  changed++;
}

console.log(`SEO index pass: converted ${changed} legacy noindex tool pages to index, follow + self-canonical.`);
