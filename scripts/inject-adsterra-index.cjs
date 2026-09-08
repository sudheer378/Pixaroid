#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'index.html');
const TAG = '<script src="https://pl31242995.profitableratecpmnetwork.com/22/1e/c1/221ec1daebb5a9cce2d28b5964f3249b.js"></script>';
const START = '<!-- PIXAROID_ADSTERRA_START -->';
const END = '<!-- PIXAROID_ADSTERRA_END -->';

if (!fs.existsSync(file)) throw new Error('index.html not found');

let html = fs.readFileSync(file, 'utf8');
if (!/<body\b[^>]*>/i.test(html)) throw new Error('index.html has no body element');

while (true) {
  const start = html.indexOf(START);
  if (start === -1) break;
  const end = html.indexOf(END, start);
  if (end === -1) throw new Error('Incomplete Adsterra marker block in index.html');
  html = html.slice(0, start) + html.slice(end + END.length);
}

html = html.split(TAG).join('');
const block = `\n${START}\n${TAG}\n${END}\n`;
html = html.replace(/(<body\b[^>]*>)/i, `$1${block}`);
fs.writeFileSync(file, html, 'utf8');
console.log('✓ Adsterra script installed once on index.html');
