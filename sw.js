/* Pixaroid service worker — offline cache for the static site.
 *
 * Pre-launch audit changes (see AUDIT_PRELAUNCH_QWEN.md):
 *  - Removed Monetag push-notification bootstrap (importScripts of a remote
 *    third-party worker). The site serves no ads and requests no push
 *    permissions; caching/holding a SW at scope '/' with remote code was a
 *    privacy/security risk and contradicted ads.txt.
 *  - Shell JS/CSS are now NETWORK-FIRST with cache fallback, so users receive
 *    updated application code after each deployment without manual cache
 *    clearing (assets are unhashed).
 *  - Precaching is resilient: one missing optional resource no longer aborts
 *    installation (Promise.allSettled + REQUIRED list).
 */

const VERSION = 'pixaroid-v4.0.0';
const SHELL_CACHE = `${VERSION}-shell`;
const PAGES_CACHE = `${VERSION}-pages`;
const ASSETS_CACHE = `${VERSION}-assets`;

// Resources that MUST be cached for offline use; failure here is logged loudly.
const REQUIRED_URLS = ['/', '/css/output.css', '/js/app.js'];

// Best-effort precache list — individual failures are logged, not fatal.
const OPTIONAL_URLS = [
  '/css/animations.css', '/js/engine.js',
  '/js/modules/internal-links.js', '/js/modules/performance.js', '/js/modules/seo-meta.js',
  '/js/modules/file-handler.js', '/js/modules/canvas-engine.js', '/js/modules/download-manager.js',
  '/js/modules/toast.js',
  '/workers/compress.worker.js', '/workers/convert.worker.js', '/workers/resize.worker.js',
  '/workers/filter.worker.js', '/workers/ai.worker.js',
  '/assets/svg/logo.svg', '/assets/svg/favicon.svg', '/assets/svg/ui-icons.svg',
  '/assets/svg/tool-icons.svg', '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    const results = await Promise.allSettled(
      [...REQUIRED_URLS, ...OPTIONAL_URLS].map(u =>
        fetch(u).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status} ${u}`); return cache.put(u, r); })
      )
    );
    results.forEach((res, i) => {
      if (res.status === 'rejected') {
        const url = [...REQUIRED_URLS, ...OPTIONAL_URLS][i];
        console[REQUIRED_URLS.includes(url) ? 'error' : 'warn']('[SW] precache failed:', url, res.reason);
      }
    });
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  const keep = new Set([SHELL_CACHE, PAGES_CACHE, ASSETS_CACHE]);
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !keep.has(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  // Same-origin GET only — never intercept or cache third-party requests.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  const path = url.pathname;

  if (_isMutableApp(path)) {
    // Unhashed application JS/CSS/workers: always prefer fresh network copy.
    event.respondWith(_networkFirst(request, SHELL_CACHE));
    return;
  }
  if (_isAsset(path)) {
    // Images/fonts/SVG rarely change; cache-first with network fallback.
    event.respondWith(_cacheFirst(request, ASSETS_CACHE));
    return;
  }
  if (_isToolPage(path) || _isCategoryPage(path)) {
    event.respondWith(_staleWhileRevalidate(request, PAGES_CACHE));
    return;
  }
  event.respondWith(_networkFirst(request, PAGES_CACHE));
});

async function _cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline — cached version unavailable.', { status: 503 });
  }
}

async function _staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || fetchPromise || new Response('Page unavailable offline.', { status: 503 });
}

async function _networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Network error.', { status: 503 });
  }
}

function _isMutableApp(path) {
  return path.endsWith('.css') ||
    (path.startsWith('/js/') && path.endsWith('.js') && !path.includes('/chunks/')) ||
    (path.startsWith('/workers/') && path.endsWith('.js'));
}
function _isAsset(path) {
  return path.startsWith('/assets/') || path === '/manifest.json' ||
    path.endsWith('.svg') || path.endsWith('.png') ||
    path.endsWith('.jpg') || path.endsWith('.webp') || path.endsWith('.woff2') || path.endsWith('.woff');
}
function _isToolPage(path) {
  return path.startsWith('/tools/') && (path.endsWith('/') || path.endsWith('.html'));
}
function _isCategoryPage(path) {
  return /^\/(compress|convert|resize|editor|ai|social|utilities)\/?$/.test(path) ||
    /^\/tools\/[^/]+\/$/.test(path);
}
