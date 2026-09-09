/**
 * Pixaroid Monetag integration.
 * Isolated from page content so ad loading cannot rewrite or replace core UI.
 */
'use strict';

const MONETAG_SRC = 'https://quge5.com/88/tag.min.js';
const MONETAG_ZONE = '277292';

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

export const MONETAG_CONFIG = Object.freeze({
  src: MONETAG_SRC,
  zone: MONETAG_ZONE,
});
