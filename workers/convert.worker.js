/* Pixaroid — convert.worker.js v6 — fixed FileReaderSync issue */
'use strict';
var MIME={jpeg:'image/jpeg',jpg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',bmp:'image/bmp',tiff:'image/tiff',tif:'image/tiff',avif:'image/avif'};

self.onmessage=async function(e){
  var d=e.data,jid=d.jobId;
  try{
    var r=await doConvert(d);
    // Send result as blob for maximum compatibility
    self.postMessage({jobId:jid,blob:r.blob,width:r.w,height:r.h,format:r.fmt});
  }
  catch(err){self.postMessage({jobId:jid,error:String(err.message||err)});}
};

async function getBm(buf,mime){
  for(var t of[mime,'image/jpeg','image/png','']){
    try{return await createImageBitmap(t?new Blob([buf],{type:t}):new Blob([buf]));}catch(e){}
  }
  throw new Error('Cannot decode image.');
}
async function doConvert(d){
  var fmt=(d.targetFormat||'jpeg').toLowerCase().replace('jpg','jpeg');
  var mime=MIME[fmt]||'image/jpeg';
  var q=Math.max(1,Math.min(100,parseFloat(d.quality)||90));
  var lossless=d.lossless===true||d.lossless==='true';
  var b=await getBm(d.buffer,d.mime||'image/jpeg');
  var w=b.width,h=b.height,c=new OffscreenCanvas(w,h),ctx=c.getContext('2d');
  if(mime==='image/jpeg'||mime==='image/bmp'){ctx.fillStyle=d.background||'#ffffff';ctx.fillRect(0,0,w,h);}
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(b,0,0);b.close();
  var opts;
  if(mime==='image/png'||mime==='image/gif')opts={type:mime};
  else if(mime==='image/webp')opts={type:mime,quality:lossless?1.0:q/100};
  else opts={type:mime,quality:q/100};
  return{blob:await c.convertToBlob(opts),w,h,fmt};
}
