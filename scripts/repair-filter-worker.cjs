#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const target = path.join(process.cwd(), 'workers', 'filter.worker.js');
const worker = String.raw`/** Pixaroid Editor/Filter Worker v5 — browser Worker safe */
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
async function encode(canvas,format,quality){const type=mimeOf(format);const blob=await canvas.convertToBlob({type,quality:q(quality)});if(!blob)throw new Error('Edit failed - no output');return [blob,type];}
function rounded(ctx,w,h,r){r=Math.max(0,Math.min(r,Math.min(w,h)/2));ctx.beginPath();ctx.moveTo(r,0);ctx.lineTo(w-r,0);ctx.quadraticCurveTo(w,0,w,r);ctx.lineTo(w,h-r);ctx.quadraticCurveTo(w,h,w-r,h);ctx.lineTo(r,h);ctx.quadraticCurveTo(0,h,0,h-r);ctx.lineTo(0,r);ctx.quadraticCurveTo(0,0,r,0);ctx.closePath();ctx.clip();}
function applyOps(ctx,ops,w,h){
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  for(const op of (Array.isArray(ops)?ops:[])){
    const t=op.type;
    if(t==='brightness')ctx.filter='brightness('+(100+(Number(op.value)||0))+'%)';
    else if(t==='contrast')ctx.filter='contrast('+(100+(Number(op.value)||0))+'%)';
    else if(t==='saturation')ctx.filter='saturate('+(100+(Number(op.value)||0))+'%)';
    else if(t==='blur')ctx.filter='blur('+Math.max(0,Number(op.radius)||2)+'px)';
    else if(t==='grayscale')ctx.filter='grayscale(100%)';
    else if(t==='sepia')ctx.filter='sepia('+Math.max(0,Math.min(1,(Number(op.intensity)||80)/100))+')';
    else if(t==='invert')ctx.filter='invert(100%)';
  }
}
function drawBase(ctx,img,w,h,ops){
  const rotations=(ops||[]).filter(o=>o.type==='rotate').reduce((a,o)=>a+(Number(o.angle)||90),0);
  const flipH=(ops||[]).some(o=>o.type==='flip'&&o.horizontal), flipV=(ops||[]).some(o=>o.type==='flip'&&o.vertical);
  ctx.save();
  const rad=rotations*Math.PI/180;ctx.translate(w/2,h/2);ctx.rotate(rad);ctx.scale(flipH?-1:1,flipV?-1:1);
  applyOps(ctx,ops,w,h);
  ctx.drawImage(img,-img.width/2,-img.height/2,img.width,img.height);ctx.restore();
}
function overlays(ctx,canvas,ops){for(const op of (ops||[])){if(op.type!=='watermark'&&op.type!=='text')continue;ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,(Number(op.opacity)??50)/100));ctx.font='bold '+(Number(op.fontSize)||40)+'px Arial';ctx.fillStyle=op.color||'#fff';const text=String(op.text||'© Pixaroid'),tw=ctx.measureText(text).width,p=20;let x=p,y=canvas.height-p;const pos=op.position||'bottom-right';if(pos==='top-left'){x=p;y=p+(Number(op.fontSize)||40)}else if(pos==='top-right'){x=canvas.width-tw-p;y=p+(Number(op.fontSize)||40)}else if(pos==='bottom-left'){x=p}else if(pos==='center'){x=(canvas.width-tw)/2;y=canvas.height/2} else x=canvas.width-tw-p;ctx.fillText(text,x,y);ctx.restore();}}
async function edit(d){
  const img=await decode(d.buffer,d.mime);try{
    let w=img.width,h=img.height;const ops=Array.isArray(d.operations)?d.operations:[];
    const turns=ops.reduce((a,o)=>a+((o.type==='rotate'&&Math.abs((Number(o.angle)||0)%180)===90)?1:0),0);
    if(turns%2){const x=w;w=h;h=x;}
    const canvas=new OffscreenCanvas(w,h),ctx=canvas.getContext('2d',{alpha:mimeOf(d.format||'jpeg')!=='image/jpeg'});if(!ctx)throw new Error('Could not create editor canvas.');
    if(mimeOf(d.format||'jpeg')==='image/jpeg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);}
    drawBase(ctx,img,w,h,ops);overlays(ctx,canvas,ops);
    const [blob,type]=await encode(canvas,d.format||'jpeg',d.quality);
    self.postMessage({jobId:d.jobId,buffer:await blob.arrayBuffer(),mime:type,width:w,height:h,format:d.format||'jpeg',originalSize:d.origSize||0,editedSize:blob.size});
  }finally{img.close?.();}
}
async function batch(d){
  const items=Array.isArray(d.items)?d.items:[],out=[];let done=0;
  for(let i=0;i<items.length;i+=MAX_CONCURRENT){
    const chunk=items.slice(i,i+MAX_CONCURRENT);const rs=await Promise.all(chunk.map(async item=>{try{const r=await edit({jobId:d.jobId+'_item',buffer:item.buffer,mime:item.mime,origSize:item.size,operations:item.operations,format:d.format||item.format,quality:d.quality||item.quality});done++;self.postMessage({jobId:d.jobId,type:'progress',progress:Math.round(done/Math.max(1,items.length)*100)});return {success:true,id:item.id,buffer:r?.buffer};}catch(e){done++;return {success:false,id:item.id,error:e.message};}}));out.push(...rs);}
  self.postMessage({jobId:d.jobId,type:'complete',results:out});
}
`;
fs.writeFileSync(target, worker, 'utf8');
console.log('[Pixaroid] Repaired filter/editor worker:', target);
