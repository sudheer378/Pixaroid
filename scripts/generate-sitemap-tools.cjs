const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const TOOLS_DIR = path.join(ROOT_DIR, 'tools');
const OUTPUT_FILE = path.join(ROOT_DIR, 'sitemap-tools.xml');
const BASE_URL = 'https://pixaroid.vercel.app';

function getAllToolUrls(dir) {
  const urls = [];

  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        const relativePath = path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/');
        // Index pages use clean trailing-slash URLs; legacy/static .html tools keep
        // their real filename so the sitemap points at the deployed resource.
        const urlPath = relativePath.endsWith('/index.html')
          ? '/' + relativePath.slice(0, -'index.html'.length)
          : '/' + relativePath;
        urls.push(urlPath);
      }
    }
  }

  walk(dir);
  return [...new Set(urls)].sort();
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
  console.log('Scanning tools directory for HTML tool pages...');
  const toolUrls = getAllToolUrls(TOOLS_DIR);
  console.log(`Found ${toolUrls.length} tool pages`);

  fs.writeFileSync(OUTPUT_FILE, generateSitemap(toolUrls), 'utf8');
  console.log(`✓ Sitemap generated: ${OUTPUT_FILE}`);
  console.log(`✓ Total URLs: ${toolUrls.length}`);
} catch (error) {
  console.error('Error generating sitemap:', error.message);
  process.exit(1);
}
