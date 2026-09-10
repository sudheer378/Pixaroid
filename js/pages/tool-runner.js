/**
 * Pixaroid — Tool Runner v3.2
 * Processing-only controller for the current static tool pages.
 *
 * The runtime registry is intentionally optional: static pages may provide
 * their own controls, and current processing is routed directly from the
 * page/tool contract. This prevents stale config data from becoming a hard
 * dependency while preserving compatibility for related-link enhancements.
 */

const script = document.currentScript;
const slug = script?.dataset?.tool || document.body?.dataset?.toolSlug || '';
const category = script?.dataset?.category || '';

if (slug) init();

async function init() {
  const tool = await loadRuntimeTool(slug);

  try {
    if (tool) {
      const { injectToolMeta } = await import('/js/modules/seo-meta.js');
      const { injectToolLinks } = await import('/js/modules/internal-links.js');
      injectToolMeta(tool);
      injectToolLinks(tool);
    }
  } catch {
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

async function loadRuntimeTool(currentSlug) {
  if (!currentSlug) return null;

  // The registry is a compatibility source, not the source of truth for
  // static pages. Prefer a page-provided tool contract when available.
  if (window.PixaroidTool && window.PixaroidTool.slug === currentSlug) {
    return window.PixaroidTool;
  }

  try {
    const module = await import('/config/tools-config.js');
    const tools = Array.isArray(module.default) ? module.default : [];
    return tools.find(t => t?.slug === currentSlug) || null;
  } catch {
    return null;
  }
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
        const textBlob = new Blob([e.data.text || ''], { type:'text/plain' });
        resolve({
          blob: textBlob,
          text: e.data.text,
          confidence: e.data.confidence,
          format: 'txt',
          width: e.data.width || null,
          height: e.data.height || null,
          originalSize,
          resultSize: textBlob.size,
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

    worker.postMessage({
      jobId,
      op: itype,
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
  });
}

async function runBulk(currentSlug, file, controls) {
  const task = inferBulkTask(currentSlug);
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
    catch { reject(new Error('Bulk worker failed to load')); return; }

    const jobId = (globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`);
    const timer = setTimeout(() => { worker.terminate(); reject(new Error('Bulk processing timed out.')); }, 300000);

    worker.onmessage = async e => {
      if (e.data?.jobId !== jobId) return;
      if (e.data.type === 'progress') {
        const { current, total, filename } = e.data;
        document.dispatchEvent(new CustomEvent('pxn:bulk-progress', { detail: { current, total, filename } }));
        return;
      }
      if (e.data.type !== 'done') return;

      clearTimeout(timer);
      worker.terminate();
      const allResults = e.data.results || [];
      if (!allResults.length) { reject(new Error('No files processed')); return; }

      if (allResults.length === 1) {
        const r = allResults[0];
        resolve({ blob:r.blob, format:(r.blob?.type?.split('/')[1] || 'jpg').replace('jpeg','jpg'), savings:0 });
        return;
      }

      try {
        if (!window.JSZip) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
        const zip = new window.JSZip();
        const EXT = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
        allResults.forEach(r => {
          if (!r.blob) return;
          const ext = EXT[r.blob.type] || 'jpg';
          const base = (r.filename || 'image').replace(/\.[^.]+$/, '');
          zip.file(`${base}.${ext}`, r.blob);
        });
        const zipBlob = await zip.generateAsync({ type:'blob', compression:'DEFLATE' });
        resolve({ blob:zipBlob, format:'zip', isZip:true, savings:0 });
      } catch {
        const r = allResults[0];
        resolve({ blob:r.blob, format:'jpg', savings:0 });
      }
    };

    worker.onerror = e => {
      clearTimeout(timer);
      worker.terminate();
      reject(new Error(e.message || 'Bulk worker error'));
    };

    worker.postMessage({
      jobId,
      tasks,
      taskType:task,
      options:controls,
    }, tasks.map(t => t.buffer).filter(b => b instanceof ArrayBuffer));
  });
}

function readBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsArrayBuffer(file);
  });
}

function clampNum(value, fallback, min = -Infinity, max = Infinity) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function autoFmt(mime) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  return 'jpeg';
}

function guessMime(name) {
  const ext = String(name || '').split('.').pop().toLowerCase();
  const map = { jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', webp:'image/webp', gif:'image/gif', bmp:'image/bmp', tiff:'image/tiff', tif:'image/tiff', avif:'image/avif', heic:'image/heic', heif:'image/heif' };
  return map[ext] || 'application/octet-stream';
}

function guessInterfaceType(value) {
  const s = String(value || '').toLowerCase();
  if (/compress.*\d+kb$|to-\d+kb/.test(s)) return 'compress-target';
  if (/compress|reduce|optim/.test(s)) return 'compress';
  if (/to-png|to-jpg|to-webp|to-bmp|to-gif|to-tiff|to-avif|convert|heic/.test(s)) return 'convert';
  if (/resize|passport|dpi|social/.test(s)) return 'resize';
  if (/crop/.test(s)) return 'crop';
  if (/rotate/.test(s)) return 'rotate';
  if (/flip/.test(s)) return 'flip';
  if (/watermark/.test(s)) return 'watermark';
  if (/blur/.test(s)) return 'blur';
  if (/sharpen/.test(s)) return 'sharpen';
  if (/background-remover/.test(s)) return 'ai-bg-remove';
  if (/upscal/.test(s)) return 'ai-upscale';
  if (/ocr|image-to-text/.test(s)) return 'ai-ocr';
  return 'edit';
}

function buildOps(type, controls) {
  switch (type) {
    case 'crop': return [{ type:'crop', x:controls.x, y:controls.y, width:controls.width, height:controls.height }];
    case 'rotate': return [{ type:'rotate', angle:clampNum(controls.angle, 90) }];
    case 'flip': return [{ type:'flip', horizontal:controls.horizontal === true || controls.horizontal === 'true', vertical:controls.vertical === true || controls.vertical === 'true' }];
    case 'watermark': return [{ type:'watermark', text:controls.text, opacity:controls.opacity, position:controls.position }];
    case 'blur': return [{ type:'blur', amount:controls.amount }];
    case 'sharpen': return [{ type:'sharpen', amount:controls.amount }];
    default: return [{ type, ...controls }];
  }
}

function inferBulkTask(currentSlug) {
  const s = String(currentSlug || '').toLowerCase();
  if (s.includes('resize')) return 'resize';
  if (s.includes('convert') || /-to-/.test(s)) return 'convert';
  return 'compress';
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = [...document.scripts].find(s => s.src === src);
    if (existing) {
      if (window.JSZip) resolve();
      else existing.addEventListener('load', resolve, { once:true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}
