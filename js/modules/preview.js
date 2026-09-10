/**
 * Pixaroid — Preview Module v2.1
 * Before/after comparison with slider, zoom and metadata overlay.
 */
'use strict';

import { formatBytes } from '/js/engine.js';

export class PreviewPanel {
  constructor({ container, slider=true, zoom=true, stats=true } = {}) {
    this.container = container;
    this._slider = slider;
    this._zoom = zoom;
    this._showStats = stats;
    this._dragging = false;
    this._onMouseMove = null;
    this._onTouchMove = null;
    this._onMouseUp = null;
    this._onTouchEnd = null;
    this._onMouseDown = null;
    this._onTouchStart = null;
    this._onZoomClick = null;
    this._build();
  }

  _build() {
    if (!this.container) throw new Error('PreviewPanel container is required.');
    this.container.innerHTML = `
      <div class="pv-wrap" style="position:relative;border:1px solid var(--border,#E5E7EB);border-radius:.875rem;overflow:hidden;background:repeating-conic-gradient(#e5e7eb 0% 25%,transparent 0% 50%) 0 0/20px 20px;min-height:160px;">
        <img class="pv-original" style="width:100%;display:block;max-height:320px;object-fit:contain;" alt="Original" />
        <div class="pv-result-clip" style="position:absolute;top:0;left:0;width:50%;height:100%;overflow:hidden;display:none;">
          <img class="pv-result" style="width:200%;max-height:320px;object-fit:contain;transform:none;" alt="Result" />
        </div>
        <div class="pv-divider" style="display:none;position:absolute;top:0;left:50%;width:2px;height:100%;background:#4F46E5;cursor:ew-resize;z-index:10;">
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:28px;height:28px;border-radius:50%;background:#4F46E5;display:flex;align-items:center;justify-content:center;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>
        <div class="pv-badge-orig" style="display:none;position:absolute;top:.5rem;left:.5rem;padding:.25rem .625rem;border-radius:999px;background:rgba(0,0,0,.55);color:#fff;font-size:.7rem;font-weight:600;">ORIGINAL</div>
        <div class="pv-badge-result" style="display:none;position:absolute;top:.5rem;right:.5rem;padding:.25rem .625rem;border-radius:999px;background:rgba(79,70,229,.85);color:#fff;font-size:.7rem;font-weight:600;">RESULT</div>
      </div>
      <div class="pv-stats" style="display:flex;gap:.625rem;flex-wrap:wrap;margin-top:.625rem;"></div>
    `;
    this._imgOrig = this.container.querySelector('.pv-original');
    this._imgResult = this.container.querySelector('.pv-result');
    this._clip = this.container.querySelector('.pv-result-clip');
    this._divider = this.container.querySelector('.pv-divider');
    this._statsEl = this.container.querySelector('.pv-stats');
    this._badgeO = this.container.querySelector('.pv-badge-orig');
    this._badgeR = this.container.querySelector('.pv-badge-result');
    if (this._zoom) this._initZoom();
  }

  async setOriginal(source, meta={}) {
    this._revokeOriginalURL();
    const url = typeof source === 'string' ? source : URL.createObjectURL(source);
    this._origURL = url;
    this._origIsObjectURL = typeof source !== 'string';
    this._origMeta = meta;
    this._imgOrig.src = url;
    const originalSize = meta.originalSize ?? meta.size;
    if (originalSize || meta.width || meta.height) this._updateStats({ ...meta, originalSize });
  }

  async setResult(blob, meta={}) {
    if (!(blob instanceof Blob)) throw new Error('Preview result must be a Blob.');
    this._revokeResultURL();
    const url = URL.createObjectURL(blob);
    this._resultURL = url;
    this._resultMeta = meta;
    this._imgResult.src = url;

    const pct = Math.max(5, Math.min(95, Number(meta.sliderPct ?? 50)));
    this._divider.style.left = `${pct}%`;
    this._clip.style.width = `${pct}%`;
    this._imgResult.style.width = `${10000 / pct}%`;
    this._clip.style.display = 'block';
    this._divider.style.display = this._slider ? 'block' : 'none';
    this._badgeO.style.display = 'block';
    this._badgeR.style.display = 'block';
    if (this._slider) this._initSlider();
    if (this._showStats) this._updateStats(meta);
  }

  _updateStats(meta={}) {
    const chips = [];
    if (meta.originalSize) chips.push(this._chip(`Before: ${formatBytes(meta.originalSize)}`));
    if (meta.resultSize) chips.push(this._chip(`After: ${formatBytes(meta.resultSize)}`, 'success'));
    if (meta.savings > 0) chips.push(this._chip(`↓ ${meta.savings}% smaller`, 'success'));
    if (meta.width && meta.height) chips.push(this._chip(`${meta.width}×${meta.height}`));
    this._statsEl.replaceChildren(...chips);
  }

  _chip(text, variant='default') {
    const el = document.createElement('span');
    el.textContent = text;
    el.style.cssText = variant === 'success'
      ? 'padding:.25rem .625rem;border-radius:999px;background:rgba(16,185,129,.12);color:#059669;font-weight:600;font-size:.75rem;'
      : 'padding:.25rem .625rem;border-radius:999px;background:var(--bg,#F9FAFB);border:1px solid var(--border,#E5E7EB);font-size:.75rem;';
    return el;
  }

  _initSlider() {
    this._removeSliderListeners();
    const wrap = this.container.querySelector('.pv-wrap');
    const div = this._divider;
    const move = x => {
      const rect = wrap.getBoundingClientRect();
      const pct = Math.max(5, Math.min(95, ((x - rect.left) / Math.max(rect.width, 1)) * 100));
      div.style.left = `${pct}%`;
      this._clip.style.width = `${pct}%`;
      this._imgResult.style.width = `${10000 / pct}%`;
    };

    this._onMouseMove = e => { if (this._dragging) move(e.clientX); };
    this._onTouchMove = e => { if (this._dragging && e.touches[0]) move(e.touches[0].clientX); };
    this._onMouseUp = () => { this._dragging = false; };
    this._onTouchEnd = () => { this._dragging = false; };
    this._onMouseDown = e => { e.preventDefault(); this._dragging = true; };
    this._onTouchStart = () => { this._dragging = true; };

    div.addEventListener('mousedown', this._onMouseDown);
    div.addEventListener('touchstart', this._onTouchStart, { passive:true });
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('touchmove', this._onTouchMove, { passive:true });
    document.addEventListener('mouseup', this._onMouseUp);
    document.addEventListener('touchend', this._onTouchEnd);
  }

  _removeSliderListeners() {
    if (this._divider && this._onMouseDown) this._divider.removeEventListener('mousedown', this._onMouseDown);
    if (this._divider && this._onTouchStart) this._divider.removeEventListener('touchstart', this._onTouchStart);
    if (this._onMouseMove) document.removeEventListener('mousemove', this._onMouseMove);
    if (this._onTouchMove) document.removeEventListener('touchmove', this._onTouchMove);
    if (this._onMouseUp) document.removeEventListener('mouseup', this._onMouseUp);
    if (this._onTouchEnd) document.removeEventListener('touchend', this._onTouchEnd);
    this._onMouseMove = this._onTouchMove = this._onMouseUp = this._onTouchEnd = null;
    this._onMouseDown = this._onTouchStart = null;
  }

  _initZoom() {
    const wrap = this.container.querySelector('.pv-wrap');
    if (!wrap) return;
    wrap.style.cursor = 'zoom-in';
    this._onZoomClick = () => {
      const src = this._resultURL || this._origURL;
      if (!src) return;
      const overlay = document.createElement('div');
      Object.assign(overlay.style, { position:'fixed', inset:'0', background:'rgba(0,0,0,.85)', zIndex:'9998', display:'flex', alignItems:'center', justifyContent:'center', cursor:'zoom-out' });
      const img = document.createElement('img');
      Object.assign(img.style, { maxWidth:'95vw', maxHeight:'92vh', objectFit:'contain', borderRadius:'.5rem', boxShadow:'0 20px 80px rgba(0,0,0,.5)' });
      img.src = src;
      overlay.appendChild(img);
      overlay.addEventListener('click', () => overlay.remove(), { once:true });
      document.body.appendChild(overlay);
    };
    wrap.addEventListener('click', this._onZoomClick);
  }

  _revokeOriginalURL() {
    if (this._origURL && this._origIsObjectURL) URL.revokeObjectURL(this._origURL);
    this._origURL = null;
    this._origIsObjectURL = false;
  }

  _revokeResultURL() {
    if (this._resultURL) URL.revokeObjectURL(this._resultURL);
    this._resultURL = null;
  }

  reset() {
    this._removeSliderListeners();
    if (this._onZoomClick) {
      const wrap = this.container.querySelector('.pv-wrap');
      wrap?.removeEventListener('click', this._onZoomClick);
    }
    this._imgOrig.src = '';
    this._imgResult.src = '';
    this._clip.style.display = 'none';
    this._divider.style.display = 'none';
    this._badgeO.style.display = 'none';
    this._badgeR.style.display = 'none';
    this._statsEl.replaceChildren();
    this._revokeOriginalURL();
    this._revokeResultURL();
    this._origMeta = null;
    this._resultMeta = null;
    this._dragging = false;
  }

  destroy() {
    this.reset();
    this.container.replaceChildren();
  }
}
