const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const TOOLS_DIR = path.join(ROOT_DIR, 'tools');
const OUTPUT_FILE = path.join(ROOT_DIR, 'sitemap-tools.xml');
const BASE_URL = 'https://pixaroid.vercel.app';

function normalizeUrl(value) {
  return value
    .trim()
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/\.html$/i, '')
    .replace(/\/$/, '') + '/';
}

function getAllToolUrls(dir) {
  const urls = [];
  let excludedNoindex = 0;
  let excludedCanonical = 0;

  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!entry.isFile() || !entry.name.endsWith('.html')) continue;

      const relativePath = path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/');
      // Index pages use clean trailing-slash URLs; legacy/static .html tools keep
      // their real filename so the sitemap points at the deployed resource.
      const urlPath = relativePath.endsWith('/index.html')
        ? '/' + relativePath.slice(0, -'index.html'.length)
        : '/' + relativePath;

      const html = fs.readFileSync(fullPath, 'utf8');
      const robotsMatch = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["'][^>]*>/i)
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']robots["'][^>]*>/i);
      const robotsContent = robotsMatch?.[1]?.toLowerCase() || '';

      // Sitemap only indexable URLs. noindex pages should never be advertised here.
      if (/\bnoindex\b/.test(robotsContent)) {
        excludedNoindex += 1;
        continue;
      }

      const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i)
        || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i);
      const canonical = canonicalMatch?.[1];

      // If a page explicitly declares another canonical URL, advertise only the canonical.
      if (canonical && normalizeUrl(canonical) !== normalizeUrl(`${BASE_URL}${urlPath}`)) {
        excludedCanonical += 1;
        continue;
      }

      urls.push(urlPath);
    }
  }

  walk(dir);
  return {
    urls: [...new Set(urls)].sort(),
    excludedNoindex,
    excludedCanonical,
  };
}

function generateSitemap(urls) {
  const today = new Date().toISOString().split('T')[0];
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const urlPath of urls) {
    xml += '  <url>\n';
    xml += `    <loc>${BASE_URL}${urlPath}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>0.8</priority>\n';
    xml += '  </url>\n';
  }

  xml += '</urlset>\n';
  return xml;
}

try {
  console.log('Scanning tools directory for indexable HTML tool pages...');
  const result = getAllToolUrls(TOOLS_DIR);
  console.log(`Found ${result.urls.length} indexable tool pages`);
  console.log(`Excluded ${result.excludedNoindex} noindex pages`);
  console.log(`Excluded ${result.excludedCanonical} non-canonical pages`);

  fs.writeFileSync(OUTPUT_FILE, generateSitemap(result.urls), 'utf8');
  console.log(`✓ Sitemap generated: ${OUTPUT_FILE}`);
  console.log(`✓ Total URLs: ${result.urls.length}`);
} catch (error) {
  console.error('Error generating sitemap:', error.message);
  process.exit(1);
}
