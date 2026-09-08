/** Pixaroid Editor/Filter Worker v5 — browser Worker safe */
'use strict';

const MAX_CONCURRENT = 4;
self.onmessage = async (e) => {
  const d = e.data || {};
  try {
    if (d.op === 'edit') return await edit(d);
    if (d.op === 'edit-batch') return await batch(d);
    throw new Error('Unknown operation: ' + d.op);
  } catch (err) {
    self.postMessage({ jobId: d.jobId, error: err?.message || String(err) });
  }
};

function assertSupport() {
  if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') {
    throw new Error('This browser does not support local image editing (OffscreenCanvas/createImageBitmap required).');
  }
}

async function decode(buffer, mime) {
  assertSupport();
  return createImageBitmap(new Blob([buffer], { type: mime || 'application/octet-stream' }));
}

function mimeOf(format) {
  const f = String(format || '').toLowerCase();
  if (f === 'png') return 'image/png';
  if (f === 'webp') return 'image/webp';
  if (f === 'avif') return 'image/avif';
  return 'image/jpeg';
}

function qualityOf(value) {
  return Math.max(0.1, Math.min(1, (Number(value) || 90) / 100));
}

async function encode(canvas, format, quality) {
  const type = mimeOf(format);
  const blob = await canvas.convertToBlob({ type, quality: type === 'image/png' ? undefined : qualityOf(quality) });
  if (!blob) throw new Error('Edit failed - no output');
  return [blob, type];
}

function rounded(ctx, width, height, radius) {
  const r = Math.max(0, Math.min(Number(radius) || 0, Math.min(width, height) / 2));
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(width - r, 0);
  ctx.quadraticCurveTo(width, 0, width, r);
  ctx.lineTo(width, height - r);
  ctx.quadraticCurveTo(width, height, width - r, height);
  ctx.lineTo(r, height);
  ctx.quadraticCurveTo(0, height, 0, height - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.clip();
}

function applyFilters(ctx, operations) {
  const filters = [];
  for (const op of Array.isArray(operations) ? operations : []) {
    const type = op.type;
    if (type === 'brightness') filters.push('brightness(' + (100 + (Number(op.value) || 0)) + '%)');
    else if (type === 'contrast') filters.push('contrast(' + (100 + (Number(op.value) || 0)) + '%)');
    else if (type === 'saturation') filters.push('saturate(' + (100 + (Number(op.value) || 0)) + '%)');
    else if (type === 'blur') filters.push('blur(' + Math.max(0, Number(op.radius) || 2) + 'px)');
    else if (type === 'grayscale') filters.push('grayscale(100%)');
    else if (type === 'sepia') filters.push('sepia(' + Math.max(0, Math.min(1, (Number(op.intensity) || 80) / 100)) + ')');
    else if (type === 'invert') filters.push('invert(100%)');
  }
  ctx.filter = filters.length ? filters.join(' ') : 'none';
}

function drawBase(ctx, image, width, height, operations) {
  const ops = Array.isArray(operations) ? operations : [];
  const rotation = ops.reduce((sum, op) => sum + (op.type === 'rotate' ? (Number(op.angle) || 90) : 0), 0);
  const flipH = ops.some(op => op.type === 'flip' && op.horizontal);
  const flipV = ops.some(op => op.type === 'flip' && op.vertical);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(width / 2, height / 2);
  ctx.rotate(rotation * Math.PI / 180);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  applyFilters(ctx, ops);
  ctx.drawImage(image, -image.width / 2, -image.height / 2, image.width, image.height);
  ctx.restore();
  ctx.filter = 'none';
}

function applyOverlays(ctx, canvas, operations) {
  for (const op of Array.isArray(operations) ? operations : []) {
    if (op.type !== 'watermark' && op.type !== 'text') continue;
    ctx.save();
    const fontSize = Number(op.fontSize) || 40;
    const text = String(op.text || '© Pixaroid');
    const opacity = Math.max(0, Math.min(1, (Number(op.opacity) ?? 50) / 100));
    ctx.globalAlpha = opacity;
    ctx.font = 'bold ' + fontSize + 'px Arial';
    ctx.fillStyle = op.color || '#ffffff';
    ctx.strokeStyle = op.strokeColor || '#000000';
    ctx.lineWidth = Number(op.strokeWidth) || 2;
    const textWidth = ctx.measureText(text).width;
    const padding = 20;
    let x = canvas.width - textWidth - padding;
    let y = canvas.height - padding;
    const position = op.position || 'bottom-right';
    if (position === 'top-left') { x = padding; y = padding + fontSize; }
    else if (position === 'top-right') { x = canvas.width - textWidth - padding; y = padding + fontSize; }
    else if (position === 'bottom-left') { x = padding; }
    else if (position === 'center') { x = (canvas.width - textWidth) / 2; y = canvas.height / 2; }
    if (op.stroke !== false) ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
    ctx.restore();
  }
}

async function edit(data) {
  const image = await decode(data.buffer, data.mime);
  try {
    const operations = Array.isArray(data.operations) ? data.operations : [];
    let width = image.width;
    let height = image.height;
    const quarterTurns = operations.reduce((count, op) => {
      if (op.type !== 'rotate') return count;
      const normalized = ((Number(op.angle) || 0) % 360 + 360) % 360;
      return count + (normalized === 90 || normalized === 270 ? 1 : 0);
    }, 0);
    if (quarterTurns % 2) [width, height] = [height, width];

    const outputType = mimeOf(data.format || 'jpeg');
    let crop = operations.find(op => op.type === 'crop');
    if (crop && Number(crop.width) > 0 && Number(crop.height) > 0 && quarterTurns % 2 === 0) {
      width = Math.max(1, Math.round(Number(crop.width)));
      height = Math.max(1, Math.round(Number(crop.height)));
    }

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d', { alpha: outputType !== 'image/jpeg' });
    if (!ctx) throw new Error('Could not create editor canvas.');
    if (outputType === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }

    if (crop && Number(crop.width) > 0 && Number(crop.height) > 0 && quarterTurns % 2 === 0) {
      const sx = Math.max(0, Math.min(image.width - 1, Number(crop.x) || 0));
      const sy = Math.max(0, Math.min(image.height - 1, Number(crop.y) || 0));
      const sw = Math.max(1, Math.min(image.width - sx, Number(crop.width)));
      const sh = Math.max(1, Math.min(image.height - sy, Number(crop.height)));
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(image, sx, sy, sw, sh, 0, 0, width, height);
      ctx.restore();
    } else {
      drawBase(ctx, image, width, height, operations);
    }

    for (const op of operations) {
      if (op.type === 'round-corners') rounded(ctx, width, height, (Number(op.radius) || 30) / 100 * Math.min(width, height));
    }
    applyOverlays(ctx, canvas, operations);

    const [blob, type] = await encode(canvas, data.format || 'jpeg', data.quality);
    self.postMessage({
      jobId: data.jobId,
      buffer: await blob.arrayBuffer(),
      mime: type,
      width: canvas.width,
      height: canvas.height,
      format: data.format || 'jpeg',
      originalSize: data.origSize || 0,
      editedSize: blob.size
    });
  } finally {
    image.close?.();
  }
}

async function batch(data) {
  const items = Array.isArray(data.items) ? data.items : [];
  const results = [];
  let completed = 0;
  for (let i = 0; i < items.length; i += MAX_CONCURRENT) {
    const chunk = items.slice(i, i + MAX_CONCURRENT);
    const chunkResults = await Promise.all(chunk.map(async item => {
      try {
        const result = await renderBatchItem(item, Array.isArray(item.operations) ? item.operations : [], data.format || item.format || 'jpeg', data.quality ?? item.quality);
        completed++;
        self.postMessage({ jobId: data.jobId, type: 'progress', progress: Math.round(completed / Math.max(1, items.length) * 100) });
        return { success: true, id: item.id, ...result };
      } catch (err) {
        completed++;
        return { success: false, id: item.id, error: err?.message || String(err) };
      }
    }));
    results.push(...chunkResults);
  }
  self.postMessage({ jobId: data.jobId, type: 'complete', results });
}

async function renderBatchItem(item, operations, format, quality) {
  const image = await decode(item.buffer, item.mime);
  try {
    let width = image.width;
    let height = image.height;
    const quarterTurns = operations.reduce((count, op) => {
      if (op.type !== 'rotate') return count;
      const normalized = ((Number(op.angle) || 0) % 360 + 360) % 360;
      return count + (normalized === 90 || normalized === 270 ? 1 : 0);
    }, 0);
    if (quarterTurns % 2) [width, height] = [height, width];
    const type = mimeOf(format || 'jpeg');
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d', { alpha: type !== 'image/jpeg' });
    if (!ctx) throw new Error('Could not create editor canvas.');
    if (type === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height); }
    drawBase(ctx, image, width, height, operations);
    for (const op of operations) if (op.type === 'round-corners') rounded(ctx, width, height, (Number(op.radius) || 30) / 100 * Math.min(width, height));
    applyOverlays(ctx, canvas, operations);
    const [blob] = await encode(canvas, format || 'jpeg', quality);
    return { buffer: await blob.arrayBuffer(), mime: blob.type, width, height, size: blob.size };
  } finally {
    image.close?.();
  }
}
