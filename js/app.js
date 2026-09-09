/**
 * Pixaroid — App Bootstrap  ·  js/app.js
 *
 * Entry point loaded on every page.
 * Initialises: theme, service worker, performance module, prefetch,
 *              lazy loading, scroll reveal, tool link injection,
 *              and isolated monetisation loading.
 */
import { init as initPerf } from '/js/modules/performance.js';
import { loadMonetag } from '/js/modules/monetag.js';
import { mountSponsoredUnit } from '/js/modules/monetization.js';

const HEADER_ROUTES = new Map([
  ['/pdf/', '/tools/pdf-tools/'],
  ['/compress/', '/tools/compression/'],
  ['/convert/', '/tools/conversion/'],
  ['/resize/', '/tools/resize/'],
  ['/ai/', '/tools/ai-tools/'],
  ['/editor/', '/tools/editor/'],
  ['/social/', '/tools/social-tools/'],
  ['/utilities/', '/tools/utilities/'],
  ['/bulk/', '/tools/bulk-tools/'],
]);

function normalizeHeaderNavigation() {
  const links = document.querySelectorAll('header a, #navbar a, .nav a, .navbar a');

  links.forEach((link) => {
    const raw = link.getAttribute('href');
    if (!raw || raw.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(raw)) return;

    const path = raw.split('#')[0].split('?')[0];
    const canonical = HEADER_ROUTES.get(path);
    if (canonical) {
      const suffix = raw.slice(path.length);
      link.setAttribute('href', canonical + suffix);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {

  /* ── Canonical header navigation ───────────────────────── */
  normalizeHeaderNavigation();

  /* ── Theme ────────────────────────────────────────────── */
  const root = document.documentElement;
  const s    = localStorage.getItem('pxn-theme');
  if (s === 'dark' || (!s && matchMedia('(prefers-color-scheme:dark)').matches)) {
    root.classList.add('dark');
  }

  /* ── Performance module ───────────────────────────────── */
  initPerf();

  /* ── Monetag + clearly labelled sponsored unit ───────── */
  try { loadMonetag(); } catch (err) { console.warn('[Monetag] load failed:', err); }
  try { mountSponsoredUnit(); } catch (err) { console.warn('[Sponsored] mount failed:', err); }

  /* ── Service Worker ───────────────────────────────────── */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .catch(err => console.warn('[SW] registration failed:', err));
  }

  /* ── Tool page: inject internal links ─────────────────── */
  const toolSlug = document.body.dataset.toolSlug;
  if (toolSlug) {
    import('/js/modules/internal-links.js').then(({ injectToolLinks }) => {
      injectToolLinks({ slug: toolSlug });
    });
  }

  /* ── Analytics (replace with real GA4 ID) ─────────────── */
  // const GA_ID = 'G-XXXXXXXXXX';
  // _loadGA(GA_ID);
});
