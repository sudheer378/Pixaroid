/**
 * Pixaroid — Download Manager v2.1
 * Browser-safe downloads for single files, ZIP bundles and clipboard text.
 */
'use strict';

const EXT_MAP = Object.freeze({
  'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif',
  'image/avif':'avif','image/bmp':'bmp','image/tiff':'tiff','text/plain':'txt',
  'application/pdf':'pdf','application/zip':'zip',
});

function sanitise(value) {
  return String(value ?? '')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'image';
}

function ensureBlob(blob) {
  if (!(blob instanceof Blob)) throw new TypeError('Download requires a Blob.');
}

export class DownloadManager {
  static download(blob, suggestedName='', prefix='pixaroid') {
    ensureBlob(blob);
    const ext = EXT_MAP[blob.type] || 'bin';
    const rawBase = suggestedName ? String(suggestedName).replace(/\.[^.]+$/, '') : `${prefix}-${Date.now()}`;
    const filename = `${sanitise(rawBase)}.${ext}`;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return filename;
  }

  static async downloadZIP(files, zipName='pixaroid-images') {
    if (!Array.isArray(files) || !files.length) return null;
    if (files.length === 1) return DownloadManager.download(files[0].blob, files[0].filename);

    if (!window.JSZip) {
      await new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-pixaroid-jszip]');
        if (existing) {
          existing.addEventListener('load', resolve, { once:true });
          existing.addEventListener('error', reject, { once:true });
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.async = true;
        script.dataset.pixaroidJszip = 'true';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load ZIP support.'));
        document.head.appendChild(script);
      });
    }

    if (!window.JSZip) throw new Error('ZIP support is unavailable.');
    const zip = new window.JSZip();
    const names = new Set();
    for (const entry of files) {
      ensureBlob(entry?.blob);
      const ext = EXT_MAP[entry.blob.type] || 'bin';
      const base = sanitise(String(entry.filename ?? 'image').replace(/\.[^.]+$/, ''));
      let name = `${base}.${ext}`;
      let index = 1;
      while (names.has(name)) name = `${base}-${++index}.${ext}`;
      names.add(name);
      zip.file(name, entry.blob);
    }
    const zipBlob = await zip.generateAsync({ type:'blob', compression:'DEFLATE', compressionOptions:{ level:6 } });
    return DownloadManager.download(zipBlob, `${sanitise(zipName)}.zip`, 'pixaroid');
  }

  static async copyText(text) {
    const value = String(text ?? '');
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch {}

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(textarea);
    textarea.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch {}
    textarea.remove();
    return ok;
  }

  static suggestName(originalName='', operation='processed', format='') {
    const base = sanitise(String(originalName).replace(/\.[^.]+$/, '') || 'image');
    const ext = sanitise(format || String(originalName).split('.').pop() || 'jpg');
    return `${base}-${sanitise(operation)}.${ext}`;
  }
}
