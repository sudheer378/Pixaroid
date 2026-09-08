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

for (const [label, category] of Object.entries(CATEGORY_MAP)) {
  const escaped = label.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
  const pattern = new RegExp(`<a\\b([^>]*?)href=["'][^"']*["']([^>]*)>\\s*${escaped}\\s*</a>`, 'i');
  html = html.replace(pattern, `<button type="button" class="na nav-category-filter" data-category="${category}" aria-label="Show ${label} tools">${label}</button>`);
}

const STYLE_MARKER = '/* PIXAROID CATEGORY NAV FIX */';
const SCRIPT_MARKER = '/* PIXAROID CATEGORY NAV BEHAVIOR */';

if (!html.includes(STYLE_MARKER)) {
  html = html.replace('</style>', `${STYLE_MARKER}\n.nl .nav-category-filter{appearance:none;-webkit-appearance:none;border:0;background:transparent;color:var(--mute);font:inherit}\n.nl .nav-category-filter:hover{color:var(--txt);background:rgba(255,255,255,.06)}\n.nl .nav-category-filter:focus-visible{outline:2px solid var(--v2);outline-offset:2px}\n</style>`);
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
fs.writeFileSync(INDEX, html, 'utf8');
console.log('✓ Upper category navigation converted to in-page filters');
console.log(`✓ index.html size: ${finalBytes} bytes`);
