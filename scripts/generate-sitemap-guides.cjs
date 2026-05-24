const fs = require('fs');
const path = require('path');

const GUIDES_DIR = path.join(__dirname, '..', 'guides');
const OUTPUT_FILE = path.join(__dirname, '..', 'sitemap-guides.xml');
const BASE_URL = 'https://pixaroid.vercel.app';

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

// Add guides index
guideUrls.push(`${BASE_URL}/guides/`);

let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

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
console.log(`✅ Guides sitemap generated with ${guideUrls.length} URLs`);
