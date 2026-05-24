const fs = require('fs');
const path = require('path');

const TOOLS_DIR = path.join(__dirname, '..', 'tools');
const GUIDES_DIR = path.join(__dirname, '..', 'guides');
const OUTPUT_FILE = path.join(__dirname, '..', 'sitemap.xml');
const BASE_URL = 'https://pixaroid.vercel.app';

// Collect all tool URLs
const toolUrls = [];
const categories = fs.readdirSync(TOOLS_DIR);

categories.forEach(category => {
  const categoryPath = path.join(TOOLS_DIR, category);
  if (fs.statSync(categoryPath).isDirectory()) {
    // Add category index
    toolUrls.push(`${BASE_URL}/tools/${category}/`);
    
    // Add subcategory/tool indexes
    const items = fs.readdirSync(categoryPath);
    items.forEach(item => {
      const itemPath = path.join(categoryPath, item);
      if (fs.statSync(itemPath).isDirectory()) {
        const indexPath = path.join(itemPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          toolUrls.push(`${BASE_URL}/tools/${category}/${item}/`);
        }
      }
    });
  }
});

// Collect guide URLs
const guideUrls = [];
if (fs.existsSync(GUIDES_DIR)) {
  const guides = fs.readdirSync(GUIDES_DIR);
  guides.forEach(guide => {
    if (guide.endsWith('.html')) {
      guideUrls.push(`${BASE_URL}/guides/${guide}`);
    }
  });
}

// Generate sitemap
const staticUrls = [
  BASE_URL + '/',
  BASE_URL + '/about/',
  BASE_URL + '/contact/',
  BASE_URL + '/privacy/',
  BASE_URL + '/terms/',
  BASE_URL + '/guides/'
];

let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

// Add static URLs
staticUrls.forEach(url => {
  sitemap += `  <url>
    <loc>${url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
});

// Add tool URLs (higher priority)
toolUrls.forEach(url => {
  sitemap += `  <url>
    <loc>${url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
`;
});

// Add guide URLs
guideUrls.forEach(url => {
  sitemap += `  <url>
    <loc>${url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
});

sitemap += `</urlset>`;

fs.writeFileSync(OUTPUT_FILE, sitemap);
console.log(`✅ Sitemap generated with ${staticUrls.length + toolUrls.length + guideUrls.length} URLs`);
console.log(`   - Static pages: ${staticUrls.length}`);
console.log(`   - Tool pages: ${toolUrls.length}`);
console.log(`   - Guide pages: ${guideUrls.length}`);
