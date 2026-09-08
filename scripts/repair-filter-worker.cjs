#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const target = path.join(process.cwd(), 'workers', 'filter.worker.js');
const worker = String.raw`/** Pixaroid Editor/Filter Worker v6 — browser Worker safe */
'use strict';

const MAX_CONCURRENT = 4;
self.onmessage = async (e) => {
  const d=e.data||{};
  try {
    if(d.op==='edit') return await edit(d);
    if(d.op==='edit-batch') return await batch(d);
    throw new Error('Unknown operation: '+d.op);
  } catch(err) { self.postMessage({jobId:d.jobId,error:err?.message||String(err)}); }
};

function assertSupport(){
  if(typeof OffscreenCanvas==='undefined'||typeof createImageBitmap==='undefined')
    throw new Error('This browser does not support local image editing (OffscreenCanvas/createImageBitmap required).');
}
async function decode(buffer,mime){ assertSupport(); return createImageBitmap(new Blob([buffer],{type:mime||'application/octet-stream'})); }
function mimeOf(f){f=String(f||'').toLowerCase();return f==='png'?'image/png':f==='webp'?'image/webp':f==='avif'?'image/avif':'image/jpeg';}
function q(v){return Math.max(.1,Math.min(1,(Number(v)||90)/100));}
async function encode(canvas,format,quality){const type=mimeOf(format);const blob=await canvas.convertToBlob({type,quality:type==='image/png'?undefined:q(quality)});if(!blob)throw new Error('Edit failed - no output');return [blob,type];}
function rounded(ctx,w,h,r){r=Math.max(0,Math.min(r,Math.min(w,h)/2));ctx.beginPath();ctx.moveTo(r,0);ctx.lineTo(w-r,0);ctx.quadraticCurveTo(w,0,w,r);ctx.lineTo(w,h-r);ctx.quadraticCurveTo(w,h,w-r,h);ctx.lineTo(r,h);ctx.quadraticCurveTo(0,h,0,h-r);ctx.lineTo(0,r);ctx.quadraticCurveTo(0,0,r,0);ctx.closePath();ctx.clip();}
function applyOps(ctx,ops){
  const filters=[];
  for(const op of (Array.isArray(ops)?ops:[])){
    const t=op.type;
    if(t==='brightness')filters.push('brightness('+(100+(Number(op.value)||0))+'%)');
    else if(t==='contrast')filters.push('contrast('+(100+(Number(op.value)||0))+'%)');
    else if(t==='saturation')filters.push('saturate('+(100+(Number(op.value)||0))+'%)');
    else if(t==='blur')filters.push('blur('+Math.max(0,Number(op.radius)||2)+'px)');
    else if(t==='grayscale')filters.push('grayscale(100%)');
    else if(t==='sepia')filters.push('sepia('+Math.max(0,Math.min(1,(Number(op.intensity)||80)/100))+')');
    else if(t==='invert')filters.push('invert(100%)');
  }
  ctx.filter=filters.length?filters.join(' '):'none';
}
function rotationInfo(ops){let angle=0;for(const op of (ops||[]))if(op.type==='rotate')angle+=Number(op.angle)||90;angle=((angle%360)+360)%360;return angle;}
function dimensions(ops,img){let w=img.width,h=img.height;const angle=rotationInfo(ops);if(angle===90||angle===270){const x=w;w=h;h=x;}const crop=(ops||[]).find(o=>o.type==='crop'&&Number(o.width)>0&&Number(o.height)>0);if(crop){w=Math.max(1,Math.round(Number(crop.width)));h=Math.max(1,Math.round(Number(crop.height)));}return {w,h,crop,angle};}
function draw(ctx,img,w,h,ops,crop){
  const angle=rotationInfo(ops),rad=angle*Math.PI/180;
  const flipH=(ops||[]).some(o=>o.type==='flip'&&o.horizontal),flipV=(ops||[]).some(o=>o.type==='flip'&&o.vertical);
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.translate(w/2,h/2);ctx.rotate(rad);ctx.scale(flipH?-1:1,flipV?-1:1);applyOps(ctx,ops);
  if(crop){const sx=Math.max(0,Math.min(img.width-1,Number(crop.x)||0));const sy=Math.max(0,Math.min(img.height-1,Number(crop.y)||0));const sw=Math.max(1,Math.min(img.width-sx,Number(crop.width)));const sh=Math.max(1,Math.min(img.height-sy,Number(crop.height)));ctx.drawImage(img,sx,sy,sw,sh,-w/2,-h/2,w,h);}else ctx.drawImage(img,-img.width/2,-img.height/2,img.width,img.height);
  ctx.restore();ctx.filter='none';
}
function overlays(ctx,canvas,ops){for(const op of (ops||[])){if(op.type!=='watermark'&&op.type!=='text')continue;ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,(Number(op.opacity)??50)/100));const fs=Number(op.fontSize)||40;ctx.font='bold '+fs+'px Arial';ctx.fillStyle=op.color||'#fff';ctx.strokeStyle=op.strokeColor||'#000';ctx.lineWidth=Number(op.strokeWidth)||2;const text=String(op.text||'© Pixaroid'),tw=ctx.measureText(text).width,p=20;let x=canvas.width-tw-p,y=canvas.height-p;const pos=op.position||'bottom-right';if(pos==='top-left'){x=p;y=p+fs}else if(pos==='top-right'){x=canvas.width-tw-p;y=p+fs}else if(pos==='bottom-left'){x=p}else if(pos==='center'){x=(canvas.width-tw)/2;y=canvas.height/2}if(op.stroke!==false)ctx.strokeText(text,x,y);ctx.fillText(text,x,y);ctx.restore();}}
async function renderOne(d){const img=await decode(d.buffer,d.mime);try{const ops=Array.isArray(d.operations)?d.operations:[];const {w,h,crop}=dimensions(ops,img);const format=d.format||'jpeg';const type=mimeOf(format);const canvas=new OffscreenCanvas(w,h),ctx=canvas.getContext('2d',{alpha:type!=='image/jpeg'});if(!ctx)throw new Error('Could not create editor canvas.');if(type==='image/jpeg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);}draw(ctx,img,w,h,ops,crop);for(const op of ops)if(op.type==='round-corners')rounded(ctx,w,h,(Number(op.radius)||30)/100*Math.min(w,h));overlays(ctx,canvas,ops);const [blob,outType]=await encode(canvas,format,d.quality);return {blob,buffer:await blob.arrayBuffer(),mime:outType,width:w,height:h,format,size:blob.size};}finally{img.close?.();}}
async function edit(d){const r=await renderOne(d);self.postMessage({jobId:d.jobId,blob:r.blob,buffer:r.buffer,mime:r.mime,width:r.width,height:r.height,format:r.format,originalSize:Number(d.origSize)||0,editedSize:r.size});}
async function batch(d){const items=Array.isArray(d.items)?d.items:[],out=[];let done=0;for(let i=0;i<items.length;i+=MAX_CONCURRENT){const chunk=items.slice(i,i+MAX_CONCURRENT);const rs=await Promise.all(chunk.map(async item=>{try{const r=await renderOne({buffer:item.buffer,mime:item.mime,operations:item.operations,format:d.format||item.format,quality:d.quality??item.quality});done++;self.postMessage({jobId:d.jobId,type:'progress',progress:Math.round(done/Math.max(1,items.length)*100)});return {success:true,id:item.id,blob:r.blob,buffer:r.buffer,mime:r.mime,width:r.width,height:r.height,size:r.size};}catch(e){done++;return {success:false,id:item.id,error:e?.message||String(e)};} }));out.push(...rs);}self.postMessage({jobId:d.jobId,type:'complete',results:out});}
`;
fs.writeFileSync(target, worker, 'utf8');
console.log('[Pixaroid] Repaired filter/editor worker:', target);
