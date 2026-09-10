/**
 * Pixaroid — Performance Module
 * Lazy loading, resource hints, image optimisation, prefetching and
 * compatibility code-splitting helpers for legacy/current static pages.
 *
 * The old js/chunks/* files were duplicate re-export wrappers around
 * /js/engine.js. Chunk loading is now virtual: callers keep the same
 * loadToolChunk(interfaceType) API, but it resolves to the canonical engine
 * module instead of downloading duplicate wrapper files.
 */
'use strict';

const _lazyObserver = typeof IntersectionObserver !== 'undefined'
  ? new IntersectionObserver(_onIntersect, { rootMargin: '200px 0px', threshold: 0.01 })
  : null;

function _onIntersect(entries) {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    _lazyObserver?.unobserve(el);

    if (el.dataset.src) {
      el.src = el.dataset.src;
      el.removeAttribute('data-src');
      el.decoding = 'async';
    }
    if (el.dataset.load === 'panel') el.dispatchEvent(new CustomEvent('pxn:load-panel'));
    el.classList.remove('pxn-lazy');
    el.classList.add('pxn-loaded');
  });
}

export function initLazyLoading() {
  if (!_lazyObserver) {
    document.querySelectorAll('[data-src]').forEach(el => { el.src = el.dataset.src; });
    return;
  }
  document.querySelectorAll('[data-src], [data-load="panel"]').forEach(el => _lazyObserver.observe(el));
}

export function lazyObserve(el) {
  if (_lazyObserver && el) _lazyObserver.observe(el);
}

export function applyLazyImages(root = document) {
  root.querySelectorAll('img:not([loading])').forEach(img => {
    img.loading = 'lazy';
    img.decoding = 'async';
    if (!img.width && img.naturalWidth) img.width = img.naturalWidth;
    if (!img.height && img.naturalHeight) img.height = img.naturalHeight;
  });
}

/*
 * Compatibility code-splitting API.
 *
 * Historically this map imported seven tiny wrapper modules from /js/chunks/.
 * Each wrapper re-exported the same functions from /js/engine.js, providing no
 * actual code-splitting value. Keep interfaceType routing for legacy callers,
 * but resolve everything to one canonical module instead.
 */
const TOOL_CHUNK_TYPES = new Set([
  'compress', 'compress-target',
  'convert', 'convert-multi', 'convert-pdf',
  'resize', 'resize-social',
  'crop', 'rotate', 'flip', 'watermark', 'text-overlay', 'blur', 'sharpen', 'adjust',
  'ai-bg-remove', 'ai-upscale', 'ai-enhance', 'ai-sharpen', 'ai-colorize', 'ai-ocr',
  'social-canvas',
  'bulk',
  'palette', 'info', 'metadata', 'calculator'
]);

let _enginePromise;
function _loadCanonicalEngine() {
  _enginePromise ||= import('/js/engine.js');
  return _enginePromise;
}

/**
 * Backwards-compatible replacement for the former chunk loader.
 * Returns the canonical engine module for all known legacy interface types.
 */
export async function loadToolChunk(interfaceType) {
  if (!TOOL_CHUNK_TYPES.has(interfaceType)) {
    console.warn(`[perf] No canonical engine mapping for interfaceType "${interfaceType}"`);
    return null;
  }

  try {
    return await _loadCanonicalEngine();
  } catch (err) {
    _enginePromise = null;
    console.error(`[perf] Failed to load canonical engine for "${interfaceType}":`, err);
    return null;
  }
}

const _prefetched = new Set();

export function initPrefetch() {
  const DELAY = 150;
  document.addEventListener('mouseover', e => {
    const link = e.target.closest('a[href]');
    if (!link) return;

    const url = link.href;
    if (!url || _prefetched.has(url)) return;
    if (!url.includes('/tools/') && !url.startsWith(location.origin)) return;

    const timer = setTimeout(() => _prefetchURL(url), DELAY);
    link.addEventListener('mouseout', () => clearTimeout(timer), { once: true });
  });
}

function _prefetchURL(url) {
  if (_prefetched.has(url)) return;
  _prefetched.add(url);
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  link.as = 'document';
  document.head.appendChild(link);
}

export function injectResourceHints() {
  const hints = [
    { rel:'preconnect', href:'https://fonts.googleapis.com' },
    { rel:'preconnect', href:'https://fonts.gstatic.com', crossorigin:'' },
  ];

  hints.forEach(({ rel, href, crossorigin }) => {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const el = document.createElement('link');
    el.rel = rel;
    el.href = href;
    if (crossorigin !== undefined) el.crossOrigin = '';
    document.head.appendChild(el);
  });
}

export function markJSReady() {
  document.documentElement.classList.add('js-ready');
  document.documentElement.classList.remove('no-js');
}

export function initScrollReveal() {
  if (typeof IntersectionObserver === 'undefined') return;
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        revealObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal-on-scroll').forEach(el => revealObserver.observe(el));
}

export function buildSrcset(basePath, widths = [480, 800, 1200]) {
  const ext = basePath.split('.').pop();
  const base = basePath.replace(`.${ext}`, '');
  return widths.map(w => `${base}-${w}.${ext} ${w}w`).join(', ');
}

export function optimiseImageEl(img, width, height) {
  if (!img) return;
  img.loading = 'lazy';
  img.decoding = 'async';
  if (width) img.width = width;
  if (height) img.height = height;
}

export function reportPerformance() {
  if (typeof performance === 'undefined') return;
  const nav = performance.getEntriesByType('navigation')[0];
  if (!nav) return;

  const metrics = {
    TTFB: Math.round(nav.responseStart - nav.requestStart),
    FCP: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
    Load: Math.round(nav.loadEventEnd - nav.startTime),
    DOMSize: document.querySelectorAll('*').length,
  };

  console.table(metrics);
  return metrics;
}

export function init() {
  markJSReady();
  injectResourceHints();
  initLazyLoading();
  applyLazyImages();
  initScrollReveal();
  initPrefetch();
}
