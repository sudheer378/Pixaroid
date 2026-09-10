/**
 * Pixaroid Monetag integration.
 * Idempotent loader: a static sitewide Monetag tag is treated as authoritative.
 */
'use strict';

const MONETAG_SRC = 'https://quge5.com/88/tag.min.js';
const MONETAG_ZONE = '277292';

export function loadMonetag() {
  if (typeof document === 'undefined') return;
  const existing = document.querySelector(
    `script[data-pixaroid-monetag], script[src="${MONETAG_SRC}"], script[src^="${MONETAG_SRC}?"], script[data-zone="${MONETAG_ZONE}"]`
  );
  if (existing) return;

  const script = document.createElement('script');
  script.src = MONETAG_SRC;
  script.async = true;
  script.setAttribute('data-zone', MONETAG_ZONE);
  script.setAttribute('data-cfasync', 'false');
  script.setAttribute('data-pixaroid-monetag', 'true');
  document.head.appendChild(script);
}

export const MONETAG_CONFIG = Object.freeze({
  src: MONETAG_SRC,
  zone: MONETAG_ZONE,
});
