#!/usr/bin/env node
/**
 * SEO safety pass for generated tool pages.
 * Runs during the Vercel build before static output is served.
 *
 * Goals:
 * - Remove unsupported/fabricated AggregateRating structured data.
 * - Remove obsolete meta keywords from priority pages.
 * - Fix duplicated AI breadcrumb labels.
 * - Ensure SoftwareApplication Organization provider schema contains a logo.
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
let schemaFixed = 0;

function removeAggregateRating(html) {
  return html.replace(
    /\n\s*"aggregateRating"\s*:\s*\{\s*"@type"\s*:\s*"AggregateRating"\s*,[\s\S]*?\n\s*\},(?=\s*"featureList")/g,
    ''
  );
}

function ensureOrganizationLogo(html) {
  let output = html;

  // Handles minified generated JSON-LD.
  output = output.replace(
    /("provider"\s*:\s*\{\s*"@type"\s*:\s*"Organization"\s*,\s*"name"\s*:\s*"Pixaroid"\s*,\s*"url"\s*:\s*"https:\/\/pixaroid\.vercel\.app")(?=\s*\})/g,
    '$1,"logo":"https://pixaroid.vercel.app/assets/svg/logo.svg"'
  );

  // Handles pretty-printed generated JSON-LD where provider has no logo.
  output = output.replace(
    /("provider"\s*:\s*\{\s*\n\s*"@type"\s*:\s*"Organization"\s*,\s*\n\s*"name"\s*:\s*"Pixaroid"\s*,\s*\n\s*"url"\s*:\s*"https:\/\/pixaroid\.vercel\.app"\s*\n\s*\})/g,
    '$1'.replace(/\n\s*\}/, '\n      "logo": "https://pixaroid.vercel.app/assets/svg/logo.svg"\n    }')
  );

  return output;
}

function processFile(filePath, relativePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  let html = original;

  html = removeAggregateRating(html);
  html = html.replace(/\n<meta name="keywords" content="[^"]*"\/>/g, '');
  html = html.replace(/"name": "AI Tools Tools"/g, '"name": "AI Tools"');
  html = ensureOrganizationLogo(html);

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
  }

  if (html !== original) {
    fs.writeFileSync(filePath, html);
    changed++;
    if (html !== ensureOrganizationLogo(original)) schemaFixed++;
    console.log(`[seo] Updated: ${relativePath}`);
  }
}

// Fix the priority pages first.
for (const relativePath of priorityPages) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    skipped++;
    console.warn(`[seo] Missing: ${relativePath}`);
    continue;
  }
  processFile(filePath, relativePath);
}

// The template/build system historically stamped many tool pages with an
// Organization provider that omitted logo. Normalize every static tool page
// so existing pages are fixed as well as future priority pages.
const toolsRoot = path.join(root, 'tools');
if (fs.existsSync(toolsRoot)) {
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name === 'index.html') {
        const rel = path.relative(root, full).replace(/\\/g, '/');
        const original = fs.readFileSync(full, 'utf8');
        const normalized = ensureOrganizationLogo(original);
        if (normalized !== original) {
          fs.writeFileSync(full, normalized);
          changed++;
          schemaFixed++;
          console.log(`[seo] Added Organization logo: ${rel}`);
        }
      }
    }
  }
  walk(toolsRoot);
}

console.log(`[seo] Tool pages changed: ${changed}; Organization schemas fixed: ${schemaFixed}; missing priority pages: ${skipped}`);
