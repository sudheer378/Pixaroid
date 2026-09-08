#!/usr/bin/env node
/**
 * Answer Engine Optimization layer for Pixaroid tool pages.
 * Adds concise answer-first content and FAQPage JSON-LD without changing tool logic.
 */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const base = 'https://pixaroid.vercel.app';

const targets = [
  ['tools/compression/compress-image/', 'Compress Image', 'How do I compress an image?', 'Choose an image, adjust compression settings, preview the result, and save the compressed file. Pixaroid processes the image in your browser without requiring an upload.'],
  ['tools/compression/compress-jpg-to-15kb/', 'Compress JPG to 15KB', 'How do I compress a JPG to 15KB?', 'Open the tool, select your JPG, work toward the 15KB target, and check the resulting file size and visual quality before using it.'],
  ['tools/compression/compress-jpeg-to-500kb/', 'Compress JPEG to 500KB', 'How do I compress a JPEG to 500KB?', 'Select a JPEG and use the 500KB target. The exact result depends on the source image, so preview and verify the final file before submission.'],
  ['tools/resize/resize-image-for-chromebook/', 'Resize Image for Chromebook', 'What size should a Chromebook wallpaper be?', '1366×768 is a practical Chromebook wallpaper starting point, but the correct dimensions depend on the device model and display.'],
  ['tools/resize/resize-image-for-ipad-wallpaper/', 'Resize Image for iPad Wallpaper', 'How do I resize an image for an iPad wallpaper?', 'Choose dimensions that match the specific iPad model or display, then preview the image and save the resized copy.'],
  ['tools/resize/resize-image-for-id-card/', 'Resize Photo for ID Card', 'How do I resize a photo for an ID card?', 'Use the preset as a technical starting point, then verify the exact pixel, aspect-ratio, format, and file-size requirements of the issuing organization.'],
  ['tools/resize/resize-image-to-1200x800/', 'Resize Image to 1200×800', 'How do I resize an image to 1200×800?', 'Select the source image and set the output canvas to 1200×800 pixels. If the source ratio differs, choose whether to fit or crop it.'],
  ['tools/conversion/convert-avif-to-jpeg/', 'AVIF to JPEG Converter', 'How do I convert AVIF to JPEG?', 'Select an AVIF image and convert it to a JPEG copy in the browser, then check the output dimensions and visual quality.'],
  ['tools/conversion/svg-to-png/', 'SVG to PNG Converter', 'How do I convert SVG to PNG?', 'Select the SVG and choose the desired raster dimensions. The tool creates a PNG representation while the original SVG remains scalable vector content.'],
  ['tools/compression/compress-image-for-shopify/', 'Compress Images for Shopify', 'How should I optimize images for Shopify?', 'Reduce unnecessary image dimensions and file size, choose an appropriate format, and preview the result before adding it to your store. Verify your theme and storefront requirements separately.']
];

function esc(s) { return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }
function process([dir, name, question, answer]) {
  const file = path.join(root, dir, 'index.html');
  if (!fs.existsSync(file)) return false;
  const original = fs.readFileSync(file, 'utf8');
  let html = original;
  html = html.replace(/\s*<section data-seo-aeo="true">[\s\S]*?<\/section>\s*/gi, '\n');
  const section = `\n<section data-seo-aeo="true" aria-labelledby="aeo-answer"><h2 id="aeo-answer">${esc(question)}</h2><p><strong>Answer:</strong> ${esc(answer)}</p><h3>How it works</h3><ol><li>Select your source file.</li><li>Choose the required settings or target.</li><li>Preview the result and verify the output.</li><li>Save the processed file.</li></ol></section>\n`;
  const pos = html.toLowerCase().lastIndexOf('</main>');
  const body = html.toLowerCase().lastIndexOf('</body>');
  const at = pos >= 0 ? pos : body;
  if (at < 0) return false;
  html = html.slice(0, at) + section + html.slice(at);
  const faq = { '@context':'https://schema.org', '@type':'FAQPage', 'mainEntity':[{ '@type':'Question', name:question, acceptedAnswer:{ '@type':'Answer', text:answer } }] };
  html = html.replace(/\s*<script type=["']application\/ld\+json["'] data-aeo-faq=["']true["']>[\s\S]*?<\/script>\s*/gi, '\n');
  html = html.replace(/<\/head>/i, `\n<script type="application/ld+json" data-aeo-faq="true">${JSON.stringify(faq)}</script>\n</head>`);
  if (html !== original) { fs.writeFileSync(file, html); return true; }
  return false;
}
let changed = 0;
for (const target of targets) if (process(target)) changed++;
console.log(`[aeo] Updated ${changed}/${targets.length} priority pages.`);
