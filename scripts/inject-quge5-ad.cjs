const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INDEX = path.join(ROOT, 'index.html');
const TAG = '<script src="https://quge5.com/88/tag.min.js" data-zone="277292" async data-cfasync="false"></script>';
const MIN_EXPECTED_BYTES = 50000;

if (!fs.existsSync(INDEX)) throw new Error('index.html not found');

const html = fs.readFileSync(INDEX, 'utf8');
if (Buffer.byteLength(html, 'utf8') < MIN_EXPECTED_BYTES) {
  throw new Error(`Refusing to modify suspiciously small index.html (${Buffer.byteLength(html, 'utf8')} bytes)`);
}

if (!html.includes(TAG)) {
  if (!/<head>\s*/i.test(html)) throw new Error('index.html has no <head> element');
  const updated = html.replace(/<head>\s*/i, match => `${match}${TAG}\n`);
  fs.writeFileSync(INDEX, updated, 'utf8');
}

const finalHtml = fs.readFileSync(INDEX, 'utf8');
if (!finalHtml.includes(TAG)) throw new Error('Quge5 tag injection verification failed');
if (Buffer.byteLength(finalHtml, 'utf8') < MIN_EXPECTED_BYTES) {
  throw new Error('Post-injection index.html safety check failed');
}
console.log('✓ Quge5 ad tag injected safely after <head>');
console.log(`✓ index.html size: ${Buffer.byteLength(finalHtml, 'utf8')} bytes`);
