#!/usr/bin/env node
/**
 * Build a scalable semantic internal-link network for Pixaroid tools.
 * Groups tools by intent/category and adds contextual related-tool links.
 */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const base = 'https://pixaroid.vercel.app';

const clusters = {
  compression: [
    ['compress-image', 'Compress Image'],
    ['compress-image-to-100kb', 'Compress Image to 100KB'],
    ['compress-image-to-200kb', 'Compress Image to 200KB'],
    ['compress-image-to-250kb', 'Compress Image to 250KB'],
    ['compress-jpg-to-15kb', 'Compress JPG to 15KB'],
    ['compress-jpg-to-30kb', 'Compress JPG to 30KB'],
    ['compress-jpeg-to-35kb', 'Compress JPEG to 35KB'],
    ['compress-jpeg-to-250kb', 'Compress JPEG to 250KB'],
    ['compress-jpeg-to-500kb', 'Compress JPEG to 500KB'],
    ['compress-webp-to-25kb', 'Compress WebP to 25KB'],
    ['compress-webp-to-100kb', 'Compress WebP to 100KB'],
    ['compress-webp-to-250kb', 'Compress WebP to 250KB'],
    ['compress-webp-to-500kb', 'Compress WebP to 500KB'],
    ['compress-image-without-losing-quality', 'Compress Image While Preserving Quality'],
    ['compress-image-for-shopify', 'Compress Images for Shopify']
  ],
  resize: [
    ['resize-image', 'Resize Image'],
    ['resize-image-by-pixels', 'Resize Image by Pixels'],
    ['resize-image-to-1200x800', 'Resize Image to 1200×800'],
    ['resize-image-for-chromebook', 'Chromebook Wallpaper'],
    ['resize-image-for-ipad-wallpaper', 'iPad Wallpaper'],
    ['resize-image-for-macbook-wallpaper', 'MacBook Wallpaper'],
    ['resize-image-for-desktop-wallpaper', 'Desktop Wallpaper'],
    ['resize-image-for-id-card', 'ID Card Photo'],
    ['passport-photo', 'Passport Photo']
  ],
  conversion: [
    ['jpg-to-png', 'JPG to PNG'],
    ['png-to-jpg', 'PNG to JPG'],
    ['jpg-to-webp', 'JPG to WebP'],
    ['webp-to-jpg', 'WebP to JPG'],
    ['heic-to-jpg', 'HEIC to JPG'],
    ['convert-avif-to-jpeg', 'AVIF to JPEG'],
    ['svg-to-png', 'SVG to PNG'],
    ['tiff-to-gif', 'TIFF to GIF']
  ]
};

function esc(s) { return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }
function toolFile(cluster, slug) { return path.join(root, 'tools', cluster, slug, 'index.html'); }
function addSection(html, cluster, current) {
  const items = (clusters[cluster] || []).filter(([slug]) => slug !== current).filter(([slug]) => fs.existsSync(toolFile(cluster, slug))).slice(0, 6);
  if (!items.length) return html;
  const links = items.map(([slug, label]) => `<li><a href="/tools/${cluster}/${slug}/">${esc(label)}</a></li>`).join('');
  const section = `\n<section data-semantic-network="true" aria-labelledby="related-tools-heading"><h2 id="related-tools-heading">Related ${esc(cluster)} tools</h2><p>Explore related Pixaroid tools for the same workflow and choose the format, size or task that matches your needs.</p><ul>${links}</ul></section>\n`;
  const pos = html.toLowerCase().lastIndexOf('</main>');
  const body = html.toLowerCase().lastIndexOf('</body>');
  const at = pos >= 0 ? pos : body;
  return at < 0 ? html : html.slice(0, at) + section + html.slice(at);
}
function walk(dir, out=[]) { for (const e of fs.readdirSync(dir,{withFileTypes:true})) { if(e.name.startsWith('.')) continue; const p=path.join(dir,e.name); if(e.isDirectory()) walk(p,out); else if(e.name==='index.html') out.push(p); } return out; }
let changed=0;
for (const file of walk(path.join(root,'tools'))) {
  const rel=path.relative(path.join(root,'tools'),file).replaceAll(path.sep,'/');
  const parts=rel.split('/'); if(parts.length!==3 || parts[2]!=='index.html') continue;
  const cluster=parts[0], current=parts[1]; if(!clusters[cluster]) continue;
  const original=fs.readFileSync(file,'utf8');
  let html=original.replace(/\s*<section data-semantic-network="true">[\s\S]*?<\/section>\s*/gi,'\n');
  html=addSection(html,cluster,current);
  if(html!==original){fs.writeFileSync(file,html);changed++;}
}
console.log(`[semantic-network] Updated ${changed} tool pages.`);
