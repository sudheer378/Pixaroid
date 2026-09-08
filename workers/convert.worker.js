/** Pixaroid Convert Worker v4 - browser-safe conversion */
'use strict';
const MIME={jpeg:'image/jpeg',jpg:'image/jpeg',png:'image/png',webp:'image/webp',avif:'image/avif',bmp:'image/bmp'};
const DEFAULT_Q={jpeg:.90,jpg:.90,webp:.85,avif:.75};

self.onmessage=async e=>{
 const d=e.data||{};
 try{
  if(d.op==='convert'||d.op==='convert-advanced') self.postMessage({jobId:d.jobId,...await convert(d)},[]);
  else if(d.op==='convert-batch') await batch(d);
  else throw Error('Unknown conversion operation: '+d.op);
 }catch(err){self.postMessage({jobId:d.jobId,error:err.message||String(err)});}
};

async function convert(d){
 if(typeof createImageBitmap!=='function'||typeof OffscreenCanvas==='undefined') throw Error('Image conversion requires a current browser with Web Worker image support.');
 const target=String(d.targetFormat||'jpeg').toLowerCase();
 const mime=MIME[target]||'image/jpeg';
 const bitmap=await createImageBitmap(new Blob([d.buffer],{type:d.mime||'application/octet-stream'}));
 try{
  let w=bitmap.width,h=bitmap.height;
  const scale=Number(d.scale);
  if(Number.isFinite(scale)&&scale>0&&scale!==1){w=Math.max(1,Math.round(w*scale));h=Math.max(1,Math.round(h*scale));}
  const max=Number(d.maxDimension);
  if(Number.isFinite(max)&&max>0&&Math.max(w,h)>max){const r=max/Math.max(w,h);w=Math.max(1,Math.round(w*r));h=Math.max(1,Math.round(h*r));}
  const canvas=new OffscreenCanvas(w,h),ctx=canvas.getContext('2d',{alpha:mime!=='image/jpeg'});
  if(!ctx) throw Error('Unable to create conversion canvas.');
  if(mime==='image/jpeg'){ctx.fillStyle=d.background||'#fff';ctx.fillRect(0,0,w,h);}
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(bitmap,0,0,w,h);
  const q=(d.lossless||target==='png'||target==='bmp')?undefined:Math.max(.05,Math.min(1,d.quality==null?(DEFAULT_Q[target]??.9):Number(d.quality)/100));
  const blob=await canvas.convertToBlob({type:mime,...(q===undefined?{}:{quality:q})});
  const buffer=await blob.arrayBuffer();
  return {buffer,mime:blob.type||mime,width:w,height:h,format:target==='jpg'?'jpeg':target,originalSize:Number(d.origSize)||d.buffer.byteLength,convertedSize:blob.size,savings:Number(d.origSize)>0?Math.round((1-blob.size/d.origSize)*100):0,advanced:d.op==='convert-advanced'};
 }finally{bitmap.close();}
}

async function batch(d){
 const files=Array.isArray(d.files)?d.files:[],o=d.options||{},results=[];
 for(let i=0;i<files.length;i++){
  const f=files[i];try{const b=f.arrayBuffer?await f.arrayBuffer():await read(f);results.push({name:f.name,success:true,...await convert({buffer:b,mime:f.type,origSize:f.size,targetFormat:o.targetFormat||'jpeg',quality:o.quality,background:o.background,lossless:o.lossless})});}
  catch(err){results.push({name:f?.name||('file-'+i),success:false,error:err.message});}
  self.postMessage({jobId:d.jobId,type:'progress',percent:Math.round((i+1)/Math.max(1,files.length)*100),current:f?.name||'',total:files.length});
 }
 self.postMessage({jobId:d.jobId,type:'batch-complete',results,stats:{total:results.length,successful:results.filter(x=>x.success).length,failed:results.filter(x=>!x.success).length}});
}
function read(f){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(Error('Failed to read file'));r.readAsArrayBuffer(f);});}
