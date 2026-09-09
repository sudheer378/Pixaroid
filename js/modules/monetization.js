/**
 * Pixaroid monetization controller.
 * Keeps third-party monetization isolated from navigation and core tool UI.
 * SmartLinks are explicitly labelled as sponsored and never auto-redirect users.
 */
'use strict';

const MONETAG_SRC = 'https://quge5.com/88/tag.min.js';
const MONETAG_ZONE = '277292';

const SMARTLINKS = Object.freeze([
  'https://sordidcopper.com/ah4q89k44?key=b7b2b4355e9576b54f29b8445e7d6775',
  'https://sordidcopper.com/a7buqkb8ii?key=717a52ca31ccb8da56a9ae0bee29d372'
]);

function isSafeUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === 'sordidcopper.com';
  } catch {
    return false;
  }
}

export function createSmartlink(slot = 0) {
  const url = SMARTLINKS[Number(slot) === 1 ? 1 : 0];
  if (!isSafeUrl(url)) throw new Error('Invalid monetization URL');
  return url;
}

export function wireSmartlink(container, slot = 0) {
  if (!container || typeof document === 'undefined') return null;
  const url = createSmartlink(slot);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'nofollow sponsored noopener noreferrer';
  a.referrerPolicy = 'no-referrer-when-downgrade';
  a.textContent = 'Sponsored';
  a.className = 'pxn-sponsored-link';
  container.replaceChildren(a);
  return a;
}

export function loadMonetag() {
  if (typeof document === 'undefined') return;
  if (document.querySelector('script[data-pixaroid-monetag]')) return;

  const script = document.createElement('script');
  script.src = MONETAG_SRC;
  script.async = true;
  script.setAttribute('data-zone', MONETAG_ZONE);
  script.setAttribute('data-cfasync', 'false');
  script.setAttribute('data-pixaroid-monetag', 'true');
  document.head.appendChild(script);
}

export function mountSponsoredUnit() {
  if (typeof document === 'undefined') return;
  if (document.querySelector('[data-pixaroid-sponsored-unit]')) return;

  const unit = document.createElement('aside');
  unit.dataset.pixaroidSponsoredUnit = 'true';
  unit.setAttribute('aria-label', 'Sponsored content');
  unit.innerHTML = `
    <div style="max-width:1200px;margin:1.25rem auto;padding:0 1.25rem;">
      <div style="border:1px solid rgba(255,255,255,.10);border-radius:14px;background:rgba(255,255,255,.025);padding:12px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;font-family:system-ui,-apple-system,sans-serif;">
        <div style="min-width:180px;flex:1;">
          <div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.55;margin-bottom:3px;">Sponsored</div>
          <div style="font-size:13px;opacity:.78;">Support Pixaroid by exploring a sponsored offer.</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <a href="${createSmartlink(0)}" target="_blank" rel="nofollow sponsored noopener noreferrer" referrerpolicy="no-referrer-when-downgrade" style="display:inline-flex;align-items:center;padding:8px 12px;border-radius:9px;background:#7b6fff;color:#fff;font-size:12px;font-weight:700;text-decoration:none;">Sponsored offer</a>
          <a href="${createSmartlink(1)}" target="_blank" rel="nofollow sponsored noopener noreferrer" referrerpolicy="no-referrer-when-downgrade" style="display:inline-flex;align-items:center;padding:8px 12px;border-radius:9px;border:1px solid rgba(255,255,255,.14);color:inherit;font-size:12px;font-weight:700;text-decoration:none;">View offer</a>
        </div>
      </div>
    </div>`;

  const footer = document.querySelector('footer');
  if (footer?.parentNode) footer.parentNode.insertBefore(unit, footer);
  else if (document.body) document.body.appendChild(unit);
}

export const MONETAG_CONFIG = Object.freeze({
  src: MONETAG_SRC,
  zone: MONETAG_ZONE,
});

export const SMARTLINK_COUNT = SMARTLINKS.length;

function boot() {
  loadMonetag();
  mountSponsoredUnit();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
