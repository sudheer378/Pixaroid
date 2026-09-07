const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TOOLS = path.join(ROOT, 'tools');
const BASE = 'https://pixaroid.vercel.app';
const files = [];

function walk(dir) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) walk(p);
    else if (name.isFile() && name.name === 'index.html') files.push(p);
  }
}

function attr(html, re) {
  const m = html.match(re);
  return m ? m[1].trim() : '';
}

function canonicalFor(file) {
  const rel = path.relative(TOOLS, file).replace(/\\/g, '/');
  const dir = rel.replace(/\/index\.html$/i, '');
  return `${BASE}/tools/${dir}/`;
}

walk(TOOLS);
const issues = [];
const rows = [];
const seenTitles = new Map();
const seenCanonicals = new Map();

for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const expected = canonicalFor(file);
  const title = attr(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = attr(html, /<meta\s+name=["']description["'][^>]*content=["']([^"']*)["']/i);
  const robots = attr(html, /<meta\s+name=["']robots["'][^>]*content=["']([^"']*)["']/i).toLowerCase();
  const canonical = attr(html, /<link\s+rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
  const h1 = (html.match(/<h1\b/gi) || []).length;
  const schema = /<script\s+type=["']application\/ld\+json["']/i.test(html);
  const body = attr(html, /<body[^>]*>([\s\S]*?)<\/body>/i)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  const words = (body.match(/\b[\p{L}\p{N}][\p{L}\p{N}'’-]*\b/gu) || []).length;

  rows.push({ file: rel, title, description, robots, canonical, expectedCanonical: expected, h1, schema, words });
  if (/noindex/i.test(robots)) issues.push({ severity: 'HIGH', type: 'noindex', file: rel });
  if (!canonical) issues.push({ severity: 'HIGH', type: 'missing-canonical', file: rel });
  else if (canonical !== expected) issues.push({ severity: 'HIGH', type: 'canonical-mismatch', file: rel, canonical, expected });
  if (!title) issues.push({ severity: 'MEDIUM', type: 'missing-title', file: rel });
  if (!description) issues.push({ severity: 'MEDIUM', type: 'missing-description', file: rel });
  if (h1 !== 1) issues.push({ severity: 'MEDIUM', type: 'h1-count', file: rel, count: h1 });
  if (!schema) issues.push({ severity: 'LOW', type: 'missing-schema', file: rel });
  if (words < 180) issues.push({ severity: 'LOW', type: 'thin-content', file: rel, words });
  if (title) seenTitles.set(title, [...(seenTitles.get(title) || []), rel]);
  if (canonical) seenCanonicals.set(canonical, [...(seenCanonicals.get(canonical) || []), rel]);
}

for (const [title, pageFiles] of seenTitles) if (pageFiles.length > 1) issues.push({ severity: 'MEDIUM', type: 'duplicate-title', title, files: pageFiles });
for (const [canonical, pageFiles] of seenCanonicals) if (pageFiles.length > 1) issues.push({ severity: 'HIGH', type: 'duplicate-canonical', canonical, files: pageFiles });

const report = {
  generatedAt: new Date().toISOString(),
  toolPages: rows.length,
  issues: issues.length,
  bySeverity: ['HIGH', 'MEDIUM', 'LOW'].reduce((a, s) => (a[s] = issues.filter(i => i.severity === s).length, a), {}),
  checks: ['noindex', 'missing/mismatched canonical', 'missing title/description', 'H1 count', 'structured data', 'thin content', 'duplicate titles', 'duplicate canonicals'],
  issues
};

const outDir = path.join(ROOT, 'reports');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'indexability-audit.json'), JSON.stringify(report, null, 2));
console.log(`Indexability audit: ${rows.length} tool pages; ${issues.length} issues`);
console.log(JSON.stringify(report.bySeverity));
if (issues.some(i => i.severity === 'HIGH')) process.exitCode = 1;
