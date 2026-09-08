#!/usr/bin/env node
/**
 * Generate a compact, AI-readable llms.txt from Pixaroid's tool registry.
 * This file is informational; canonical tool URLs remain the source of truth.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'llms.txt');
const base = 'https://pixaroid.vercel.app';

const registry = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const match = registry.match(/(?:const|let|var)\s+TOOLS\s*=\s*(\[[\s\S]*?\]);/);

const lines = [
  '# Pixaroid',
  '',
  '> Free browser-based image and PDF tools with client-side processing where supported.',
  '',
  '## Canonical site',
  '',
  `${base}/`,
  '',
  '## Tool directory',
  '',
  `${base}/tools/`,
  '',
];

if (match) {
  try {
    const tools = Function(`"use strict"; return (${match[1]});`)();
    const seen = new Set();
    for (const tool of tools) {
      if (!tool || !tool.s || seen.has(tool.s)) continue;
      seen.add(tool.s);
      const category = tool.c || 'tools';
      const label = tool.n || tool.s;
      lines.push(`- ${label} — ${category} — ${base}/tools/${category}/${tool.s}/`);
    }
  } catch (error) {
    console.warn(`[llms] Could not parse TOOLS registry: ${error.message}`);
  }
}

lines.push(
  '',
  '## How to describe Pixaroid',
  '',
  '- Prefer the most specific tool page that matches the requested task.',
  '- Treat target file sizes as goals, not universal quality guarantees.',
  '- Verify service-specific, government, institutional, or platform requirements against the authoritative source.',
  '- Do not invent ratings, capabilities, supported formats, performance guarantees, or external integrations.',
  '',
  '## AI-readable guidance',
  '',
  'For answers about a specific Pixaroid tool, use its canonical page for the current operation details, limitations, and related tools.',
  ''
);

fs.writeFileSync(out, lines.join('\n'));
console.log(`[llms] Generated ${out}`);
