const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const INTERNATIONAL_DIR = path.join(ROOT_DIR, 'tools', 'international');
const BASE_URL = 'https://pixaroid.vercel.app';

function normalizeInternationalFile(filePath) {
  const filename = path.basename(filePath, '.html');
  const canonicalUrl = `${BASE_URL}/tools/international/${filename}/`;
  let html = fs.readFileSync(filePath, 'utf8');
  const before = html;

  html = html.replace(
    /(<link[^>]+rel=["']canonical["'][^>]+href=["'])https:\/\/pixaroid\.vercel\.app\/tools\/international\/[^"']+\.html(["'][^>]*>)/i,
    `$1${canonicalUrl}$2`
  );
  html = html.replace(
    /(<link[^>]+href=["'])https:\/\/pixaroid\.vercel\.app\/tools\/international\/[^"']+\.html(["'][^>]+rel=["']canonical["'][^>]*>)/i,
    `$1${canonicalUrl}$2`
  );

  html = html.replace(
    /https:\/\/pixaroid\.vercel\.app\/tools\/international\/([^"'<>\s]+)\.html/g,
    (match, slug) => `${BASE_URL}/tools/international/${slug}/`
  );

  html = html.replace(
    /<meta([^>]+name=["']robots["'][^>]+content=["'])([^"']+)(["'][^>]*)>/i,
    (match, prefix, content, suffix) => {
      const normalized = content.replace(/noindex/gi, 'index').replace(/nofollow/gi, 'follow');
      return `<meta${prefix}${normalized}${suffix}>`;
    }
  );

  if (html !== before) {
    fs.writeFileSync(filePath, html, 'utf8');
    return true;
  }
  return false;
}

try {
  if (!fs.existsSync(INTERNATIONAL_DIR)) {
    throw new Error(`Missing directory: ${INTERNATIONAL_DIR}`);
  }

  let changed = 0;
  for (const entry of fs.readdirSync(INTERNATIONAL_DIR, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.html') || entry.name === 'index.html') continue;
    if (normalizeInternationalFile(path.join(INTERNATIONAL_DIR, entry.name))) changed += 1;
  }

  console.log(`✓ Normalized ${changed} International tool SEO pages`);
} catch (error) {
  console.error('Error normalizing International SEO:', error.message);
  process.exit(1);
}
