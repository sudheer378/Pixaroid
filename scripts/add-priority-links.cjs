const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

const PRIORITY = [
  ['/tools/compression/compress-image/', 'Compress Image'],
  ['/tools/compression/compress-image-to-100kb/', 'Compress Image to 100KB'],
  ['/tools/compression/compress-image-to-200kb/', 'Compress Image to 200KB'],
  ['/tools/conversion/jpg-to-png/', 'JPG to PNG'],
  ['/tools/conversion/png-to-jpg/', 'PNG to JPG'],
  ['/tools/conversion/jpg-to-webp/', 'JPG to WebP'],
  ['/tools/conversion/webp-to-jpg/', 'WebP to JPG'],
  ['/tools/conversion/heic-to-jpg/', 'HEIC to JPG'],
  ['/tools/resize/resize-image/', 'Resize Image'],
  ['/tools/resize/resize-image-by-pixels/', 'Resize Image by Pixels'],
  ['/tools/ai-tools/background-remover/', 'Background Remover'],
  ['/tools/ai-tools/image-upscaler/', 'Image Upscaler'],
  ['/tools/ai-tools/image-to-text-ocr/', 'Image to Text OCR'],
  ['/tools/pdf-tools/compress-pdf/', 'Compress PDF'],
  ['/tools/pdf-tools/jpg-to-pdf/', 'JPG to PDF'],
  ['/tools/pdf-tools/pdf-to-jpg/', 'PDF to JPG']
];

const INTERNATIONAL = [
  ['/tools/international/currency-converter/', 'Currency Converter'],
  ['/tools/international/timezone-planner/', 'Timezone Planner'],
  ['/tools/international/text-translator/', 'Text Translator'],
  ['/tools/international/phone-code-finder/', 'Phone Code Finder'],
  ['/tools/international/unit-converter/', 'Unit Converter'],
  ['/tools/international/holiday-calendar/', 'Holiday Calendar'],
  ['/tools/international/passport-photo-resizer/', 'Passport Photo Resizer'],
  ['/tools/international/vat-calculator/', 'VAT Calculator'],
  ['/tools/international/paper-size-converter/', 'Paper Size Converter'],
  ['/tools/international/script-detector/', 'Script Detector'],
  ['/tools/international/address-formatter/', 'Address Formatter'],
  ['/tools/international/packing-list-generator/', 'Packing List Generator']
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith('.html') ? [full] : [];
  });
}
function relativeUrl(file) {
  const rel = '/' + path.relative(ROOT, file).replace(/\\/g, '/');
  if (rel.endsWith('/index.html')) return rel.slice(0, -'index.html'.length);
  return rel;
}
function makeBlock(group) {
  const links = group.paths.map(([href, label]) => `<a href="${href}">${label}</a>`).join('');
  return `\n<section data-seo-priority-links="true" aria-labelledby="seo-priority-links-title"><h2 id="seo-priority-links-title">${group.title}</h2><nav aria-label="${group.title}">${links}</nav></section>\n`;
}
const files = [path.join(ROOT, 'index.html'), ...walk(path.join(ROOT, 'tools'))];
let changed = 0;
for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let html = fs.readFileSync(file, 'utf8');
  const url = relativeUrl(file);
  html = html.replace(/\s*<section data-seo-priority-links="true"[\s\S]*?<\/section>\s*/gi, '\n');
  const group = GROUPS.find(g => g.match.test(url));
  const block = group ? makeBlock(group) : makeBlock({ title: 'Popular Pixaroid Tools', paths: PRIORITY });
  const mainIndex = html.toLowerCase().lastIndexOf('</main>');
  const bodyIndex = html.toLowerCase().lastIndexOf('</body>');
  const insertAt = mainIndex >= 0 ? mainIndex : bodyIndex;
  if (insertAt === -1) continue;
  html = html.slice(0, insertAt) + block + html.slice(insertAt);
  fs.writeFileSync(file, html);
  changed++;
}
console.log(`SEO Job 3: added/updated contextual internal-link blocks on ${changed} HTML pages.`);

const GROUPS = [
  { match: /\/tools\/compression\//, title: 'Popular Image Compression Tools', paths: PRIORITY.slice(0, 3) },
  { match: /\/tools\/conversion\//, title: 'Popular Image Conversion Tools', paths: PRIORITY.slice(3, 8) },
  { match: /\/tools\/resize\//, title: 'Popular Image Resize Tools', paths: PRIORITY.slice(8, 10) },
  { match: /\/tools\/ai-tools\//, title: 'Popular AI Image Tools', paths: PRIORITY.slice(10, 13) },
  { match: /\/tools\/pdf-tools\//, title: 'Popular PDF Tools', paths: PRIORITY.slice(13, 16) },
  { match: /\/tools\/international\//, title: 'International & Travel Tools', paths: INTERNATIONAL }
];
