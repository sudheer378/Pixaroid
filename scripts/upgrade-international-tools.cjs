#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const INTL = path.join(ROOT, 'tools', 'international');

// Candidate tools selected from broad utility-demand patterns, not claimed exact monthly volumes.
const TOOLS = [
  ['qr-code-generator','QR Code Generator','Generate QR-code-ready content for URLs, text, Wi-Fi, email and contact details.'],
  ['word-counter','Word Counter','Count words, characters, sentences and paragraphs instantly in your browser.'],
  ['json-formatter','JSON Formatter','Format and validate JSON with readable indentation and syntax error messages.'],
  ['password-generator','Password Generator','Generate random passwords locally with configurable length.'],
  ['base64-encoder-decoder','Base64 Encoder & Decoder','Encode and decode Base64 text in your browser.'],
  ['case-converter','Case Converter','Convert text between uppercase, lowercase, title case and sentence case.'],
  ['timestamp-converter','Timestamp Converter','Convert Unix timestamps to readable dates and vice versa.'],
  ['percentage-calculator','Percentage Calculator','Calculate percentages and common percentage changes instantly.'],
  ['age-calculator','Age Calculator','Calculate calendar age from a birth date.'],
  ['text-to-speech','Text to Speech','Read text aloud using your browser speech engine.'],
  ['morse-code-translator','Morse Code Translator','Encode text as Morse code in the browser.'],
  ['url-encoder-decoder','URL Encoder & Decoder','Encode and decode URI components locally.'],
  ['uuid-generator','UUID Generator','Generate UUIDs locally with the Web Crypto API.'],
  ['color-picker','Color Picker','Pick a color and inspect its HEX value.']
];

function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function make(slug,title,description) {
  let app = '<p class="muted">This tool runs in your browser.</p>', js = '';
  if (slug === 'word-counter') {
    app='<textarea id="t" rows="10" placeholder="Paste text"></textarea><output id="o">0 words · 0 characters</output>';
    js='const t=document.getElementById("t"),o=document.getElementById("o");t.oninput=()=>{const s=t.value.trim();o.value=(s?s.split(/\\s+/).length:0)+" words · "+t.value.length+" characters"};';
  } else if (slug === 'json-formatter') {
    app='<textarea id="t" rows="14" placeholder="Paste JSON"></textarea><button id="b">Format JSON</button><pre id="o"></pre>';
    js='document.getElementById("b").onclick=()=>{try{document.getElementById("o").textContent=JSON.stringify(JSON.parse(document.getElementById("t").value),null,2)}catch(e){document.getElementById("o").textContent="Invalid JSON: "+e.message}};';
  } else if (slug === 'password-generator') {
    app='<label>Length <input id="n" type="number" min="8" max="128" value="16"></label><button id="b">Generate</button><input id="o" readonly>';
    js='document.getElementById("b").onclick=()=>{const c="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";const n=Math.min(128,Math.max(8,+document.getElementById("n").value||16));const a=new Uint32Array(n);crypto.getRandomValues(a);let s="";for(let i=0;i<n;i++)s+=c[a[i]%c.length];document.getElementById("o").value=s};';
  } else if (slug === 'percentage-calculator') {
    app='<input id="a" type="number" placeholder="Value"><input id="p" type="number" placeholder="Percent"><button id="b">Calculate</button><output id="o"></output>';
    js='document.getElementById("b").onclick=()=>document.getElementById("o").value=((+document.getElementById("a").value||0)*(+document.getElementById("p").value||0)/100);';
  } else if (slug === 'base64-encoder-decoder') {
    app='<textarea id="t" rows="8" placeholder="Enter text or Base64"></textarea><button id="e">Encode</button><button id="d">Decode</button><pre id="o"></pre>';
    js='document.getElementById("e").onclick=()=>{try{document.getElementById("o").textContent=btoa(unescape(encodeURIComponent(document.getElementById("t").value)))}catch(e){document.getElementById("o").textContent=e.message}};document.getElementById("d").onclick=()=>{try{document.getElementById("o").textContent=decodeURIComponent(escape(atob(document.getElementById("t").value)))}catch(e){document.getElementById("o").textContent=e.message}};';
  } else if (slug === 'case-converter') {
    app='<textarea id="t" rows="8" placeholder="Enter text"></textarea><button id="u">UPPER</button><button id="l">lower</button><button id="tc">Title</button><pre id="o"></pre>';
    js='const t=document.getElementById("t"),o=document.getElementById("o");document.getElementById("u").onclick=()=>o.textContent=t.value.toUpperCase();document.getElementById("l").onclick=()=>o.textContent=t.value.toLowerCase();document.getElementById("tc").onclick=()=>o.textContent=t.value.toLowerCase().replace(/\\b\\w/g,m=>m.toUpperCase());';
  } else if (slug === 'url-encoder-decoder') {
    app='<textarea id="t" rows="8" placeholder="Enter URL or text"></textarea><button id="e">Encode</button><button id="d">Decode</button><pre id="o"></pre>';
    js='const t=document.getElementById("t"),o=document.getElementById("o");document.getElementById("e").onclick=()=>o.textContent=encodeURIComponent(t.value);document.getElementById("d").onclick=()=>{try{o.textContent=decodeURIComponent(t.value)}catch(e){o.textContent=e.message}};';
  } else if (slug === 'uuid-generator') {
    app='<button id="b">Generate UUID</button><input id="o" readonly>'; js='document.getElementById("b").onclick=()=>document.getElementById("o").value=crypto.randomUUID();';
  } else if (slug === 'timestamp-converter') {
    app='<input id="t" type="number" placeholder="Unix timestamp"><button id="b">Convert</button><pre id="o"></pre>'; js='document.getElementById("b").onclick=()=>document.getElementById("o").textContent=new Date((+document.getElementById("t").value||0)*1000).toString();';
  } else if (slug === 'age-calculator') {
    app='<input id="d" type="date"><button id="b">Calculate</button><output id="o"></output>'; js='document.getElementById("b").onclick=()=>{const d=new Date(document.getElementById("d").value),n=new Date();if(isNaN(d))return;let a=n.getFullYear()-d.getFullYear();if(n<new Date(n.getFullYear(),d.getMonth(),d.getDate()))a--;document.getElementById("o").value=Math.max(0,a)+" years"};';
  } else if (slug === 'text-to-speech') {
    app='<textarea id="t" rows="8" placeholder="Enter text"></textarea><button id="b">Speak</button><button id="s">Stop</button>'; js='document.getElementById("b").onclick=()=>speechSynthesis.speak(new SpeechSynthesisUtterance(document.getElementById("t").value));document.getElementById("s").onclick=()=>speechSynthesis.cancel();';
  } else if (slug === 'morse-code-translator') {
    app='<textarea id="t" rows="8" placeholder="Enter text"></textarea><button id="b">Translate</button><pre id="o"></pre>'; js='const M={A:".-",B:"-...",C:"-.-.",D:"-..",E:".",F:"..-.",G:"--.",H:"....",I:"..",J:".---",K:"-.-",L:".-..",M:"--",N:"-.",O:"---",P:".--.",Q:"--.-",R:".-.",S:"...",T:"-",U:"..-",V:"...-",W:".--",X:"-..-",Y:"-.--",Z:"--.."," ":"/"};document.getElementById("b").onclick=()=>document.getElementById("o").textContent=document.getElementById("t").value.toUpperCase().split("").map(c=>M[c]||c).join(" ");';
  } else if (slug === 'color-picker') {
    app='<input id="c" type="color" value="#6366f1"><input id="o" readonly value="#6366f1">'; js='document.getElementById("c").oninput=()=>document.getElementById("o").value=document.getElementById("c").value;';
  } else if (slug === 'qr-code-generator') {
    app='<input id="t" placeholder="Enter URL or text"><button id="b">Prepare QR content</button><pre id="o"></pre>'; js='document.getElementById("b").onclick=()=>document.getElementById("o").textContent=document.getElementById("t").value.trim()||"Enter content first";';
  }
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | Pixaroid</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="https://pixaroid.vercel.app/tools/international/${slug}/"><meta name="robots" content="index, follow"><style>body{margin:0;font-family:system-ui,sans-serif;background:#0f172a;color:#f8fafc}.wrap{max-width:900px;margin:auto;padding:32px}.card{background:#1e293b;padding:24px;border-radius:16px;display:grid;gap:14px}textarea,input,button,output,pre{font:inherit;padding:12px;border-radius:8px;border:1px solid #475569;box-sizing:border-box;width:100%;background:#111827;color:#f8fafc}button{background:#6366f1;cursor:pointer}.muted{color:#94a3b8}a{color:#a5b4fc}</style></head><body><div class="wrap"><a href="/tools/international/">← International Tools</a><h1>${esc(title)}</h1><p class="muted">${esc(description)}</p><div class="card">${app}</div></div><script>${js}</script></body></html>`;
}

let created=0;
for (const [slug,title,description] of TOOLS) {
  const file=path.join(INTL,`${slug}.html`);
  if (fs.existsSync(file)) continue;
  fs.writeFileSync(file,make(slug,title,description));
  created++;
}
console.log(`Created ${created} new international utility pages.`);
