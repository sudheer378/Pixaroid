const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TOOLS = path.join(ROOT, 'tools');
const BASE = 'https://pixaroid.vercel.app';
const files = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.isFile() && entry.name === 'index.html') files.push(file);
  }
}
function attr(html, re) { const m = html.match(re); return m ? m[1].replace(/\s+/g, ' ').trim() : ''; }
function canonicalFor(file) {
  const rel = path.relative(TOOLS, file).replace(/\\/g, '/');
  return `${BASE}/tools/${rel.replace(/\/index\.html$/i, '')}/`;
}
function slugFrom(file) { return path.basename(path.dirname(file)); }
function tokens(text) {
  return new Set((text.toLowerCase().match(/[a-z0-9]+/g) || []).filter(t => t.length > 2));
}
function jaccard(a, b) {
  const union = new Set([...a, ...b]);
  let inter = 0; for (const x of a) if (b.has(x)) inter++;
  return union.size ? inter / union.size : 0;
}

walk(TOOLS);
const rows = files.map(file => {
  const html = fs.readFileSync(file, 'utf8');
  const title = attr(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const h1 = attr(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, ' ');
  const description = attr(html, /<meta\s+name=["']description["'][^>]*content=["']([^"']*)["']/i);
  const robots = attr(html, /<meta\s+name=["']robots["'][^>]*content=["']([^"']*)["']/i).toLowerCase();
  const canonical = attr(html, /<link\s+rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
  const text = `${title} ${h1} ${description}`;
  return { file: path.relative(ROOT, file).replace(/\\/g, '/'), slug: slugFrom(file), title, h1, description, robots, canonical, expectedCanonical: canonicalFor(file), tokens: [...tokens(text)] };
});

const clusters = new Map();
for (const row of rows) {
  const key = row.slug.replace(/-(?:\d+|kb|mb|px|x|to|for)$/gi, '').split('-').slice(0, 4).join('-');
  if (!clusters.has(key)) clusters.set(key, []);
  clusters.get(key).push(row);
}

const duplicateTitles = new Map();
for (const r of rows) duplicateTitles.set(r.title, [...(duplicateTitles.get(r.title) || []), r.file]);
const exactTitleGroups = [...duplicateTitles.entries()].filter(([, v]) => v.length > 1);
const nearDuplicates = [];
for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
  const score = jaccard(new Set(rows[i].tokens), new Set(rows[j].tokens));
  if (score >= 0.85 && rows[i].title !== rows[j].title) nearDuplicates.push({ score: Number(score.toFixed(3)), pages: [rows[i].file, rows[j].file], titles: [rows[i].title, rows[j].title] });
}

const report = {
  generatedAt: new Date().toISOString(),
  toolPages: rows.length,
  exactDuplicateTitleGroups: exactTitleGroups.length,
  nearDuplicatePairs: nearDuplicates.length,
  clusters: [...clusters.entries()].filter(([, pages]) => pages.length > 1).map(([cluster, pages]) => ({ cluster, count: pages.length, pages: pages.map(({ file, slug, title }) => ({ file, slug, title })) })).sort((a,b) => b.count-a.count),
  exactDuplicateTitles: exactTitleGroups.map(([title, files]) => ({ title, files })),
  nearDuplicates: nearDuplicates.sort((a,b) => b.score-a.score).slice(0, 500)
};

const out = path.join(ROOT, 'reports');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'duplicate-clusters.json'), JSON.stringify(report, null, 2));
console.log(`Duplicate-cluster audit: ${rows.length} tool pages; ${report.exactDuplicateTitleGroups} exact title groups; ${report.nearDuplicatePairs} near-duplicate pairs`);
console.log(`Multi-page intent clusters: ${report.clusters.length}`);
