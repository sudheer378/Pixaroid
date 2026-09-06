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

const GROUPS = [
  { match: /\/tools\/compression\//, title: 'Popular Image Compression Tools', paths: PRIORITY.slice(0, 3) },
  { match: /\/tools\/conversion\//, title: 'Popular Image Conversion Tools', paths: PRIORITY.slice(3, 8) },
  { match: /\/tools\/resize\//, title: 'Popular Image Resize Tools', paths: PRIORITY.slice(8, 10) },
  { match: /\/tools\/ai-tools\//, title: 'Popular AI Image Tools', paths: PRIORITY.slice(10, 13) },
  { match: /\/tools\/pdf-tools\//, title: 'Popular PDF Tools', paths: PRIORITY.slice(13, 16) }
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
  return rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel;
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
  if (html.includes('data-seo-priority-links="true"')) continue;

  const group = GROUPS.find(g => g.match.test(url));
  const block = group ? makeBlock(group) : makeBlock({ title: 'Popular Pixaroid Tools', paths: PRIORITY });
  const marker = '</main>';
  const insertAt = html.indexOf(marker);
  if (insertAt === -1) continue;

  html = html.slice(0, insertAt) + block + html.slice(insertAt);
  fs.writeFileSync(file, html);
  changed++;
}

console.log(`SEO Job 3: added priority internal-link blocks to ${changed} HTML pages.`);
