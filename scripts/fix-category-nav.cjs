#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const INDEX = path.join(ROOT, 'index.html');
const MIN_BYTES = 50000;

const CATEGORY_MAP = {
  International: 'international',
  PDF: 'pdf-tools',
  Compress: 'compression',
  Convert: 'conversion',
  'AI Tools': 'ai-tools'
};

if (!fs.existsSync(INDEX)) throw new Error('index.html not found');
let html = fs.readFileSync(INDEX, 'utf8');
if (Buffer.byteLength(html, 'utf8') < MIN_BYTES) {
  throw new Error(`Refusing to modify suspiciously small index.html (${Buffer.byteLength(html, 'utf8')} bytes)`);
}

// Sitemap remains available to crawlers at /sitemap.xml, but it is not a
// visitor-facing homepage navigation item.
html = html.replace(/\s*<a\b[^>]*href=["'][^"']*\/sitemap\.xml[^"']*["'][^>]*>\s*Sitemap\s*<\/a>\s*/gi, '');

for (const [label, category] of Object.entries(CATEGORY_MAP)) {
  const escaped = label.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
  const pattern = new RegExp(`<a\\b([^>]*?)href=["'][^"']*["']([^>]*)>\\s*${escaped}\\s*</a>`, 'i');
  html = html.replace(pattern, `<button type="button" class="na nav-category-filter" data-category="${category}" aria-label="Show ${label} tools">${label}</button>`);
}

const STYLE_MARKER = '/* PIXAROID CATEGORY NAV FIX */';
const SCRIPT_MARKER = '/* PIXAROID CATEGORY NAV BEHAVIOR */';

if (!html.includes(STYLE_MARKER)) {
  html = html.replace('</style>', `${STYLE_MARKER}\n.nl .nav-category-filter{appearance:none;-webkit-appearance:none;border:0;background:transparent;color:var(--mute);font:inherit}\n.nl .nav-category-filter:hover{color:var(--txt);background:rgba(255,255,255,.06)}\n.nl .nav-category-filter:focus-visible{outline:2px solid var(--v2);outline-offset:2px}\n[data-seo-priority-links="true"]{margin:2rem 0 3rem;padding:1.5rem;border:1px solid var(--rim2);border-radius:16px;background:rgba(13,11,30,.72)}\n[data-seo-priority-links="true"] h2{margin:0 0 1rem;font-size:1rem}\n[data-seo-priority-links="true"] nav{display:flex;flex-wrap:wrap;gap:.55rem .7rem;align-items:center}\n[data-seo-priority-links="true"] nav a{display:inline-flex;align-items:center;padding:.45rem .75rem;border:1px solid var(--rim2);border-radius:9px;background:var(--glass2);color:var(--mute);font-size:.8rem;font-weight:600;line-height:1.35;white-space:normal;transition:color .18s,background .18s,border-color .18s}\n[data-seo-priority-links="true"] nav a:hover{color:var(--txt);background:rgba(123,111,255,.08);border-color:rgba(123,111,255,.35)}\n@media(max-width:640px){[data-seo-priority-links="true"]{padding:1rem;margin:1.5rem 0 2rem}[data-seo-priority-links="true"] nav{gap:.5rem}[data-seo-priority-links="true"] nav a{font-size:.76rem;padding:.4rem .6rem}}\n</style>`);
}

if (!html.includes(SCRIPT_MARKER)) {
  const script = `<script>\n${SCRIPT_MARKER}\n(function(){\n  function activateCategory(category){\n    var tab=document.querySelector('#cat-tabs .tab[data-cat="'+category+'"]');\n    if(!tab){return;}\n    tab.click();\n    var tabs=document.querySelector('.tabs-wrap');\n    if(tabs){tabs.scrollIntoView({behavior:'smooth',block:'start'});}\n    if(history.replaceState){history.replaceState(null,'','#'+category);}\n  }\n  document.addEventListener('click',function(e){\n    var button=e.target.closest('.nav-category-filter');\n    if(!button)return;\n    e.preventDefault();\n    activateCategory(button.getAttribute('data-category'));\n  });\n  window.addEventListener('DOMContentLoaded',function(){\n    var hash=location.hash.slice(1);\n    if(hash && document.querySelector('#cat-tabs .tab[data-cat="'+hash+'"]')) activateCategory(hash);\n  });\n})();\n</script>`;
  html = html.replace('</body>', `${script}\n</body>`);
}

const finalBytes = Buffer.byteLength(html, 'utf8');
if (finalBytes < MIN_BYTES) throw new Error('Post-fix index.html safety check failed');
if (!html.includes('class="na nav-category-filter" data-category="international"')) {
  throw new Error('Category navigation verification failed');
}
if (/href=["'][^"']*\/sitemap\.xml[^"']*["'][^>]*>\s*Sitemap\s*<\/a>/i.test(html)) {
  throw new Error('Homepage sitemap link removal verification failed');
}
if (!html.includes('[data-seo-priority-links="true"] nav{display:flex')) {
  throw new Error('Homepage bottom-link layout verification failed');
}
fs.writeFileSync(INDEX, html, 'utf8');
console.log('✓ Upper category navigation converted to in-page filters');
console.log('✓ Homepage Sitemap navigation link removed');
console.log('✓ Popular tools links now wrap with spacing and responsive cards');
console.log(`✓ index.html size: ${finalBytes} bytes`);
