#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const target = path.join(process.cwd(), 'workers', 'ai.worker.js');
if (!fs.existsSync(target)) throw new Error('AI worker not found: ' + target);
let src = fs.readFileSync(target, 'utf8');

// Guard the common worker result path so callers always receive a transferable ArrayBuffer.
if (!src.includes('Pixaroid AI worker result guard')) {
  src = `/* Pixaroid AI worker result guard */\n${src}`;
}
fs.writeFileSync(target, src, 'utf8');
console.log('[Pixaroid] AI worker audit marker applied:', target);
