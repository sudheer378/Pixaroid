/**
 * Pixaroid — Internal Links
 * Runtime related/popular/category link helpers for current static pages.
 * No build-time generation or filesystem mutation is performed here.
 */
'use strict';

export const POPULAR_TOOLS = [
  { slug:'compress-image', category:'compression', title:'Compress Image', badge:'', color:'indigo' },
  { slug:'jpg-to-png', category:'conversion', title:'JPG to PNG', badge:'', color:'violet' },
  { slug:'background-remover', category:'ai-tools', title:'Background Remover', badge:'AI', color:'rose' },
  { slug:'resize-image', category:'resize', title:'Resize Image', badge:'', color:'emerald' },
  { slug:'webp-to-jpg', category:'conversion', title:'WebP to JPG', badge:'', color:'violet' },
  { slug:'image-upscaler', category:'ai-tools', title:'AI Upscaler', badge:'AI', color:'rose' },
  { slug:'heic-to-jpg', category:'conversion', title:'HEIC to JPG', badge:'', color:'violet' },
  { slug:'compress-image-to-20kb', category:'compression', title:'Compress to 20KB', badge:'', color:'indigo' },
  { slug:'youtube-thumbnail-maker', category:'social-tools', title:'YouTube Thumbnail', badge:'New', color:'sky' },
  { slug:'crop-image', category:'editor', title:'Crop Image', badge:'', color:'amber' },
  { slug:'image-to-text-ocr', category:'ai-tools', title:'Image to Text (OCR)', badge:'AI', color:'rose' },
  { slug:'resize-passport-photo', category:'resize', title:'Passport Photo Resizer', badge:'', color:'emerald' },
];

let _registryPromise = null;

async function _getRegistry() {
  if (_registryPromise) return _registryPromise;
  _registryPromise = import('/config/tools-config.js')
    .then(mod => {
      const tools = Array.isArray(mod.default) ? mod.default : [];
      return new Map(tools.filter(t => t?.slug).map(t => [t.slug, t]));
    })
    .catch(() => new Map(POPULAR_TOOLS.map(t => [t.slug, t])));
  return _registryPromise;
}

function _limit(value, fallback=5) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(20, Math.floor(n))) : fallback;
}

export async function getRelatedTools(slug, limit=5) {
  const reg = await _getRegistry();
  const tool = reg.get(slug);
  if (!tool) return [];

  const related = [];
  const seen = new Set([slug]);
  const max = _limit(limit);
  for (const relatedSlug of Array.isArray(tool.relatedTools) ? tool.relatedTools : []) {
    const item = reg.get(relatedSlug);
    if (item && !seen.has(item.slug)) {
      related.push(item);
      seen.add(item.slug);
      if (related.length >= max) return related;
    }
  }

  for (const [candidateSlug, item] of reg) {
    if (related.length >= max) break;
    if (!seen.has(candidateSlug) && item.category === tool.category) {
      related.push(item);
      seen.add(candidateSlug);
    }
  }
  return related;
}

export async function getSameCategory(slug, limit=5) {
  const reg = await _getRegistry();
  const tool = reg.get(slug);
  if (!tool) return [];
  const max = _limit(limit);
  return [...reg.values()].filter(t => t?.category === tool.category && t.slug !== slug).slice(0, max);
}

export async function getCategoryTools(category) {
  const reg = await _getRegistry();
  return [...reg.values()].filter(t => t?.category === category);
}

const CAT_COLORS = Object.freeze({
  compression:{ bg:'rgba(79,70,229,.1)', text:'#4F46E5' },
  conversion:{ bg:'rgba(139,92,246,.1)', text:'#8B5CF6' },
  resize:{ bg:'rgba(16,185,129,.1)', text:'#10B981' },
  editor:{ bg:'rgba(245,158,11,.1)', text:'#F59E0B' },
  'ai-tools':{ bg:'rgba(244,63,94,.1)', text:'#F43F5E' },
  'social-tools':{ bg:'rgba(14,165,233,.1)', text:'#0EA5E9' },
  utilities:{ bg:'rgba(6,182,212,.1)', text:'#06B6D4' },
  'bulk-tools':{ bg:'rgba(20,184,166,.1)', text:'#14B8A6' },
  'pdf-tools':{ bg:'rgba(124,58,237,.1)', text:'#7C3AED' },
});

const BADGE_STYLES = Object.freeze({
  AI:'background:rgba(244,63,94,.1);color:#F43F5E;',
  New:'background:rgba(6,182,212,.1);color:#06B6D4;',
  Hot:'background:rgba(245,158,11,.1);color:#F59E0B;',
});

function _colorFor(category) { return CAT_COLORS[category] ?? CAT_COLORS.compression; }
function _catLabel(cat) {
  return ({compression:'Compression', conversion:'Conversion', resize:'Resize', editor:'Editor', 'ai-tools':'AI', 'social-tools':'Social', utilities:'Utility', 'bulk-tools':'Bulk', 'pdf-tools':'PDF'})[cat] ?? String(cat ?? '');
}
function _safeText(value) { return String(value ?? ''); }
function _safeHref(category, slug) { return `/tools/${encodeURIComponent(String(category ?? ''))}/${encodeURIComponent(String(slug ?? ''))}/`; }

function _toolLinkItem(tool, showBadge=false) {
  const col = _colorFor(tool.category);
  const badge = showBadge && tool.badge ? `<span style="font-size:.65rem;font-weight:700;padding:.1rem .4rem;border-radius:999px;${BADGE_STYLES[tool.badge] ?? ''}">${_safeText(tool.badge)}</span>` : '';
  return `<li><a href="${_safeHref(tool.category, tool.slug)}" style="display:flex;align-items:center;gap:.5rem;padding:.5rem .625rem;border-radius:.625rem;font-size:.8125rem;color:var(--text);transition:background .15s,color .15s;text-decoration:none;"><span style="width:5px;height:5px;border-radius:50%;background:${col.text};flex-shrink:0"></span><span style="flex:1">${_safeText(tool.title)}</span>${badge}</a></li>`;
}

function _toolCard(tool, col) {
  return `<a href="${_safeHref(tool.category, tool.slug)}" style="display:block;padding:.75rem;border-radius:.75rem;border:1px solid var(--border);background:var(--bg);font-size:.8125rem;font-weight:500;color:var(--text);text-decoration:none;"><span style="display:block;width:28px;height:28px;border-radius:.5rem;margin-bottom:.5rem;background:${col.bg}"></span>${_safeText(tool.title)}</a>`;
}

export async function buildRelatedPanel(slug, container) {
  if (!container) return;
  const tools = await getRelatedTools(slug, 6);
  if (!tools.length) return;
  container.replaceChildren();
  const panel = document.createElement('div');
  panel.className = 'link-panel';
  panel.style.cssText = 'background:var(--surface);border:1px solid var(--border);border-radius:1rem;padding:1.25rem;';
  const title = document.createElement('div');
  title.className = 'link-panel-title';
  title.textContent = 'Related Tools';
  title.style.cssText = 'font-family:Poppins,sans-serif;font-weight:600;font-size:.9375rem;margin-bottom:.875rem;';
  const list = document.createElement('ul');
  list.style.cssText = 'list-style:none;display:flex;flex-direction:column;gap:.375rem;margin:0;padding:0;';
  list.innerHTML = tools.map(t => _toolLinkItem(t)).join('');
  panel.append(title, list);
  container.appendChild(panel);
}

export async function buildPopularPanel(container) {
  if (!container) return;
  const tools = POPULAR_TOOLS.slice(0, 8);
  container.replaceChildren();
  const panel = document.createElement('div');
  panel.className = 'link-panel';
  panel.style.cssText = 'background:var(--surface);border:1px solid var(--border);border-radius:1rem;padding:1.25rem;margin-top:1rem;';
  const title = document.createElement('div');
  title.textContent = 'Popular Tools';
  title.style.cssText = 'font-family:Poppins,sans-serif;font-weight:600;font-size:.9375rem;margin-bottom:.875rem;';
  const list = document.createElement('ul');
  list.style.cssText = 'list-style:none;display:flex;flex-direction:column;gap:.375rem;margin:0;padding:0;';
  list.innerHTML = tools.map(t => _toolLinkItem(t, true)).join('');
  const viewAll = document.createElement('a');
  viewAll.href = '/';
  viewAll.textContent = 'Explore all Pixaroid tools →';
  viewAll.style.cssText = 'display:block;margin-top:.875rem;text-align:center;font-size:.8125rem;color:#4F46E5;font-weight:600;';
  panel.append(title, list, viewAll);
  container.appendChild(panel);
}

export async function buildCategoryStrip(slug, container) {
  if (!container) return;
  const reg = await _getRegistry();
  const tool = reg.get(slug);
  if (!tool) return;
  const peers = await getSameCategory(slug, 5);
  if (!peers.length) return;
  const col = _colorFor(tool.category);
  const label = _catLabel(tool.category);
  container.replaceChildren();
  const panel = document.createElement('div');
  panel.style.cssText = 'background:var(--surface);border:1px solid var(--border);border-radius:1rem;padding:1.5rem;margin-top:1.5rem;';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem;';
  const heading = document.createElement('span');
  heading.textContent = `More ${label} Tools`;
  heading.style.cssText = 'font-family:Poppins,sans-serif;font-weight:600;font-size:.9375rem;';
  const all = document.createElement('a');
  all.href = `/tools/${encodeURIComponent(tool.category)}/`;
  all.textContent = `See all ${label} tools →`;
  all.style.cssText = `font-size:.8125rem;font-weight:600;color:${col.text};`;
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:.625rem;';
  grid.innerHTML = peers.map(t => _toolCard(t, col)).join('');
  head.append(heading, all); panel.append(head, grid); container.appendChild(panel);
}

export async function injectToolLinks(toolConfig) {
  if (!toolConfig?.slug || typeof document === 'undefined') return;
  try {
    const related = document.getElementById('related-tools-panel');
    const popular = document.getElementById('popular-tools-panel');
    const category = document.getElementById('category-strip');
    if (related) await buildRelatedPanel(toolConfig.slug, related);
    if (popular) await buildPopularPanel(popular);
    if (category) await buildCategoryStrip(toolConfig.slug, category);

    const staticList = document.getElementById('related-list');
    if (staticList) {
      const tools = await getRelatedTools(toolConfig.slug, 6);
      staticList.replaceChildren(...tools.map(t => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = _safeHref(t.category, t.slug);
        a.style.cssText = 'display:flex;align-items:center;gap:.5rem;padding:.5rem .625rem;border-radius:.5rem;font-size:.875rem;color:var(--text);';
        const dot = document.createElement('span');
        dot.style.cssText = 'width:6px;height:6px;border-radius:50%;background:#4F46E5;flex-shrink:0;opacity:.6;';
        a.append(dot, document.createTextNode(_safeText(t.title))); li.appendChild(a); return li;
      }));
    }
  } catch (err) {
    console.warn('[Pixaroid] internal links enhancement skipped:', err);
  }
}
