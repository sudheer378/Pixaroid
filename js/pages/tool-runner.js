/**
 * Pixaroid — Tool Runner v3.1
 * Processing-only controller for the current static tool pages.
 * Preserves original file size before ArrayBuffer transfer so result
 * statistics remain correct after postMessage() detaches the buffer.
 */

const script = document.currentScript;
const slug = script?.dataset?.tool || document.body?.dataset?.toolSlug || '';
const category = script?.dataset?.category || '';

if (slug) init();

async function init() {
  let tool = null;
  try {
    const { default: TOOLS } = await import('/config/tools-config.js');
    tool = Array.isArray(TOOLS) ? TOOLS.find(t => t.slug === slug) : null;
  } catch (e) {
    // Tool configuration is optional for pages that provide their own controls.
  }

  try {
    if (tool) {
      const { injectToolMeta } = await import('/js/modules/seo-meta.js');
      const { injectToolLinks } = await import('/js/modules/internal-links.js');
      injectToolMeta(tool);
      injectToolLinks(tool);
    }
  } catch (e) {
    // SEO/link enhancement must never block the tool.
  }

  if (tool?.controls?.length) buildControls(tool.controls);

  if (tool?.acceptedFormats?.length) {
    const dz = document.querySelector('.dz-formats');
    if (dz) {
      const LABELS = {
        'image/jpeg':'JPG','image/png':'PNG','image/webp':'WebP','image/heic':'HEIC',
        'image/heif':'HEIF','image/gif':'GIF','image/bmp':'BMP','image/tiff':'TIFF','image/avif':'AVIF'
      };
      dz.innerHTML = tool.acceptedFormats
        .map(f => `<span class="dz-fmt-chip">${LABELS[f] || f.split('/')[1]?.toUpperCase() || f}</span>`)
        .join('');
    }
  }

  document.addEventListener('pxn:process', async e => {
    const { file, controls } = e.detail || {};
    if (!file) {
      document.dispatchEvent(new CustomEvent('pxn:error', { detail: { message: 'No file provided.' } }));
      return;
    }

    try {
      const result = await processFile(tool, file, controls || {});
      document.dispatchEvent(new CustomEvent('pxn:result', { detail: result }));
    } catch (err) {
      document.dispatchEvent(new CustomEvent('pxn:error', { detail: { message: err.message || String(err) } }));
    }
  });
}

async function processFile(tool, file, controls) {
  const itype = tool?.interfaceType || guessInterfaceType(slug);
  const buffer = await readBuffer(file);
  const originalSize = file.size;
  const mime = file.type || guessMime(file.name);

  if (itype === 'compress') {
    return runWorker('/workers/compress.worker.js', {
      op:'compress', buffer, mime,
      quality: clampNum(controls.quality, 80, 1, 100),
      format: controls.format || autoFmt(mime),
      maxWidth: clampNum(controls.maxWidth, 0),
    }, buffer, originalSize);
  }

  if (itype === 'compress-target') {
    const targetKB = clampNum(controls.targetKB, 100, 1, 50000);
    return runWorker('/workers/compress.worker.js', {
      op:'compress-target', buffer, mime,
      targetBytes: targetKB * 1024,
      format: controls.format || 'jpeg',
      minQuality: clampNum(controls.minQuality, 10, 1, 80),
    }, buffer, originalSize);
  }

  if (itype === 'convert' || itype === 'convert-multi' || itype === 'convert-pdf') {
    return runWorker('/workers/convert.worker.js', {
      op:'convert', buffer, mime,
      targetFormat: (controls.format || controls.targetFormat || 'jpeg').replace(/^jpg$/i, 'jpeg'),
      quality: clampNum(controls.quality, 90, 1, 100),
      background: controls.background || '#ffffff',
      lossless: controls.lossless === true || controls.lossless === 'true',
    }, buffer, originalSize);
  }

  if (itype === 'resize' || itype === 'resize-social' || itype === 'social-canvas') {
    return runWorker('/workers/resize.worker.js', {
      op:'resize', buffer, mime,
      width: clampNum(controls.width, 0),
      height: clampNum(controls.height, 0),
      percent: clampNum(controls.percent, 0),
      preset: controls.preset || '',
      fit: controls.fit || 'contain',
      lockAspect: controls.lockAspect !== 'false',
      format: controls.format || autoFmt(mime),
      quality: clampNum(controls.quality, 92, 1, 100),
    }, buffer, originalSize);
  }

  if (itype === 'bulk') return runBulk(slug, file, controls);

  if (['ai-bg-remove','ai-upscale','ai-enhance','ai-sharpen','ai-colorize','ai-ocr'].includes(itype)) {
    return runAI(itype, buffer, mime, controls, originalSize);
  }

  const ops = buildOps(itype, controls);
  return runWorker('/workers/filter.worker.js', {
    op:'edit', buffer, mime, operations: ops,
    format: controls.format || autoFmt(mime),
    quality: clampNum(controls.quality, 90, 1, 100),
  }, buffer, originalSize);
}

function runWorker(workerPath, payload, transferBuffer, originalSize = 0) {
  return new Promise((resolve, reject) => {
    let worker;
    try {
      worker = new Worker(workerPath);
    } catch (e) {
      reject(new Error('Worker failed to load: ' + workerPath));
      return;
    }

    const jobId = (globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`);
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error('Processing timed out after 60s. Try a smaller image.'));
    }, 60000);

    worker.onmessage = e => {
      if (e.data?.jobId !== jobId) return;
      clearTimeout(timer);
      worker.terminate();

      if (e.data.error) {
        reject(new Error(e.data.error));
        return;
      }

      const blob = e.data.blob;
      if (!(blob instanceof Blob)) {
        reject(new Error('Worker returned no valid result blob.'));
        return;
      }

      const resultSize = blob.size;
      const savings = originalSize > 0
        ? Math.max(0, Math.round((1 - resultSize / originalSize) * 100))
        : 0;

      resolve({
        blob,
        width: e.data.width || null,
        height: e.data.height || null,
        format: e.data.format || null,
        originalSize,
        resultSize,
        savings,
      });
    };

    worker.onerror = e => {
      clearTimeout(timer);
      worker.terminate();
      reject(new Error(e.message || 'Worker crashed. Check browser console.'));
    };

    const msg = { jobId, ...payload };
    const transfers = transferBuffer instanceof ArrayBuffer ? [transferBuffer] : [];

    try {
      worker.postMessage(msg, transfers);
    } catch (err) {
      clearTimeout(timer);
      worker.terminate();
      reject(new Error('Failed to send data to worker: ' + err.message));
    }
  });
}

function runAI(itype, buffer, mime, controls, originalSize = 0) {
  return new Promise((resolve, reject) => {
    let worker;
    try {
      worker = new Worker('/workers/ai.worker.js');
    } catch (e) {
      reject(new Error('AI worker failed to load'));
      return;
    }

    const jobId = (globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`);
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error('AI processing timed out. Try a smaller image.'));
    }, 120000);

    worker.onmessage = e => {
      if (e.data?.type === 'progress') {
        document.dispatchEvent(new CustomEvent('pxn:ai-progress', { detail: { percent: e.data.percent } }));
        return;
      }
      if (e.data?.jobId !== jobId) return;

      clearTimeout(timer);
      worker.terminate();

      if (e.data.error) {
        reject(new Error(e.data.error));
        return;
      }

      if (e.data.text !== undefined) {
        resolve({
          blob: new Blob([e.data.text || ''], { type:'text/plain' }),
          text: e.data.text,
          confidence: e.data.confidence,
          format: 'txt',
          width: e.data.width || null,
          height: e.data.height || null,
          originalSize,
          resultSize: new Blob([e.data.text || '']).size,
          savings: 0,
        });
        return;
      }

      const blob = e.data.blob;
      if (!(blob instanceof Blob)) {
        reject(new Error('AI worker returned no valid result blob.'));
        return;
      }

      resolve({
        blob,
        width: e.data.width || null,
        height: e.data.height || null,
        format: e.data.format || null,
        originalSize,
        resultSize: blob.size,
        savings: originalSize > 0 ? Math.max(0, Math.round((1 - blob.size / originalSize) * 100)) : 0,
      });
    };

    worker.onerror = e => {
      clearTimeout(timer);
      worker.terminate();
      reject(new Error(e.message || 'AI worker error'));
    };

    const OP_MAP = {
      'ai-bg-remove':'ai-bg-remove','ai-upscale':'ai-upscale','ai-enhance':'ai-enhance',
      'ai-sharpen':'ai-sharpen','ai-colorize':'ai-colorize','ai-ocr':'ai-ocr',
    };

    try {
      worker.postMessage({
        jobId,
        op: OP_MAP[itype],
        buffer,
        mime,
        scale: controls.scale,
        mode: controls.mode,
        strength: clampNum(controls.strength, 70, 0, 100),
        style: controls.style,
        language: controls.language || 'eng',
        amount: clampNum(controls.amount, 70, 0, 100),
        intensity: clampNum(controls.intensity, 80, 0, 100),
        bgColor: controls.bgColor || 'transparent',
        refine: controls.refine !== 'false',
        preprocess: controls.preprocess !== 'false',
      }, [buffer]);
    } catch (err) {
      clearTimeout(timer);
      worker.terminate();
      reject(new Error('Failed to send data to AI worker: ' + err.message));
    }
  });
}

async function runBulk(slug, file, controls) {
  const task = inferBulkTask(slug);
  const input = document.getElementById('file-input');
  const files = input?.files?.length > 1 ? Array.from(input.files) : [file];
  const tasks = await Promise.all(files.map(async f => ({
    filename: f.name,
    mime: f.type || guessMime(f.name),
    buffer: await readBuffer(f),
  })));

  return new Promise((resolve, reject) => {
    let worker;
    try { worker = new Worker('/workers/bulk.worker.js'); }
    catch (e) { reject(new Error('Bulk worker failed to load')); return; }

    const jobId = (globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`);
    const timer = setTimeout(() => { worker.terminate(); reject(new Error('Bulk timed out')); }, 300000);
    const totals = files.reduce((sum, f) => sum + f.size, 0);

    worker.onmessage = async e => {
      if (e.data?.jobId !== jobId) return;
      if (e.data.type === 'progress') {
        document.dispatchEvent(new CustomEvent('pxn:bulk-progress', { detail: {
          current:e.data.current, total:e.data.total, filename:e.data.filename
        }}));
        return;
      }
      if (e.data.type !== 'done') return;

      clearTimeout(timer);
      worker.terminate();
      const allResults = e.data.results || [];
      if (!allResults.length) { reject(new Error('No files processed')); return; }

      if (allResults.length === 1) {
        const r = allResults[0];
        const original = files[0]?.size || 0;
        resolve({
          blob:r.blob,
          format:(r.blob?.type?.split('/')[1] || 'jpg').replace('jpeg','jpg'),
          savings: original > 0 && r.blob ? Math.max(0, Math.round((1-r.blob.size/original)*100)) : 0,
        });
        return;
      }

      try {
        if (!window.JSZip) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
        const zip = new window.JSZip();
        const EXT = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','image/avif':'avif','image/bmp':'bmp','image/tiff':'tiff'};
        allResults.forEach(r => {
          if (!r.blob) return;
          const ext = EXT[r.blob.type] || 'jpg';
          const base = (r.filename || 'image').replace(/\.[^.]+$/, '');
          zip.file(`${base}.${ext}`, r.blob);
        });
        const zipBlob = await zip.generateAsync({ type:'blob', compression:'DEFLATE' });
        resolve({ blob:zipBlob, format:'zip', isZip:true, originalSize:totals, resultSize:zipBlob.size, savings:totals > 0 ? Math.max(0, Math.round((1-zipBlob.size/totals)*100)) : 0 });
      } catch (e2) {
        const r = allResults[0];
        resolve({ blob:r.blob, format:'jpg', savings:0 });
      }
    };

    worker.onerror = e => {
      clearTimeout(timer);
      worker.terminate();
      reject(new Error(e.message || 'Bulk worker error'));
    };

    try {
      const transfers = tasks.map(t => t.buffer).filter(b => b instanceof ArrayBuffer);
      worker.postMessage({ jobId, tasks, taskType:task, options:controls }, transfers);
    } catch (err) {
      clearTimeout(timer);
      worker.terminate();
      reject(new Error('Failed to send bulk data to worker: ' + err.message));
    }
  });
}

function readBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

function autoFmt(mime) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  if (mime === 'image/avif') return 'avif';
  return 'jpeg';
}

function clampNum(value, fallback, min = -Infinity, max = Infinity) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

function guessMime(name = '') {
  const ext = name.toLowerCase().split('.').pop();
  const map = {
    jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',
    gif:'image/gif',bmp:'image/bmp',tiff:'image/tiff',tif:'image/tiff',
    avif:'image/avif',heic:'image/heic',heif:'image/heif',pdf:'application/pdf'
  };
  return map[ext] || 'application/octet-stream';
}

function guessInterfaceType(s = '') {
  s = s.toLowerCase();
  if (/compress.*\d+kb$|to-\d+kb/.test(s)) return 'compress-target';
  if (/compress|reduce|optim/.test(s)) return 'compress';
  if (/resize|passport|dpi|for-|social/.test(s)) return 'resize';
  if (/to-png|to-jpg|to-webp|to-bmp|to-gif|to-tiff|to-avif|convert|heic/.test(s)) return 'convert';
  if (/crop/.test(s)) return 'crop';
  if (/rotat/.test(s)) return 'rotate';
  if (/flip/.test(s)) return 'flip';
  if (/watermark/.test(s)) return 'watermark';
  if (/\bblur\b/.test(s)) return 'blur';
  if (/sharpen/.test(s)) return 'sharpen';
  if (/bright|contrast|saturat|adjust/.test(s)) return 'adjust';
  if (/bg-remov|background/.test(s)) return 'ai-bg-remove';
  if (/upscal/.test(s)) return 'ai-upscale';
  if (/enhanc/.test(s)) return 'ai-enhance';
  if (/coloriz/.test(s)) return 'ai-colorize';
  if (/ocr|text-ext/.test(s)) return 'ai-ocr';
  if (/bulk/.test(s)) return 'bulk';
  return 'compress';
}

function buildControls(controls) {
  // Current static pages may provide their own controls. The runner keeps this hook
  // intentionally non-destructive when controls are already present.
  const existing = document.querySelector('[data-tool-controls]');
  if (!existing || !Array.isArray(controls)) return;
  existing.dataset.controlCount = String(controls.length);
}

function buildOps(itype, controls) {
  const map = {
    crop: [{ type:'crop', x:controls.x, y:controls.y, width:controls.width, height:controls.height }],
    rotate: [{ type:'rotate', angle:controls.angle ?? 90 }],
    flip: [{ type:'flip', direction:controls.direction || 'horizontal' }],
    watermark: [{ type:'watermark', text:controls.text || 'Pixaroid', opacity:controls.opacity ?? 0.5 }],
    blur: [{ type:'blur', radius:controls.radius ?? 5 }],
    sharpen: [{ type:'sharpen', amount:controls.amount ?? 50 }],
    adjust: [{ type:'adjust', brightness:controls.brightness ?? 0, contrast:controls.contrast ?? 0, saturation:controls.saturation ?? 0 }],
  };
  return map[itype] || [];
}

function inferBulkTask(s = '') {
  const type = guessInterfaceType(s);
  return type === 'compress-target' ? 'target' : type === 'resize' ? 'resize' : type === 'convert' ? 'convert' : type === 'bulk' ? 'compress' : 'edit';
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') return resolve();
      existing.addEventListener('load', () => resolve(), { once:true });
      existing.addEventListener('error', reject, { once:true });
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => { s.dataset.loaded = 'true'; resolve(); };
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}
