const fs = require('fs');
const path = require('path');

const TOOLS_DIR = path.join(__dirname, '..', 'tools');
const OUTPUT_FILE = path.join(__dirname, '..', 'sitemap-tools.xml');
const BASE_URL = 'https://pixaroid.vercel.app';

function getAllToolFiles(dir) {
  const files = [];
  
  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name === 'index.html') {
        const relativePath = path.relative(path.join(__dirname, '..'), fullPath);
        const urlPath = '/' + relativePath.replace(/\\/g, '/').replace('/index.html', '/');
        files.push(urlPath);
      }
    }
  }
  
  walk(TOOLS_DIR);
  return files;
}

function generateSitemap(files) {
  const today = new Date().toISOString().split('T')[0];
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  
  for (const file of files) {
    xml += `  <url>\n`;
    xml += `    <loc>${BASE_URL}${file}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  }
  
  xml += `</urlset>`;
  return xml;
}

try {
  console.log('Scanning tools directory...');
  const toolFiles = getAllToolFiles(TOOLS_DIR);
  console.log(`Found ${toolFiles.length} tool pages`);
  
  console.log('Generating sitemap-tools.xml...');
  const sitemap = generateSitemap(toolFiles);
  
  fs.writeFileSync(OUTPUT_FILE, sitemap, 'utf8');
  console.log(`✓ Sitemap generated: ${OUTPUT_FILE}`);
  console.log(`✓ Total URLs: ${toolFiles.length}`);
} catch (error) {
  console.error('Error generating sitemap:', error.message);
  process.exit(1);
}
