# PIXAROID Pre-Launch Audit — Qwen (Continued & Completed Static Verification)

**Audited Git SHA:** `0426fbe6a3111046520ae0b617c6ebf85f2ef9df` (branch main, working tree clean at audit start; this report file is the only addition).

## Executive Summary
Audit executed against actual repository code. Deployment model verified deterministic/static. New confirmed defects found in this pass supersede/refine prior partial findings (notably: the earlier "broken international routes" claim was **incorrect** — Vercel rewrites resolve to existing files; and the earlier "duplicate engine binding" claim was **partially incorrect** — `enhanced-engine.js` is a delegation adapter, not a second engine). Runtime browser execution, live HTTP smoke tests, and full CSS/a11y passes remain UNVERIFIED.

**Verdict: NOT READY.** Blockers listed at end.

## Deployment Model (verified)
- `vercel.json`: framework null, buildCommand `npm run build` → no-op echo (package.json), installCommand null, outputDirectory ".". Deterministic, non-mutating. ✔
- `.vercelignore` excludes node_modules/dist/tests/build/.git/logs. ✔
- No competing build pipeline; `scripts/generate-tools-data.cjs` is referenced by NO workflow or build step (only mentioned in old audit doc). KEEP as manual dev tool or ARCHIVE.

## Confirmed Bugs (this pass)

### P1-1 International tools category fully orphaned from discovery/SEO
- 15 tool pages exist under `tools/international/*/index.html`.
- Evidence: none of the 15 appear in `sitemap-tools.xml` (only `/tools/international/` hub does), none appear in `tools-data.json` (0 matches for "international"), therefore not rendered in homepage/tools-grid JS-driven listings.
- Impact: 15 production pages unreachable via sitemap and registry-driven navigation; indexation depends solely on hub-page links. Canonicals on these pages point to themselves (`.../currency-converter/`) so they are indexable but orphan-ish.
- Fix: add 15 entries to tools-data.json + 15 `<url>` blocks to sitemap-tools.xml.

### P1-2 Monetag ad network live on all 562 HTML pages while ads.txt claims no ads
- Evidence: `quge5.com/88/tag.min.js` inline in every page (grep count 558–562); `sw.js` line 1–7 installs Monetag push worker (`importScripts('https://5gvci.com/act/files/service-worker.min.js')`); `js/modules/monetization.js` injects `sordidcopper.com` smartlinks; sponsored links hardcoded even into `privacy-policy.html` (line 236) and `cookie-policy.html` (line 332).
- Contradiction: `ads.txt` line 28 "Pixaroid does not currently serve ads"; placeholder `pub-XXXXXXXXXXXXXXXX` in ads.txt.
- Impact: privacy/compliance mismatch (third-party tracking + push notifications likely contradicting privacy policy text); ads.txt invalid; AEO/trust risk. Also two different Monetag zones (277292 web tag vs zoneId 11742921 SW).
- Decision required before launch: either declare monetization active (update ads.txt with real seller entries + disclose in privacy/cookie policy) or remove Monetag entirely.

### P2-1 Canonical ↔ sitemap extension conflict on policy pages
- Evidence: `sitemap.xml` lists `/about.html`, `/contact.html`, `/faq.html`, `/privacy-policy.html`, `/terms-of-service.html`, `/disclaimer.html`, `/cookie-policy.html`; canonicals are mixed: about/contact/faq use `.html`; privacy/terms/disclaimer/cookie use extensionless. With `cleanUrls:true` both URLs serve the same content → duplicate URL space and self-inconsistent canonical signals.
- Fix: pick one scheme (extensionless recommended given trailingSlash+cleanUrls) and align sitemap.xml + all canonicals.

### P2-2 Guides section omitted from sitemaps
- Evidence: 17 guide pages on disk (`guides/*.html`); `sitemap.xml` contains only `/guides/` hub (count=1); guide canonicals point to `.html` forms. All 17 guides missing from sitemaps.

### P2-3 Service worker cache-first for unhashed JS/CSS
- Evidence: `sw.js` `_isShell()` returns true for all `/js/**.js` and `/css/*.css` → `_cacheFirst`. Assets have no content hashes; freshness depends entirely on manually bumping `VERSION='pixaroid-v3.2.0'` each deploy. If bumped, activate purges old caches ✔; if forgotten, users run stale engines indefinitely ✘. vercel.json also sends `max-age=31536000, immutable` on css/js/assets, compounding staleness behind the SW.
- Additionally `install` uses `cache.addAll(SHELL_URLS)` — all-or-nothing: any single 404 aborts installation, silently disabling offline layer (all SHELL_URLS verified present on disk today ✔).
- Note: Monetag remote SW import inside our SW means third-party push logic survives our cache versioning.

### P2-4 Duplicate/near-duplicate tool pages (SEO cannibalization)
- Evidence from tools-data.json name collisions: `compress-image-high-quality` vs `compress-image-without-losing-quality`; `bmp-to-jpg` vs `convert-bmp-to-jpg`; `gif-to-jpg` vs `convert-gif-to-jpg`; `heic-to-png` vs `convert-heic-to-png`; `png-to-webp` vs `convert-png-to-webp`; `tiff-to-jpg` vs `convert-tiff-to-jpg`; `webp-to-png` vs `convert-webp-to-png`. Both variants shipped, both in sitemap.
- Fix: 301-redirect one slug of each pair (vercel.json redirects array) or differentiate titles/canonicals.

### P3-1 Broken links (exhaustive scan of all 564 HTML files)
- `index.html:547` → `/blog/` (no such page; footer nav dead link).
- 6 international pages reference `../../css/style.css` which resolves to nonexistent `css/style.css` path depth (files: paper-size-converter, phone-code-finder, passport-photo-resizer, holiday-calendar, unit-converter, vat-calculator). Actual stylesheet is `css/main.css`/`output.css`; verify visual breakage.
- Only 2 distinct broken internal hrefs total otherwise ✔ (scan excluded protocol-relative/template-literal strings).

### P3-2 seo-hardening.yml mutates 564 source HTML files when dispatched
- Evidence: workflow regex-rewrites meta robots/twitter tags, strips keywords meta, and even replaces "95+"→"120+" text in index.html, then commits (`permissions: contents: write`). One-time migration script left dispatchable. Violates "no scripts that mutate production source during deployment" rule if ever wired to a trigger. Currently `workflow_dispatch` only → not triggered by deploys ✔. Recommend ARCHIVE/remove.

### P3-3 Missing canonicals
- `/tools/compression/demo-premium/` has no canonical (test/demo artifact shipped to production root of tools tree — confirm it's intended public; if not, delete or noindex).

## Corrections to Prior Partial Report
- **Retracted P1 "broken intl routes":** `vercel.json` rewrites like `/tools/international/currency-converter/` → `/tools/international/currency-converter.html` do not 404; Vercel's static-file resolution maps the destination to the existing directory index (the repo's own CI workflow `check-sitemap-local-files.yml` resolves `.html` destinations to `dir/index.html` identically). All 520 sitemap locs and all 511 tools-data paths verified to have backing files ✔. Routes still redundant/misleading and should be simplified, but not a blocker.
- **Partially retracted P2 "duplicate processing engines":** `js/enhanced-engine.js` is an explicit compatibility adapter delegating to canonical `/js/engine.js` (dynamic import; documented in header). However, tool pages load BOTH the adapter stack (tool-controller.js, enhanced-workers.js, level2.js, smart-upload.js) AND a ~12KB inline engine per page plus overlapping helper blocks — including an exact duplicate inline block defining `window.updateProgress` twice on the same page, and inline handlers bound to `#dz/#fi` alongside controller bindings to `#dropzone` (different DOM ids, so double-binding only where ids coincide). Net risk downgraded to P3 (dead/duplicated code, maintenance hazard) pending runtime verification.

## Verified Clean (evidence-backed)
- tools-data.json: valid JSON, 511 entries, unique paths, zero dangling refs (every path has an html file).
- sitemap-tools.xml: 520 locs, every loc has a backing file (proper dir-index check).
- Workers (`workers/*.worker.js`): jobId-correlated messaging, try/catch → error postMessage, OffscreenCanvas feature detection with clear user-facing error, transferable buffers used ✔. `js/engine.js`: 60s worker timeout, error listener rejects promise, `destroyWorkers()` on beforeunload ✔.
- Object-URL hygiene in tool-controller.js: revoke via setTimeout after download/preview ✔ (60s retention for comparison previews is intentional).
- File validation (`validateFile`): empty file, size cap (20MB), MIME allowlist + HEIC ext fallback ✔.
- Secrets scan of js/config/workers/scripts: no API keys/tokens/passwords ✔. No eval/document.write/Function found in production JS ✔. Monetization URLs whitelisted via `isSafeUrl` (https + exact host) ✔.
- sw.js pre-cached SHELL_URLS: all 24 files exist on disk ✔.
- No accidental noindex anywhere (robots-meta scan across 564 pages: 0 noindex) ✔.
- robots.txt: allows all, disallows /admin/ /private/ /scripts/ /.git/ (nonexistent dirs harmless), both sitemaps declared ✔.

## Unverified / UNVERIFIED Items
- Browser runtime behavior (console errors, actual compression output correctness, download filenames) — UNVERIFIED (no headless browser available in audit environment).
- Live HTTP status codes, redirect chain behavior of rewrites under real Vercel — UNVERIFIED (repo-only audit).
- Full CSS responsive/a11y pass, contrast, focus visibility — NOT PERFORMED (partial only).
- Baseline CSVs (canonical/internal-link) vs current site deep diff — NOT PERFORMED this pass; treated as stale artifacts per prior classification.
- PDF tool boundary cases (encrypted/huge PDFs) — UNVERIFIED.

## Production Gate: **FAIL**
Blockers: P1-1, P1-2 (decision), P2-1..P2-4 must be resolved or explicitly accepted before launch.

## Commands Run (this pass)
git log/status; find/wc inventories; Python cross-referencing tools-data.json ↔ sitemap-tools.xml ↔ sitemap.xml ↔ filesystem; full-tree internal href broken-link scan; canonical/noindex survey of 564 pages; grep audits (Monetag footprint, secrets, serviceWorker registration, object-URL cleanup); read of vercel.json, package.json, .vercelignore, sw.js, robots.txt, ads.txt, workflows, workers/compress.worker.js, js/engine.js, js/tool-controller.js, js/enhanced-engine.js, js/modules/monetization.js.
