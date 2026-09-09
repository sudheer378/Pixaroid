/**
 * Pixaroid monetization controller.
 * Ads load only after the page is ready and are isolated from core content.
 */
'use strict';

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

export const SMARTLINK_COUNT = SMARTLINKS.length;
