/**
 * Pixaroid — Toast Notifications v2.1
 * Safe text rendering, dismiss controls and consistent lifecycle handling.
 */
'use strict';

let _container = null;

function getContainer() {
  if (!_container) {
    _container = document.createElement('div');
    Object.assign(_container.style, {
      position:'fixed', bottom:'1.5rem', right:'1.5rem',
      display:'flex', flexDirection:'column', gap:'.5rem',
      zIndex:'9999', pointerEvents:'none',
    });
    document.body.appendChild(_container);
  }
  return _container;
}

const ICONS = {
  success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
  error:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  info:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
};
const BG = { success:'#10B981', error:'#EF4444', warning:'#F59E0B', info:'#3B82F6', default:'#111827' };

export function showToast(message, type='default', duration=3500) {
  const c = getContainer();
  const t = document.createElement('div');
  Object.assign(t.style, {
    display:'flex', alignItems:'center', gap:'.625rem',
    padding:'.75rem 1.125rem', borderRadius:'.875rem',
    background: BG[type] || BG.default, color:'#fff',
    fontFamily:"'Inter',sans-serif", fontSize:'.875rem', fontWeight:'500',
    boxShadow:'0 8px 32px rgba(0,0,0,.25)',
    pointerEvents:'all', cursor:'pointer',
    opacity:'0', transform:'translateY(8px)',
    transition:'opacity .25s, transform .25s',
    maxWidth:'340px', lineHeight:'1.5',
  });

  const icon = document.createElement('span');
  icon.style.flexShrink = '0';
  icon.innerHTML = ICONS[type] || '';
  const text = document.createElement('span');
  text.textContent = String(message ?? '');
  t.append(icon, text);

  const dismissHandle = () => dismiss(t);
  t.addEventListener('click', dismissHandle);
  c.appendChild(t);
  requestAnimationFrame(() => { t.style.opacity='1'; t.style.transform='none'; });

  if (duration > 0) t._timer = setTimeout(dismissHandle, duration);
  return { dismiss: dismissHandle };
}

function dismiss(t) {
  if (!t || t.dataset.dismissed === 'true') return;
  t.dataset.dismissed = 'true';
  clearTimeout(t._timer);
  t.style.opacity='0';
  t.style.transform='translateY(8px)';
  setTimeout(() => t.remove(), 300);
}

export function clearToasts() {
  if (_container) _container.innerHTML = '';
}
