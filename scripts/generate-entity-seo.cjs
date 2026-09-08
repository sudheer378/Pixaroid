#!/usr/bin/env node
/**
 * Entity + Knowledge Graph SEO layer for Pixaroid.
 * Adds stable entity relationships and WebApplication metadata to priority tool pages.
 */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const base = 'https://pixaroid.vercel.app';
const orgId = `${base}/#organization`;
const siteId = `${base}/#website`;

const categories = {
  compression: 'Image Compression Tools',
  conversion: 'Image Conversion Tools',
  resize: 'Image Resize Tools',
  'ai-tools': 'AI Image Tools',
  editor: 'Image Editing Tools',
  'pdf-tools': 'PDF Tools',
  international: 'International Image & Utility Tools'
};

function esc(s) { return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }
function titleOf(html) { const m = html.match(/<title>([^<]+)<\/title>/i); return m ? m[1].trim() : 'Pixaroid Tool'; }
function descOf(html) { const m = html.match(/<meta\s+name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i); return m ? m[1].trim() : ''; }
function process(file) {
  const rel = path.relative(root, file).replaceAll(path.sep, '/');
  const parts = rel.split('/');
  if (parts[0] !== 'tools' || parts.at(-1) !== 'index.html') return false;
  const category = parts[1];
  const slug = parts.at(-2);
  const name = titleOf(fs.readFileSync(file, 'utf8')).replace(/\s*[—|]\s*Pixaroid.*$/i, '').trim() || slug;
  let html = fs.readFileSync(file, 'utf8');
  const description = descOf(html);
  const url = `${base}/${rel.replace(/index\.html$/, '')}`;
  const entity = {
    '@context':'https://schema.org',
    '@type':'WebApplication',
    '@id':`${url}#application`,
    name,
    url,
    description,
    applicationCategory: categories[category] || 'Online Utility',
    operatingSystem:'Web Browser',
    isAccessibleForFree:true,
    publisher:{'@id':orgId},
    isPartOf:{'@id':siteId},
    about:{'@type':'Thing', name: categories[category] || 'Online Utility'},
    potentialAction:{'@type':'UseAction', target:url}
  };
  html = html.replace(/\s*<script type=["']application\/ld\+json["'] data-entity-seo=["']true["']>[\s\S]*?<\/script>\s*/gi, '\n');
  html = html.replace(/<\/head>/i, `\n<script type="application/ld+json" data-entity-seo="true">${JSON.stringify(entity)}</script>\n</head>`);
  if (html !== fs.readFileSync(file, 'utf8')) { fs.writeFileSync(file, html); return true; }
  return false;
}
function walk(dir, out=[]) { for (const entry of fs.readdirSync(dir,{withFileTypes:true})) { if (entry.name.startsWith('.')) continue; const p=path.join(dir,entry.name); if(entry.isDirectory()) walk(p,out); else if(entry.name==='index.html') out.push(p); } return out; }
let changed=0; for(const file of walk(path.join(root,'tools'))) if(process(file)) changed++;
console.log(`[entity-seo] Updated ${changed} tool pages.`);
