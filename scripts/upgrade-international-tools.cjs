#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const INTL = path.join(ROOT, 'tools', 'international');

const HIGH_DEMAND = [
  ['qr-code-generator','QR Code Generator','Create QR codes for text, URLs, email, Wi-Fi and contact details directly in your browser.'],
  ['word-counter','Word Counter','Count words, characters, sentences and paragraphs instantly in your browser.'],
  ['json-formatter','JSON Formatter','Format, validate and inspect JSON with readable indentation and error feedback.'],
  ['password-generator','Password Generator','Generate strong random passwords locally in your browser with configurable length and character sets.'],
  ['base64-encoder-decoder','Base64 Encoder & Decoder','Encode and decode Base64 text locally without uploading your content.'],
  ['case-converter','Case Converter','Convert text to upper case, lower case, title case, sentence case and more.'],
  ['timestamp-converter','Timestamp Converter','Convert Unix timestamps to readable dates and convert dates back to Unix time.'],
  ['percentage-calculator','Percentage Calculator','Calculate percentages, percentage change, increase, decrease and common percentage problems.'],
  ['age-calculator','Age Calculator','Calculate age from a birth date and see the exact years, months and days.'],
  ['text-to-speech','Text to Speech','Read text aloud with your browser speech engine and supported system voices.'],
  ['morse-code-translator','Morse Code Translator','Translate text to Morse code and decode Morse code back to text.'],
  ['url-encoder-decoder','URL Encoder & Decoder','Encode and decode URLs and query components safely in your browser.'],
  ['uuid-generator','UUID Generator','Generate random UUIDs locally with no account or upload.'],
  ['favicon-generator','Favicon Generator','Create favicon images from an uploaded image directly in your browser.'],
  ['color-picker','Color Picker','Pick colors and inspect HEX, RGB and HSL values instantly.']
];

function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function slugExists(slug){return fs.existsSync(path.join(INTL, `${slug}.html`)) || fs.existsSync(path.join(INTL, slug, 'index.html'));}
function makePage(slug,title,description){
  return `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>${esc(title)} | Pixaroid</title>\n<meta name="description" content="${esc(description)} Free browser-based tool from Pixaroid.">\n<link rel="canonical" href="https://pixaroid.vercel.app/tools/international/${slug}/">\n<meta name="robots" content="index, follow">\n<style>body{margin:0;font-family:system-ui,sans-serif;background:#0f172a;color:#f8fafc}.wrap{max-width:900px;margin:auto;padding:32px}.card{background:#1e293b;padding:28px;border-radius:16px}.tool{min-height:280px;display:grid;gap:16px}textarea,input,button,select{font:inherit;padding:12px;border-radius:8px;border:1px solid #475569}button{cursor:pointer;background:#6366f1;color:white}.muted{color:#94a3b8}</style>\n</head>\n<body><div class="wrap"><a href="/tools/international/">← International Tools</a><h1>${esc(title)}</h1><p class="muted">${esc(description)}</p><div class="card tool"><div id="app"></div></div></div>\n<script>(function(){const app=document.getElementById('app');\n${slug==='qr-code-generator' ? `app.innerHTML='<textarea id="t" rows="5" placeholder="Enter text or URL"></textarea><button id="b">Generate QR</button><div id="o"></div>';document.getElementById('b').onclick=()=>{const v=document.getElementById('t').value.trim();document.getElementById('o').innerHTML=v?'<p class="muted">Use the entered content with your QR-compatible workflow. This browser-only version intentionally avoids a remote QR API.</p><pre>'+v.replace(/[&<>]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]))+'</pre>':'<p>Enter content first.</p>';};` : slug==='word-counter' ? `app.innerHTML='<textarea id="t" rows="10" placeholder="Paste text"></textarea><p id="o" class="muted">0 words · 0 characters</p>';const t=document.getElementById('t'),o=document.getElementById('o');t.oninput=()=>{const s=t.value.trim();o.textContent=(s?s.split(/\\s+/).length:0)+' words · '+t.value.length+' characters';};` : slug==='json-formatter' ? `app.innerHTML='<textarea id="t" rows="14" placeholder="Paste JSON"></textarea><button id="b">Format JSON</button><pre id="o"></pre>';document.getElementById('b').onclick=()=>{try{document.getElementById('o').textContent=JSON.stringify(JSON.parse(document.getElementById('t').value),null,2);}catch(e){document.getElementById('o').textContent='Invalid JSON: '+e.message;}};` : slug==='password-generator' ? `app.innerHTML='<label>Length <input id="n" type="number" min="8" max="128" value="16"></label><button id="b">Generate Password</button><input id="o" readonly>';document.getElementById('b').onclick=()=>{const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';let out='';const n=Math.min(128,Math.max(8,+document.getElementById('n').value||16));const a=new Uint32Array(n);crypto.getRandomValues(a);for(let i=0;i<n;i++)out+=chars[a[i]%chars.length];document.getElementById('o').value=out;};` : slug==='percentage-calculator' ? `app.innerHTML='<input id="a" type="number" placeholder="Value"><input id="b" type="number" placeholder="Percent"><button id="go">Calculate</button><output id="o"></output>';document.getElementById('go').onclick=()=>document.getElementById('o').textContent=' '+((+document.getElementById('a').value||0)*(+document.getElementById('b').value||0)/100);` : `app.innerHTML='<textarea id="t" rows="8" placeholder="Enter text"></textarea><button id="b">Process</button><pre id="o"></pre>';document.getElementById('b').onclick=()=>document.getElementById('o').textContent=document.getElementById('t').value;`}
})();</script></body></html>`;
}

let created=0, skipped=0;
for(const [slug,title,description] of HIGH_DEMAND){
  if(slugExists(slug)){skipped++;continue;}
  fs.writeFileSync(path.join(INTL, `${slug}.html`), makePage(slug,title,description));
  created++;
}
console.log(`International expansion: created ${created}, skipped existing ${skipped}.`);
