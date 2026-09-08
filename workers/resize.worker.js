/** Pixaroid Resize Worker v4 — browser Worker safe */
'use strict';

const MAX_CONCURRENT = 4;

self.onmessage = async function(e) {
  const d = e.data || {}, jobId = d.jobId;
  try {
    if (d.op === 'resize') return await resizeImage(d);
    if (d.op === 'crop') return await cropImage(d);
    if (d.op === 'get-dimensions') return await getDimensions(d);
    if (d.op === 'resize-batch') return await resizeBatch(d);
    throw new Error('Unknown operation: ' + d.op);
  } catch (err) {
    self.postMessage({jobId, error: err && err.message ? err.message : String(err)});
  }
};

function requireCanvas() {
  if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') {
    throw new Error('This browser does not support local image resizing (OffscreenCanvas/createImageBitmap required).');
  }
}

async function decode(buffer, mime) {
  requireCanvas();
  const blob = new Blob([buffer], {type: mime || 'application/octet-stream'});
  return await createImageBitmap(blob);
}

function outputMime(format) {
  const f = String(format || 'jpeg').toLowerCase();
  if (f === 'png') return 'image/png';
  if (f === 'webp') return 'image/webp';
  if (f === 'avif') return 'image/avif';
  return 'image/jpeg';
}

function qualityValue(q) { return Math.max(0.1, Math.min(1, (Number(q) || 90) / 100)); }

async function blobBuffer(blob) { return await blob.arrayBuffer(); }

async function encode(canvas, format, quality) {
  const type = outputMime(format);
  const blob = await canvas.convertToBlob({type, quality: qualityValue(quality)});
  if (!blob) throw new Error('Could not encode resized image.');
  return {blob, type};
}

function dimensions(d, iw, ih) {
  let w = iw, h = ih;
  if (Number(d.percent) > 0) {
    const s = Number(d.percent) / 100; w = Math.max(1, Math.round(iw*s)); h = Math.max(1, Math.round(ih*s));
  } else if (d.preset) {
    const p = {
      'instagram-square':[1080,1080], 'instagram-portrait':[1080,1350], 'instagram-landscape':[1080,566],
      'facebook-post':[1200,630], 'twitter-post':[1200,675], 'youtube-thumbnail':[1280,720],
      'linkedin-post':[1200,627], 'tiktok':[1080,1920], 'pinterest':[1000,1500]
    }[d.preset];
    if (p) [w,h] = p;
  } else if (Number(d.width) > 0 || Number(d.height) > 0) {
    const lock = d.lockAspect !== false;
    if (lock) {
      const sx = Number(d.width) > 0 ? Number(d.width)/iw : Infinity;
      const sy = Number(d.height) > 0 ? Number(d.height)/ih : Infinity;
      const s = Math.min(sx, sy);
      if (Number.isFinite(s)) { w=Math.max(1,Math.round(iw*s)); h=Math.max(1,Math.round(ih*s)); }
    } else { w=Math.max(1,Number(d.width)||iw); h=Math.max(1,Number(d.height)||ih); }
  }
  return [w,h];
}

function fillJpeg(ctx, w, h) { ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h); }

async function resizeImage(d) {
  const img = await decode(d.buffer, d.mime);
  try {
    const [w,h] = dimensions(d, img.width, img.height);
    const canvas = new OffscreenCanvas(w,h);
    const ctx = canvas.getContext('2d', {alpha: outputMime(d.format) !== 'image/jpeg'});
    if (!ctx) throw new Error('Could not create resize canvas.');
    if (outputMime(d.format) === 'image/jpeg') fillJpeg(ctx,w,h);
    ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
    if (d.fit === 'cover' || d.fit === 'contain') {
      const scale = d.fit === 'cover' ? Math.max(w/img.width,h/img.height) : Math.min(w/img.width,h/img.height);
      const dw=img.width*scale, dh=img.height*scale;
      ctx.drawImage(img,(w-dw)/2,(h-dh)/2,dw,dh);
    } else ctx.drawImage(img,0,0,w,h);
    const out = await encode(canvas,d.format,d.quality);
    self.postMessage({jobId:d.jobId,buffer:await blobBuffer(out.blob),mime:out.type,width:w,height:h,format:d.format||'jpeg',originalSize:d.origSize||0,resizedSize:out.blob.size,savings:d.origSize>0?Math.round((1-out.blob.size/d.origSize)*100):0});
  } finally { img.close && img.close(); }
}

async function cropImage(d) {
  const img=await decode(d.buffer,d.mime);
  try {
    const x=Math.max(0,Math.min(Number(d.x)||0,img.width-1)), y=Math.max(0,Math.min(Number(d.y)||0,img.height-1));
    const w=Math.max(1,Math.min(Number(d.width)||img.width,img.width-x)), h=Math.max(1,Math.min(Number(d.height)||img.height,img.height-y));
    const canvas=new OffscreenCanvas(w,h), ctx=canvas.getContext('2d',{alpha:outputMime(d.format)!=='image/jpeg'});
    if(!ctx) throw new Error('Could not create crop canvas.');
    if(outputMime(d.format)==='image/jpeg') fillJpeg(ctx,w,h);
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(img,x,y,w,h,0,0,w,h);
    const out=await encode(canvas,d.format||'png',d.quality);
    self.postMessage({jobId:d.jobId,buffer:await blobBuffer(out.blob),mime:out.type,width:w,height:h,format:d.format||'png',originalSize:d.origSize||0,croppedSize:out.blob.size});
  } finally { img.close && img.close(); }
}

async function getDimensions(d) {
  const img=await decode(d.buffer,d.mime);
  try { self.postMessage({jobId:d.jobId,width:img.width,height:img.height,aspectRatio:(img.width/img.height).toFixed(4)}); }
  finally { img.close && img.close(); }
}

async function resizeBatch(d) {
  const files=Array.isArray(d.files)?d.files:[], options=d.options||{};
  const results=[];
  for(let i=0;i<files.length;i+=MAX_CONCURRENT){
    const chunk=files.slice(i,i+MAX_CONCURRENT);
    const rs=await Promise.all(chunk.map(async (file,j)=>{
      try {
        const buffer=file.buffer || file.data;
        const temp={jobId:d.jobId+'_'+(i+j),buffer,mime:file.type||file.mime,origSize:file.size||0,...options};
        const img=await decode(temp.buffer,temp.mime);
        const [w,h]=dimensions(temp,img.width,img.height); img.close&&img.close();
        const canvas=new OffscreenCanvas(w,h),ctx=canvas.getContext('2d',{alpha:outputMime(temp.format)!=='image/jpeg'});
        if(outputMime(temp.format)==='image/jpeg') fillJpeg(ctx,w,h);
        ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(await decode(temp.buffer,temp.mime),0,0,w,h);
        const out=await encode(canvas,temp.format||'jpeg',temp.quality); results.push({name:file.name,buffer:await blobBuffer(out.blob),mime:out.type,width:w,height:h,size:out.blob.size});
        return true;
      } catch(e){results.push({name:file.name,error:e.message});return false;}
    }));
    self.postMessage({jobId:d.jobId,type:'progress',percent:Math.round(Math.min(i+chunk.length,files.length)/Math.max(1,files.length)*100),processed:Math.min(i+chunk.length,files.length),total:files.length});
  }
  self.postMessage({jobId:d.jobId,type:'batch-complete',results,successCount:results.filter(r=>!r.error).length,errorCount:results.filter(r=>r.error).length});
}
