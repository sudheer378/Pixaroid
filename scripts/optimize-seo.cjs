#!/usr/bin/env node
/**
 * SEO safety pass for high-priority tool pages.
 * Runs before Vercel serves the static output.
 *
 * Goals:
 * - Remove unsupported/fabricated AggregateRating structured data.
 * - Remove obsolete meta keywords from priority pages.
 * - Fix the duplicated AI breadcrumb label.
 * - Tighten a few claims that should not promise universal quality results.
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const priorityPages = [
  'tools/compression/compress-image/index.html',
  'tools/compression/compress-image-to-100kb/index.html',
  'tools/conversion/jpg-to-png/index.html',
  'tools/resize/resize-image/index.html',
  'tools/ai-tools/background-remover/index.html',
];

let changed = 0;
let skipped = 0;

function removeAggregateRating(html) {
  // The site's AggregateRating objects are not backed by a visible review system.
  // Remove only the simple object shape used by the generated tool pages.
  return html.replace(
    /\n\s*"aggregateRating"\s*:\s*\{\s*"@type"\s*:\s*"AggregateRating"\s*,[\s\S]*?\n\s*\},(?=\s*"featureList")/g,
    ''
  );
}

for (const relativePath of priorityPages) {
  const filePath = path.join(root, relativePath);

  if (!fs.existsSync(filePath)) {
    skipped++;
    console.warn(`[seo] Missing: ${relativePath}`);
    continue;
  }

  const original = fs.readFileSync(filePath, 'utf8');
  let html = original;

  html = removeAggregateRating(html);
  html = html.replace(/\n<meta name="keywords" content="[^"]*"\/>/g, '');
  html = html.replace(/"name": "AI Tools Tools"/g, '"name": "AI Tools"');

  if (relativePath === 'tools/compression/compress-image/index.html') {
    html = html.replace(
      'Compress JPEG, PNG, WebP and HEIC images online free. Reduce file size up to 90% with no visible quality loss. Instant, private, no upload.',
      'Compress JPEG, PNG, WebP and HEIC images online free. Reduce file size while preserving visual quality. Browser-based and no upload required.'
    );
    html = html.replace(
      'Compress images online free. Reduce JPEG, PNG, WebP and GIF file sizes by up to 90% without visible quality loss. Browser-based — no upload required.',
      'Compress images online free. Reduce JPEG, PNG, WebP and GIF file sizes while preserving visual quality. Browser-based — no upload required.'
    );
  }

  if (relativePath === 'tools/compression/compress-image-to-100kb/index.html') {
    html = html.replace(
      'Compress images to 100KB without losing quality. Ideal for website uploads, blog posts, and CMS platforms. Free, instant, browser-based.',
      'Compress images to 100KB online free. Reduce file size while preserving as much visual quality as possible. Browser-based and no upload required.'
    );
    html = html.replace(
      'Compress images to 100KB without losing quality. Ideal for website uploads, blog posts, and CMS platforms. Free, instant, browser-based.',
      'Compress images to 100KB online free. Reduce file size while preserving as much visual quality as possible. Browser-based and no upload required.'
    );
  }

  if (html !== original) {
    fs.writeFileSync(filePath, html);
    changed++;
    console.log(`[seo] Updated: ${relativePath}`);
  } else {
    console.log(`[seo] No change: ${relativePath}`);
  }
}

console.log(`[seo] Priority pages changed: ${changed}; missing: ${skipped}`);
