#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const ENGINE = path.join(ROOT, 'js', 'pages', 'tool-engine.js');
const MARKER = '/* PIXAROID HEIC FORMAT REPAIR v1 */';

if (!fs.existsSync(ENGINE)) throw new Error('tool-engine.js not found');
let src = fs.readFileSync(ENGINE, 'utf8');
if (src.includes(MARKER)) {
  console.log('✓ HEIC repair already present');
  process.exit(0);
}

const needle = "  if(itype==='convert'||itype==='convert-multi'||itype==='convert-pdf'){";
if (!src.includes(needle)) throw new Error('Conversion router anchor not found; refusing unsafe rewrite');

const helper = `
  ${MARKER}
  async function convertHeicBrowser(file, ctrl){
    if(!window.HeicTo){
      await new Promise(function(resolve,reject){
        var s=document.createElement('script');
        s.src='https://cdn.jsdelivr.net/npm/heic-to@1.5.2/dist/iife/heic-to.js';
        s.onload=resolve;
        s.onerror=function(){reject(new Error('HEIC decoder could not be loaded. Check your connection and try again.'));};
        document.head.appendChild(s);
      });
    }
    if(!window.HeicTo) throw new Error('HEIC decoder unavailable');
    var target=String((ctrl&&ctrl.format)|| (ctrl&&ctrl.targetFormat)||'jpeg').toLowerCase().replace('jpg','jpeg');
    if(target==='gif') throw new Error('HEIC to GIF is not supported by the browser HEIC decoder. Use HEIC to JPG or PNG.');
    if(!['jpeg','png','webp'].includes(target)) throw new Error('HEIC output '+target.toUpperCase()+' is not supported by this local HEIC decoder.');
    var quality=clamp(ctrl&&ctrl.quality||90,1,100)/100;
    var decoded=await window.HeicTo({blob:file,type:'bitmap'});
    var canvas=document.createElement('canvas');
    canvas.width=decoded.width; canvas.height=decoded.height;
    var ctx=canvas.getContext('2d',{alpha:target!=='jpeg'});
    if(!ctx) throw new Error('Canvas conversion is unavailable in this browser.');
    if(target==='jpeg'){ctx.fillStyle=(ctrl&&ctrl.background)||'#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);}
    ctx.drawImage(decoded,0,0);
    if(decoded.close) decoded.close();
    var mime=target==='jpeg'?'image/jpeg':target==='png'?'image/png':'image/webp';
    var blob=await new Promise(function(resolve,reject){canvas.toBlob(function(b){b?resolve(b):reject(new Error('HEIC output encoding failed'));},mime,quality);});
    return {blob:blob,w:canvas.width,h:canvas.height,fmt:target};
  }
`;

src = src.replace(needle, helper + `\n${needle}\n    var isHeic=/\\.(heic|heif)$/i.test(file.name||'') || /^image\\/hei(c|f)$/i.test(mime);\n    if(isHeic && (itype==='convert'||itype==='convert-multi'||itype==='convert-pdf')) return convertHeicBrowser(file,ctrl);`);

fs.writeFileSync(ENGINE, src, 'utf8');
console.log('✓ HEIC/HEIF conversion now uses a dedicated browser WASM decoder');
console.log('✓ HEIC output is limited to verified JPEG/PNG/WebP paths');
console.log('✓ Unsupported HEIC targets fail clearly instead of silently producing the wrong format');
