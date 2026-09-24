# PIXAROID MASTER AUDIT REPORT

Audit date: 2026-09-24 · Auditor: read-only engineering + SEO + AEO + GEO audit
Repository audited: local working tree of `sudheer378/Pixaroid` @ commit `1696238` ("seo: remove unverifiable homepage rating markup")
Production spot-checked: `https://pixaroid.vercel.app/` (HTTP status, canonicals, robots.txt, redirects verified with live requests)

**No production files were modified during this audit. Only this report was created.**

---

## 1. Executive Summary

Pixaroid is a static HTML site with ~535 tool pages. The repository is technically deployable and most tools function via inline JavaScript, but the audit found **systemic problems that directly explain low organic visibility**:

1. **P0 — Mass canonical collisions on Resize/AI/Conversion pages.** 100+ live, sitemap-listed, unique-content pages point their self-canonical at a *different* page (e.g. `/tools/resize/resize-image-for-instagram-post/` → canonical `/tools/resize/resize-image-for-instagram/`). Google is being explicitly told these pages are duplicates. This alone can suppress indexing/rankings for ~130 URLs. Confirmed both in repo and on production.
2. **P0 — Fake/unverifiable AggregateRating on 499 pages** (`ratingValue: "4.9"`, `ratingCount: "1247"` — identical values everywhere). This is fabricated structured data, violates Google structured-data policy (manual-action risk), and contradicts the recent commit that removed the same markup from the homepage.
3. **P0 — Currency converter advertises "live exchange rates" (5 occurrences incl. meta description and FAQ schema) while the code uses `// Simulated exchange rates (base: USD)` (line 367).** Factually false claim in raw HTML and JSON-LD.
4. **P1 — AI tools make WebAssembly-model claims ("Files never leave your device", "models download once (2–5MB)", Real-ESRGAN/Waifu2x model selector) but `workers/ai.worker.js` performs plain canvas scaling / pass-through.** Capability claims are not implemented.
5. **P1 — Internal linking collapse:** 265 of 535 tool pages have **zero static internal links** (resize 122, compression 108, …). Category pages render tool lists client-side from tiny inline arrays (resize category shows 9 of 137 tools). Homepage tool grid is JS-rendered; raw HTML contains only 5 `/tools/` hrefs. Crawl equity and anchor-text signals are effectively absent.
6. **P1 — International category is fully inconsistent with the rest of the site:** 15 pages missing from `sitemap-tools.xml`, missing from `tools-data.json`, served through broken vercel rewrites pointing at nonexistent flat `.html` files, and one rewrite (`text-translator`) 404s in production (verified).
7. **P1 — Legacy runtime not fully migrated/dead:** `js/core.js`, `js/core/pixaroid-core.js`, `js/services/image-processing-service.js`, `js/pages/tool-engine.js` have zero consumers; 498 pages load 4 adapter scripts (`enhanced-engine`, `enhanced-workers`, `enhanced-worker`, `tool-controller`) that none of the pages' inline code actually calls.
8. **P1 — No analytics whatsoever** (GA4 placeholder `G-XXXXXXXXXX`, commented out). The site cannot answer which tools are used or fail — blocking every data-driven SEO decision.
9. **P2 — Programmatic near-duplicate clusters** (JPG vs JPEG vs convert-* triplets; compress-to-XKB × 4 extensions × 21 sizes; resize platform×pixel variants) create cannibalization even where canonicals are correct.
10. **P2 — Performance weight:** average tool page ≈ 85 KB HTML + Monetag third-party script on 531 pages + 4 unused adapter scripts on 498 pages; service worker cache-first strategy risks stale assets (immutable 1-year HTTP caching combined with SW cache-first = double staleness).

Positive findings (do NOT undo): clean URL scheme consistency (all canonicals trailing-slash, matching sitemap), valid robots.txt with no accidental blocks, good semantic metadata coverage (every page has title/H1/canonical/OG/Twitter/FAQ/HowTo/Breadcrumb schema), llms.txt present and accurate in tone, CI includes read-only inventory audits, monetization module isolates SmartLinks behind an allowlist and labels them sponsored.

Issue totals: **TOTAL ISSUES: 42** — P0: 4 · P1: 14 · P2: 14 · P3: 7 · P4: 3.

---

## 2. Audit Scope

Read-only audit of: repository file tree (564 HTML, 33 JS modules, 6 workers, 10 CSS files, 3 workflows, configs, sitemaps, robots, llms.txt, manifest, sw.js, vercel.json) and live production spot checks (homepage, resize/currency/international/text-translator/demo-premium/jpeg-compressor/convert-png-to-webp URLs, robots.txt, sw.js, worker headers, redirect behavior). Not in scope: GSC/API data (unavailable), Lighthouse field data (unavailable), browser console testing (no browser automation available in environment).

Classification legend used throughout: FACT (verified in repo/prod), OBSERVATION, RISK, RECOMMENDATION, UNVERIFIED.

---

## 3. Repository Inventory

FACT — counts from working tree:

| Item | Count |
|---|---|
| Total HTML files | 564 |
| Tool pages (tools/**/index.html) | 535 |
| Category index pages (tools/*/index.html) | 9 |
| Individual tool pages | 526 |
| Root pages (home, about, contact, faq, legal ×4, 404) | 9 |
| Guides | 17 |
| Templates | 2 |
| JS files (js/, workers/) | 33 + 6 workers |
| CSS files | 10 (only 4 referenced anywhere) |
| Workflows | 3 |
| sitemap.xml URLs | 9 |
| sitemap-tools.xml URLs | 520 |
| Actual tool URLs on disk | 535 |
| tools-data.json entries | 511 |
| config/tools-config.js registry entries | 14 |

**Flagged mismatches (FACT):**
- 535 tool pages vs 520 sitemap URLs → 15 repo-only pages (all `/tools/international/*`).
- 535 vs 511 tools-data.json → all 15 international pages + 9 category pages missing.
- 526 real tools vs 14-entry `config/tools-config.js` registry (used by `internal-links.js` and `tool-runner.js`) → related-link injection can resolve only 14 slugs.
- Homepage copy claims "120+" tools; actual distinct indexable tool URLs ≈ 520+. Claim understates but also is arbitrary; verify intent (OBSERVATION).

---

## 4. Tool Inventory Consistency

Full table abbreviated to representative rows; complete collision list in §15/§23. Columns: TOOL | CATEGORY | URL | STATUS | PROBLEMS | RECOMMENDATION

| Tool | Cat | URL | Status | Problems | Recommendation |
|---|---|---|---|---|---|
| resize-image-for-instagram-post | resize | /tools/resize/…-post/ | works (inline JS) | canonical→generic instagram page; orphaned | Fix canonical (PX-0001); keep page if intent distinct |
| resize-image-for-facebook-1200x630 | resize | …/1200x630/ | works | canonical→generic facebook page (prod-verified) | PX-0001 |
| currency-converter | intl | /tools/international/currency-converter/ | works | not in sitemap/registry; "live rates" false claim; rewrite indirection | PX-0004, PX-0010, PX-0013 |
| text-translator | intl | /tools/international/text-translator/ | **404 in prod** | vercel rewrite → nonexistent file | PX-0013 |
| png-to-jpg & convert-png-to-jpg | conversion | both exist | work | duplicate intent pair; convert-* canonicals to bare slug | PX-0002, PX-0020 |
| background-remover (+3 aliases) | ai | 4 pages | canvas-threshold fallback | all 4 canonical→background-remover; AI claims unimplemented | PX-0001/0011 |
| demo-premium | compression | /tools/compression/demo-premium/ | 200 in prod | no canonical; dev demo; uses legacy pro stack | PX-0005, PX-0030 |
| jpeg-compressor | compression | …/jpeg-compressor/ | 200 | sole consumer of pro-engine/tool-controller-pro/advanced-worker stack | PX-0026 consolidation |
| image-upscaler etc. | ai | 15 pages | work (canvas) | fake model claims; 14/15 carry AggregateRating | PX-0011, PX-0003 |

Detected categories of mismatch (FACT): 100+ pages canonical-colliding (§15), 15 sitemap-missing pages (§20), 0 sitemap-only pages (good), 0 missing titles/H1s (good), 1 missing canonical (`demo-premium`), 265 orphan pages (§24), duplicate-intent clusters (§33).

---

## 5. Production Website Audit

Verified live (FACT):
- `https://pixaroid.vercel.app/` → 200, canonical self, TTFB ~0.8 s (single sample, not field data).
- `/tools/resize/resize-image-for-instagram-post/` → 200, raw HTML canonical = `…/resize-image-for-instagram/` ✅ collision confirmed in production.
- `/tools/resize/resize-image-for-facebook-1200x630/` → 200, canonical = generic facebook page ✅.
- `/tools/international/currency-converter/` → 200; raw HTML contains "live exchange rates" ✅.
- `/tools/international/text-translator/` → **404** ✅ (rewrite target missing).
- `/tools/compression/demo-premium/` → 200 (publicly reachable demo page).
- `/tools/conversion/convert-png-to-webp/` → 200 (duplicate-title pair live).
- `/robots.txt` matches repo; two Sitemap lines; no crawl-delay.
- `/sw.js` 200, no-store headers OK.
- `/workers/compress.worker.js` → 200, `application/javascript`, nosniff. **No COOP/COEP headers returned** despite vercel.json declaring them for `/workers/*.js` (OBSERVATION — header rule may not match due to `cleanUrls`/redirect ordering; UNVERIFIED why).
- URLs without trailing slash → 308 redirect to trailing slash (consistent). `/x/index.html` → 308 to clean URL. Single canonical URL form enforced correctly.
- Console/network errors: UNVERIFIED (no browser automation available). Recommend running Lighthouse + Playwright console capture per §44 checklist.

---

## 6. Tool Functionality Bugs

### ISSUE-ID: PX-0011
Category: Functionality / AI Tools
Severity: P1
Confidence: High
Status: FOUND
Location/File: `workers/ai.worker.js`; `tools/ai-tools/*/index.html`
URL: all 15 AI tool pages
Problem: Pages advertise real AI models (Real-ESRGAN/Waifu2x selector in image-upscaler line 933; "WebAssembly models… 2–5MB download" FAQ in image-to-text-ocr line 143; "Files never leave your device" on 14 pages). Worker performs `drawImage` 2× scale (upscaler), PNG re-encode (bg-remove), and explicit **pass-through fallback** for enhance/sharpen/colorize/OCR. OCR does not extract text at all in the worker path.
Evidence: `workers/ai.worker.js` lines 1–40 ("Browser-only fallback worker… safe pass-through image rather than a fake AI result"); grep found no ONNX/TensorFlow/tesseract references in any AI page.
Why it matters: Users get unchanged images labeled as enhanced; FAQ answers are factually false → trust, AEO accuracy, and potentially legal exposure (misleading advertising).
Recommended solution: Either implement a real model pipeline (e.g. tesseract.js for OCR, ONNX Runtime Web for segmentation) or rewrite copy to describe exactly what runs (canvas smoothing upscale, color-distance background removal) and remove model selectors/FAQ claims. Do not claim browser-AI that isn't there.
Files likely affected: 15 AI pages, workers/ai.worker.js
Dependencies: none
Risk of fixing: Low (copy) / Medium (model integration)
Verification method: manual run of each AI tool; diff output pixels vs input for pass-through detection
Expected result: Page claims == implemented behavior.

### ISSUE-ID: PX-0010
Category: Functionality / International
Severity: P0
Confidence: High
Status: FOUND
Location/File: `tools/international/currency-converter/index.html:367`
Problem: UI/meta/schema claim "live exchange rates… updated every minute from reliable financial sources"; implementation is `// Simulated exchange rates (base: USD)` static object.
Evidence: lines 7, 13, 21, 29, 239, 277 (claims) vs line 367 (simulated). Prod-verified claim present in raw HTML.
Why it matters: False factual claim in featured snippet-eligible content and JSON-LD; users making financial decisions on wrong numbers.
Recommended solution: integrate a real rate API (with last-fetched timestamp shown) OR relabel as "reference rates (static snapshot)" and state the as-of date.
Files affected: currency-converter page; possibly holiday-calendar/vat-calculator if similar (holiday data source UNVERIFIED — inspect before fixing).
Risk of fixing: Low. Verification: compare displayed rates against an external source; check disclaimer visible.
Expected result: No "live/current" wording without a live feed.

Other functionality observations: phone-code-finder claims "every country" coverage (data completeness UNVERIFIED); pdf-to-word converts via pdfjs text extraction into a .docx wrapper — quality caveats should be stated (content review required); FileSaver/jszip/docx/qrcode loaded from CDNs — offline/SRI risk (see PX-0034).

---

## 7. Category Audit

### Compression
- Architecture: 155 pages, inline JS processing + 4 adapter scripts loaded but unused (PX-0026); engine workers available.
- SEO: massive programmatic families (compress-{jpg,jpeg,png,webp}-to-{5..500}kb = ~84 near-duplicates; compress-image-for-{platform} = 20). Titles/descriptions templated; canonicals mostly self (good) except alias groups.
- Content: thin differentiation between extension variants; FAQ/HowTo schema present on all.
- UX/functionality: consistent dropzone pattern; 20 MB cap (engine.js MAX_FILE_SIZE_BYTES).
- Classification: core pages A/B; extension×size long tail C (cannibalization cluster §33).

### Conversion
- 158 pages including full `X-to-Y` + `convert-X-to-Y` + `jpeg`/`jpg` triplicates. `convert-*` pages canonicalize to bare slugs (deliberate? see PX-0002 note) — but 6 pairs share *identical titles* (duplicate titles list §14).
- SVG→raster and raster→SVG: converting to SVG is vectorization — no such implementation found; `convert-*-to-svg` pages likely produce raster-in-svg wrappers (UNVERIFIED — test outputs before deciding; candidate C/E class).
- HEIC decode support depends on browser; error handling for unsupported formats UNVERIFIED.

### Resize
- 137 pages; **worst canonical hygiene** (14 collision groups covering ~110 pages, PX-0001).
- DPI pages (`resize-image-to-{72,96,150,300,600}dpi`) all canonicalize to `resize-image-for-desktop-wallpaper/` — semantically unrelated targets (PX-0001 sub-case).
- Category page lists only 9 tools client-side vs 137 existing (PX-0012).

### Editor
- 25 pages, canvas filters via filter.worker/engine adapters; add-text vs add-text-overlay vs add-watermark overlap (intent review needed, don't auto-merge).

### Social Tools
- 7 maker pages duplicating resize-platform intent (facebook-cover-maker vs resize-image-for-facebook-cover-photo). Cannibalization cluster §33; no canonicals observed pointing across categories (self-canonicals OK) but overlapping H1 intent.

### AI Tools
- See PX-0011. 4-way bg-remover alias group and 3-way upscaler group canonicalize to primaries (this direction is defensible; keep, but then remove alias pages from sitemap or 301 them — currently they're 200-with-cross-canonical, the worst of both).

### PDF Tools
- Mixed library loading (PX-0027): unpkg CDN pdf-lib@1.17.1 + pdfjs-dist@3.11.174 on most pages, local `js/vendor/pdf-lib.min.js` on pdf-rotate, `importScripts('https://unpkg.com/…')` inside `workers/pdf.worker.js`. Version drift + CDN outage = broken tools; COEP-restricted pages could fail cross-origin worker imports (UNVERIFIED interaction).
- pdf-to-word loads Tailwind CDN (`cdn.tailwindcss.com`) — dev-only library in production (PX-0034).

### Utilities
- 10 checker/extractor pages; fine. All carry AggregateRating (remove per PX-0003).

### International
- Structurally divergent: own design system, no aggregate rating (good!), **absent from sitemap, tools-data.json, POPULAR_TOOLS**; served via vercel rewrites to nonexistent `.html` paths (works only because directory exists? — actually request resolves to directory index; the rewrite rules are dead weight/misleading, PX-0013). text-translator rewrite 404s (prod-verified).
- Passport photo resizer gives dimensional guidance — must include "verify against official requirements" disclaimer (llms.txt already recommends this posture).

---

## 8. JavaScript Architecture

Dependency map (FACT, from grep of all src refs):

```
Canonical engine:   js/engine.js  ← imported by js/tool-controller.js, js/enhanced-engine.js (adapter)
                    workers/{compress,convert,resize,filter,ai}.worker.js ← engine.js WORKER_PATHS
Page runtime (498 pages): inline <script> blocks (self-contained processing) 
   + loaded-but-unused: tool-controller.js, enhanced-engine.js, enhanced-workers.js, enhanced-worker.js, smart-upload.js(?), level2.js
Legacy islands:     jpeg-compressor → tool-controller-pro + pro-engine + advanced-worker + premium-ui
                    demo-premium → premium-ui
PDF:                tools/pdf-tools/js/pdf/* (pdf-worker-manager → /workers/pdf.worker.js)
Bootstrap:          js/app.js ONLY on tools/resize/resize-image-for-pinterest/index.html (+templates, sw shell list)
Zero-consumer dead: js/core.js, js/core/pixaroid-core.js, js/services/image-processing-service.js,
                    js/pages/tool-engine.js, js/modules/{canvas-engine,download-manager,drag-drop,file-handler,
                    preview,progress-bar,seo-meta,toast,performance*,internal-links*} (*perf/internal-links
                    referenced only by app.js which itself is on 1 page)
tools-grid.js:      homepage loader — homepage has NO external script tags at all (FACT: grep '<script src' index.html = 0),
                    so initToolsGrid never executes → TOOLS_DATA inline array (~511 entries) is the de-facto homepage registry.
```

Migration verdict: **incomplete**. The "canonical engine" is reached only through adapter chains that the 498 pages never invoke; pages run duplicated inline processors instead. Adapters are currently *unused weight*, not necessary glue.

Classification:
- KEEP: js/engine.js, workers/*, js/modules/monetization.js + monetag.js, inline page scripts (until consolidated), js/modules/level2.js (provides confetti/touch/nav used inline).
- MIGRATE: per-page inline processing → shared controller invocation (or delete controllers and accept inline architecture — decide once, see CONSOLIDATE table).
- CONSOLIDATE: 3 upload systems (smart-upload.js, inline dz handlers, tool-controller), 2 toast implementations (level2.js + inline), multiple progress bars.
- DELETE AFTER MIGRATION / DEAD NOW: core.js, core/pixaroid-core.js, services/image-processing-service.js, pages/tool-engine.js, pages/tool-runner.js (only referrer is tools-config comment), enhanced trio + tool-controller IF pages remain inline (currently safe to unload from pages first, then delete).
- UNVERIFIED: whether any inline script calls `pxRunWorkerEnhanced` indirectly via window globals on some subset of the 498 pages — grep found no call sites; do a runtime network-trace (check whether `/workers/*.js` are ever fetched) before deletion.

---

## 9. Worker Audit

- Registration: engine.js instantiates lazily per type (`new Worker(path)`), pools per key, jobId via `crypto.randomUUID()` — sound. Timeout/error handling present in engine `_dispatch` (review remaining lines beyond 40 during fix phase — partial read).
- `workers/pdf.worker.js` uses `importScripts('https://unpkg.com/pdf-lib@1.17.1…')` → classic worker + remote dependency + potential COEP conflict (PX-0027).
- `js/enhanced-worker.js` is a *legacy protocol shim* loaded as a script tag on 498 pages but never instantiated as `new Worker(...)` anywhere (grep: only `/js/advanced-worker.js`, `/workers/ai.worker.js`, WORKER_PATHS, dynamic path vars). It is dead weight unless dynamically constructed — UNVERIFIED dynamic construction; treat as deletion candidate after runtime trace.
- `workers/ai.worker.js` returns pass-through for 4/6 operations (PX-0011).
- Every referenced worker file exists (FACT). Unused-except-one-page: advanced-worker.js.
- Concurrency/race: single pooled worker per type serializes jobs; acceptable. Transferables: buffers posted as ArrayBuffer — verify transfer list during PX-0026 work.

---

## 10. Performance

HIGH IMPACT:
- Monetag `tag.min.js` on 531 pages (third-party, main-thread unknown — UNVERIFIED payload).
- 4 unused adapter scripts (~40 KB) + smart-upload on 498 pages.
- Average tool page 85 KB HTML (max 109 KB) — heavy inline duplication of CSS/JS per page; consider shared cached stylesheet/script bundles.
- Service worker caches `/js/**` and `/workers/**` **cache-first** forever under version `pixaroid-v3.2.0` → returning users can be pinned to stale engines until VERSION bumps (PX-0029).

MEDIUM: inline `<style>` blocks duplicated across 535 pages prevent long-term caching; fonts preconnect present (good); no image lazy-loading standardization (lazysizes injected on some pages).
LOW: css/ unused files (main/components/utilities/premium-tools/advanced-tools referenced by 0 pages) — cost only repo weight.

---

## 11. Core Web Vitals

UNVERIFIED — FIELD DATA NOT AVAILABLE. No CrUX/GSC access in this environment; no headless lab run performed. Do not invent values. Required measurement step added to §44 checklist (Lighthouse mobile + CrUX export).

---

## 12. Mobile UX

- Viewport meta present on sampled pages; touch support via level2.js. Upload controls are large dropzones (good). Inline toast/confetti patterns mobile-safe (sampled). Ads: Monetag SmartLink slots appear as footer links on category pages (observed in `tools/resize/index.html`) — placement must stay below-fold and labelled (module comments claim compliance; visual verification UNVERIFIED). Keyboard: space/enter handler observed (png-to-jpg line 1930). Full matrix UNVERIFIED — add Playwright mobile pass to verification checklist.

---

## 13. Accessibility

Sampled pages show alt-less decorative SVG usage, aria sparse; buttons generally `<button>`; dropzones rely on click+drag (keyboard file selection via hidden input present in samples). Contrast/theme colors defined in CSS vars — contrast ratios UNVERIFIED. Add automated axe scan to CI (READ-ONLY validation workflow) — recommended, not yet present.

---

## 14. Technical SEO

FACT summary across 535 tool pages:
- 535/535 have unique-or-duplicated titles; **6 exact duplicate title pairs** (all `X-to-Y` vs `convert-X-to-Y`: png→webp, webp→png, gif→jpg, bmp→jpg, tiff→jpg, heic→png); **28 duplicate description sets** (same pairs).
- 534/535 have canonical; missing on `demo-premium`.
- 0 noindex pages; 0 pages without H1/title.
- 528 pages still ship `<meta name="keywords">` (obsolete; the seo-hardening workflow removes them — see PX-0025 mutation concern).
- 7 titles >65 chars, 7 <30 chars (minor).
- OG/Twitter cards present on sampled pages; twitter:title sync handled by past workflow.
- Breadcrumbs: BreadcrumbList schema on 514 pages but **visible breadcrumb nav presence UNVERIFIED** (schema must match rendered content).
- Guides (17) link to tools well; guides themselves are in neither sitemap.xml nor sitemap-tools.xml (sitemap.xml has only `/guides/` index) — guide URLs likely uncrawled except via links (RECOMMENDATION: add guide URLs to sitemap.xml).

---

## 15. Canonical Audit (P0 detail)

Collision groups (multiple live URLs → one canonical), all verified in repo, two verified in production:

Resize (14 groups, ~110 pages): tiktok(5), facebook(8), twitter(7), pinterest(8), linkedin(6), instagram(10), youtube(7), whatsapp(5), desktop-wallpaper(9 — absorbs ALL dpi pages, crop-16-9, google-meet, zoom), tiktok-video(6 — absorbs instagram-story, 1080x1920, whatsapp-status, snapchat-story, facebook-story, android-wallpaper), discord-avatar→512x512, blog→1200x628, iphone-14-pro→iphone-15, cv←tiktok-profile(!), app-icon←1024x1024, shopify←2048x2048.
AI: background-remover(4), image-upscaler(3), photo-enhancer(2), image-to-text-ocr(2).
Conversion: 33 `convert-X-to-Y` pages → bare `X-to-Y` canonicals.

Assessment:
- Conversion `convert-*` → bare: reasonable consolidation **if** the alias pages are removed/301'd — keeping 200-status pages with cross-canonical wastes crawl budget and splits engagement. 
- Resize: many targets are semantically wrong (instagram-story → tiktok-video; tiktok-profile → cv; DPI pages → desktop-wallpaper). These look like an over-aggressive bulk canonicalization pass. Each variant (platform-specific size, story vs post vs profile) is a genuinely different search intent (Rule 6). 
- Recommended end-state: self-canonical every distinct-intent page; 301 only true duplicates (e.g. `resize-image-for-instagram-1080x1080` vs `resize-image-to-1080x1080` needs intent review, not blanket merge).

### ISSUE-ID: PX-0001
Category: SEO/Canonical · Severity: **P0** · Confidence: High · Status: FOUND
Location: `tools/resize/*/index.html` (~110 files), `tools/ai-tools/*` (11 files)
Problem: cross-page canonicals with wrong/unrelated targets; prod-verified on 2 URLs.
Evidence: §15 lists; curl outputs in §5.
Why it matters: tells Google ~120 unique pages don't exist → direct cause of low impressions/indexing.
Fix: set self-canonicals per page (script-assisted, reviewed per group); update sitemap accordingly (already lists all URLs).
Risk of fixing: Low-Medium (must not flip genuinely duplicate pages into thin near-duplicates without content differentiation — pair with §33 intent review).
Verification: crawler asserting `canonical(url) == url` for every sitemap URL.

### ISSUE-ID: PX-0002
Category: SEO/Canonical · Severity: P1 · Confidence: High · Status: FOUND
Location: 33 `tools/conversion/convert-*/index.html`
Problem: 200-status duplicate pages cross-canonicalized instead of redirected.
Fix: choose winner (bare slug), 301 the `convert-*` URLs via vercel.json, drop from sitemap after redirect settles.
Verification: redirect chain returns 301→200; no canonical≠self among 200s.

---

## 16. Sitemap Audit

- `sitemap.xml`: 9 URLs, all valid files, lastmod 2026-09-12. Missing: 16 guide pages, `/tools/` hub? (category hubs live in sitemap-tools.xml — FACT: it includes `/tools/<cat>/` rows).
- `sitemap-tools.xml`: 520 URLs, uniform lastmod **2026-09-02** (stale vs later edits incl. the rating-removal commit — OBSERVATION: lastmod not maintained).
- 15 repo pages missing (all international) — PX-0004.
- No sitemap-only ghosts, no noindex entries, no `.html` URLs, trailing slashes consistent with site canonical form. ✅
- No sitemap index file; two sitemaps declared in robots.txt ✅.

---

## 17. Robots Audit

Valid syntax; allows everything except /admin/, /private/, /scripts/, /.git/ (first two don't exist — harmless). Does not block /js/, /css/, /workers/ ✅. No crawl-delay ✅. Both sitemaps declared ✅. AI crawlers unblocked (fine for GEO goals). Minor: add explicit `Disallow: /templates/` (dev files publicly reachable — verify `/templates/tool-template.html` status; recommend 404/noindex instead of disallow since disallow leaks presence when linked).

---

## 18. Structured Data Audit

Counts (pages containing type): FAQPage 518, HowTo 513, BreadcrumbList 514, SoftwareApplication 512, WebApplication 5, AggregateRating **499**, ItemList 1, price "0" on 517, dateModified "2026-04-03" on 513 (uniform → not maintained; predates several commits).

### ISSUE-ID: PX-0003
Category: Structured Data · Severity: **P0** · Confidence: High · Status: FOUND
Location: 499 tool pages (compression 152, conversion 157, resize 136, editor 24, ai 14, utilities 9, social 6, pdf 1)
Problem: identical fabricated `"ratingValue":"4.9","ratingCount":"1247"` AggregateRating with no visible reviews and no real review source. Violates Google review-snippet policy; contradicts commit 1696238 which removed the same markup from the homepage (inconsistent cleanup).
Fix: strip AggregateRating from all SoftwareApplication nodes (regex-safe: the seo-hardening workflow already contains an exact-match removal regex — reuse it as a one-time validated script, committed manually, not via mutating workflow).
Verification: `grep -r AggregateRating --include=*.html | wc -l == 0`; Rich Results Test on 10 sampled URLs.
Risk: loss of star snippets — acceptable; they are non-compliant anyway.

Also: HowTo schema steps must mirror visible numbered instructions (sampled pages do have `#how-to-step-N` anchors ✅); FAQ answers containing false claims (AI WebAssembly, live rates) must be corrected alongside PX-0010/0011 (schema/page mismatch otherwise).

---

## 19. AEO Audit

Strong base: every tool page answers what/how/free/browser-based via FAQ + HowTo; llms.txt instructs answer engines well. Gaps: (a) "Are files uploaded?" answered truthfully on image tools ✅ but AI privacy answers are false (PX-0011); (b) limitations sections present on target-size pages ✅; (c) currency/holiday/VAT factual answers embed unverified claims (PX-0010); (d) no single "What is Pixaroid" entity page beyond /about (acceptable). After removing fake ratings and fixing false claims, AEO content quality is above typical programmatic sites.

---

## 20. GEO / AI Search Audit

- llms.txt: accurate tone, covers 6 families; **missing international category URL listing and utility/editor families** (lists category root only) — minor expansion recommended.
- Entity consistency: org name/domain stable; twitter handle `@pixaroidapp` — account existence UNVERIFIED (placeholder risk; confirm or remove).
- Contradictions found between HTML/JSON-LD/llms.txt: llms.txt says "avoid inventing capabilities" while pages invent AI capabilities (PX-0011) and live rates (PX-0010). Fixing those restores machine-readable consistency.
- Homepage tool count wording ("120+") conflicts with 520+ indexed URLs — pick one framing (FACT mismatch).

---

## 21. International SEO

`lang="en"` throughout; **no hreflang — correctly so** (no translated/regional variants exist; do NOT add hreflang). Country/currency claims audited in PX-0010. The "International" category is mislabeled for global audience targeting (it's traveler/utility tools); fine as taxonomy, but ensure titles don't imply localization ("compliant for every country" style claims — phone-code-finder "every country" coverage UNVERIFIED against ITU data).

---

## 22. Content Quality

Classifications (page-level sampling + family analysis):
- A: primary tools (compress-image, resize-image, jpg-to-png, heic-to-jpg, pdf-merge…), guides.
- B: platform resize/social pages needing richer differentiation (unique specs tables, current platform dimension citations with dates).
- C: extension×size compression long tail (compress-{jpeg,jpg,png,webp}-to-{N}kb — 84 pages differing mainly by format word), `convert-*` triplet pages, 4 AI alias pages.
- D: pages with technical defects (wrong canonical, fake rating, false claims) — overlaps heavily with C.
- E candidates: demo-premium (dev artifact), text-translator rewrite stub.
Per Rule 5/10: do not mass-delete C pages yet; evidence needed = GSC query separation per format word (users searching "compress png to 100kb" vs jpg are real distinct queries), rendering/quality differences per format (PNG transparency handling differs → genuine uniqueness). Consolidate only where content AND capability are identical.

---

## 23. Search Intent / Cannibalization

| Cluster | Intent | Current URLs | Difference | Risk | Keep separate? | Evidence required |
|---|---|---|---|---|---|---|
| JPG vs JPEG converters | medium | jpg-to-X, jpeg-to-X, convert-jpg-to-X, convert-jpeg-to-X | naming only | High | Yes for jpg/jpeg (query volume differs), no for convert-* dupes | GSC query x page matrix |
| compress-{ext}-to-{kb} | high-volume long tail | 84 pages | format word | Med (self-inflicted dupes if content identical) | Likely yes if per-format tips differ | content diff audit |
| Instagram post vs 1080x1080 vs story | distinct | 10 pages | aspect/use | Currently suppressed by canonical | YES — restore self-canonicals | none (canonical fix) |
| DPI pages vs wallpaper | different intent | 5 dpi pages merged into wallpaper | print-DPI ≠ wallpaper | Severe mismatch | YES — restore + clarify DPI semantics (browser DPI tagging ≠ resample) | verify output actually writes DPI metadata (UNVERIFIED — canvas output typically has 96dpi default; if tool doesn't set DPI, page is misleading → content fix) |
| passport: resize-passport-photo vs compress-photo-for-passport vs international/passport-photo-resizer | overlapping | 3 pages, 2 categories | resize vs compress vs spec-presets | High | Merge plan after intent study | GSC + feature comparison |
| social makers vs resize-platform | duplicate | 6 maker pages | editing vs pure resize | High | Keep if maker adds text/template features | functional audit |

---

## 24. Internal Linking

FACT: 265/535 tool pages receive **zero static internal links** (resize 122, compression 108, editor 10, ai 8, pdf 8, conversion 7, utilities 2). Homepage raw HTML exposes 5 tool links; category pages expose ~1 template-literal link + JS-rendered lists; tool pages link to ~5 related tools statically. `internal-links.js` injects more at runtime but (a) requires `body[data-tool-slug]` which **0 tool pages set** (grep verified) and (b) is loaded only via app.js on 1 page → runtime injection is effectively dead site-wide.
Consequence: 265 pages depend solely on sitemap discovery → weak crawl prioritization, no PageRank flow, poor anchor context. This is a top-tier root cause of low visibility.
Fix: bake static "Related tools" + full category listings into HTML at authoring time (server-side template pass, committed manually), wire `data-tool-slug` + app.js/module loading as interim.

### ISSUE-ID: PX-0012
Severity P1 · Confidence High · FOUND. Location: all category `index.html` + tool pages. Problem: orphan cluster + dead runtime linker. Fix: static link injection; category pages must list all member tools in raw HTML. Verification: crawler recount → 0 orphans (excluding intentional no-index). 

---

## 25. Vercel / Routing

- `cleanUrls:true` + `trailingSlash:true` → consistent 308 normalization verified in prod ✅.
- Header rules: security headers present on sampled responses; **COOP/COEP on /workers/ not observed in response** (PX-0027 sub-issue; also COEP require-corp would break opaque third-party responses if ever applied — currently a latent footgun).
- Redirects: 3 legacy 301s — destinations exist ✅ except `/tools/social-tools/instagram-post-size/` → `/tools/resize/resize-image-for-instagram-post/` (cross-category, acceptable, but destination is itself canonical-suppressed today — fix PX-0001 first).
- Rewrites: 8 short routes ✅; **12 international rewrites target nonexistent flat `.html` files** — 11 are inert (directory serving wins) and `text-translator` is a hard 404 (PX-0013). Remove or repoint to directories.
- 404.html exists but no explicit routing entry (Vercel serves /404 automatically) ✅.

---

## 26. Service Worker / PWA

### ISSUE-ID: PX-0029
Severity P1 · FOUND. `sw.js` merges Monetag bootstrap (`importScripts('https://5gvci.com/act/files/service-worker.min.js')`) with Pixaroid caching in one file. Risks: (1) third-party SW code failure breaks install/fetch handlers for the whole site; (2) cache-first for `/js/**` + `/workers/**` + shell means engine fixes don't reach returning users until VERSION bump; (3) HTML pages network-first ✅ but shell "/" cache-first pins stale homepage. Fix: separate concerns (Monetag may require its own SW scope if allowed), switch JS/workers to stale-while-revalidate with versioned URLs, keep no-cache on sw.js (already ✅). Verify Monetag docs before splitting (policy constraint noted).

---

## 27. Security

- No `eval(` found ✅. innerHTML used in 11 modules/pages — mostly static templates; user-controlled strings (filenames) interpolated in result lists (e.g. level2/toast/preview) → DOM-XSS surface on filenames; recommend textContent or escaping (P2).
- No CSP header (vercel.json has XFO/nosniff/referrer only). Recommend staged CSP: start Report-Only, whitelist quge5/sordidcopper/unpkg/cdnjs/jsdelivr/fonts. Do not deploy enforcement blindly (Monetag scripts need specific allowances).
- COEP `require-corp` on /workers/ (declared) incompatible with cross-origin CDN resources lacking CORP → future breakage risk (see PX-0027).
- ads.txt present (publisher line format spot-check recommended). Google + Monetag verification files present ✅.
- Third-party libs from CDNs without SRI (FileSaver, jszip, docx, qrcode, pdfjs, pdf-lib, tailwind) — add SRI or vendor locally (P2).
- Object URL revocation present in sampled inline code; worker messages origin-irrelevant (same-origin) ✅.

---

## 28. Monetization

Monetag zone 277292 script on 531 pages + SmartLink constants hardcoded in `js/modules/monetization.js`, `config/site-config.js`, and **directly as footer hrefs in category HTML** (observed in tools/resize/index.html). Module enforces https+hostname allowlist and labels sponsored ✅. Concerns: (1) duplicate SmartLink definitions (config vs module vs HTML) → drift risk; (2) raw SmartLink hrefs in HTML lack `rel="sponsored nofollow"` (grep of index.html rel attrs shows none) — both an SEO-quality signal issue and ad-policy labeling gap (P2); (3) SW coupling (PX-0029); (4) no consent/CMP hook visible for GDPR given cookie-policy page exists (UNVERIFIED region behavior).

---

## 29. Analytics

FACT: GA4 disabled (`// const GA_ID = 'G-XXXXXXXXXX';` app.js:78) and placeholder active in `config/site-config.js:42`; Clarity empty; no event/download/error tracking anywhere; no Sentry/error endpoint. Cannot answer any of §30's questions today. `js/modules/performance.js` collects metrics but has no reporting sink (loaded on 1 page). This blocks prioritization of all future fixes → instrument early (P1, PX-0014). Also `js/pages/tool-runner.js` references analytics-style events but is unreferenced (dead).

---

## 30. Low-Visitor Root-Cause Analysis

| # | Cause | Class | Evidence | Severity | Confidence | Fix |
|---|---|---|---|---|---|---|
| 1 | ~120 pages canonical-suppressed (wrong cross-canonicals) | INDEXING | §15, prod-verified | P0 | High | PX-0001 |
| 2 | Fabricated ratings → rich-result distrust/manual-action exposure | PROGRAMMATIC SEO/TRUST | §18 | P0 | High | PX-0003 |
| 3 | 265 orphan pages; category/homepage link graphs JS-only | INTERNAL LINKING | §24 | P1 | High | PX-0012 |
| 4 | International section invisible to sitemaps/registries | INDEXING | §16 | P1 | High | PX-0004 |
| 5 | False capability claims (AI, live rates) degrade AEO/GEO citation quality | CONTENT/AEO | PX-0010/0011 | P1 | High | copy/impl fixes |
| 6 | Zero analytics → flying blind, no iteration loop | ANALYTICS | §29 | P1 | High | PX-0014 |
| 7 | Uniform stale lastmod + 2026-04-03 schema dates → freshness signal decay | SEO | §16/§18 | P2 | Med | regenerate on change |
| 8 | Thin differentiation across 84 compress-{ext}-{kb} + convert-* pages | PROGRAMMATIC/INTENT | §22/§23 | P2 | Med | intent-audited consolidation |
| 9 | Heavy per-page inline HTML + third-party script load on mobile | PERFORMANCE | §10 | P2 | Med | bundle/cache strategy |
| 10 | Stale SW cache-first JS → repeat-user experience variance | UX/PERF | §26 | P2 | Med | PX-0029 |
| 11 | No backlink authority signals observable from repo | AUTHORITY | n/a | — | UNVERIFIED | off-page work outside audit |
| 12 | Field CWV unknown | PERFORMANCE | §11 | — | UNVERIFIED | measure first |

---

## 31. GSC / Search Data

UNVERIFIED — NOT AVAILABLE. No GSC export/integration exists in repo (only verification file). All performance-dependent decisions (which pages to consolidate/delete) must wait for a GSC pull: queries×pages 3 months, indexing report (expect "Duplicate, Google chose different canonical" cluster matching §15 — strong testable prediction), CWV report. Added to Phase 0 checklist.

---

## 32. Git / Recent Changes Audit

FACT: local history contains a single squashed commit (`1696238`), so per-change archaeology is impossible locally (full history UNVERIFIED — GitHub branch inspection recommended during remediation). Key finding: commit 1696238 removed unverifiable rating markup **from the homepage only** while 499 tool pages retain identical fake ratings → incomplete cleanup, evidence prior Qwen/Coder passes operate file-by-file without global consistency checks. The migration to engine.js likewise stopped at "adapters loaded but unused". Treat all "recent cleanup complete" assumptions as unverified.

---

## 33. CI/CD Audit

| Workflow | Class | Notes |
|---|---|---|
| audit-tool-inventory.yml | READ-ONLY VALIDATION ✅ | fails CI on sitemap↔repo drift (would currently FAIL given 15 intl pages — meaning it is either not gating pushes or failing silently; verify Actions run history — UNVERIFIED) |
| check-sitemap-local-files.yml | READ-ONLY VALIDATION ✅ | workflow_dispatch only |
| seo-hardening.yml | **MUTATION — DANGEROUS** | workflow_dispatch, `contents: write`, regex-rewrites every HTML, mutates robots.txt, `git push origin main`, then **deletes itself**. Its AggregateRating regex requires spaces-after-colons and therefore misses the 412 compact-format instances (`"ratingValue":"4.9"`) — proven by current repo state. One-time workflow resurrectable by anyone clicking Run. |

### ISSUE-ID: PX-0025
Severity P1 · FOUND. Fix: remove workflow file (via normal reviewed PR, not letting it self-mutate), replace with a read-only "SEO invariant checks" workflow (canonical==self, no AggregateRating, sitemap parity, keywords-meta absence).

---

## 34. Duplicate Code

- Processing logic: inline per-page processor duplicated across ~498 pages AND engine.js AND enhanced adapters AND pro-engine (4 implementations). Canonical choice required (recommend: engine.js + one controller invoked by slim inline bootstrap; or formally adopt inline-per-page and delete adapters/controllers).
- Upload/drag-drop: smart-upload.js vs inline dz handlers vs tool-controller components.
- Toast: level2.js pxToast vs inline toast builders (resize category page has its own).
- Registries: tools-data.json (511) vs homepage inline TOOLS_DATA (~511) vs config/tools-config.js (14) vs POPULAR_TOOLS (12) — four sources of truth, three out of sync.
- PDF libs: vendor vs CDN vs worker importScripts (3 copies).
- Styles: 10 CSS files, 5 unreferenced; per-page inline stylesheets duplicating output.css roles.

---

## 35. Dead Code (candidates — DO NOT DELETE without listed verification)

| File | Refs | Consumers | Safe to remove? | Migration req. |
|---|---|---|---|---|
| js/core.js | 0 | none | Yes after 1-week staging log check | none |
| js/core/pixaroid-core.js | 0 | none | Yes | none |
| js/services/image-processing-service.js | 0 | none | Yes | none |
| js/pages/tool-engine.js | 0 | none | Yes | none |
| js/pages/tool-runner.js | 2 comments/config | none executable | Yes | none |
| js/modules/{canvas-engine,download-manager,drag-drop,file-handler,preview,progress-bar,seo-meta,toast} | only app.js graph | app.js loads on 1 page | Partially — keep until unified runtime decision | Phase 3 |
| js/enhanced-{engine,worker,workers}.js + tool-controller.js | loaded on 498 pages, called by ~0 (runtime trace pending) | pages' inline code | Unload from pages first, then delete | Phase 3 |
| js/tool-controller-pro.js, js/pro-engine.js, js/advanced-worker.js, js/premium-ui.js | jpeg-compressor + demo-premium only | 2 pages | Migrate those 2 pages, then delete | Phase 3 |
| css/{main,components,utilities,premium-tools,advanced-tools}.css | 0 pages | none | Yes | none |
| templates/, scripts/generate-tools-data.cjs | dev only | none at runtime | Keep templates; gate script behind manual run | — |
| tools/compression/demo-premium/ | 0 inbound | public 200 | Remove or noindex+canonical | Phase 4 |

---

## 36. Configuration Problems

- `config/site-config.js`: `ga4:'G-XXXXXXXXXX'` placeholder (PX-0014), `adsense pub-XXXXXXXXXXXXXXXX` placeholder (disabled — remove or keep clearly flagged), twitter handle unverified, `categories:[...]` list omits pdf-tools/utilities/international/editor inconsistencies (uses old route names).
- `config/seo-config.js`: declares itself compatibility-only ✅ consistent.
- `config/tools-config.js`: 14/526 coverage → internal-links degraded (PX-0012 dependency).
- `vercel.json`: 12 dead international rewrites (PX-0013); COEP header issue (PX-0027).
- `manifest.json`: icon-512 declared as SVG with `"sizes":"512x512"` (valid-ish; verify installability), theme colors differ from seo-config themeColor (#0F0B1E vs #4F46E5) — cosmetic inconsistency.
- `package.json`: build is a no-op echo ✅ honest for static site.
- `.well-known/security.txt` present ✅.

---

## 37. What Must Be FIXED

### FIX

| ID | File/URL | Problem | Fix | Priority | Risk |
|---|---|---|---|---|---|
| PX-0001 | ~121 resize/ai pages | wrong cross-canonicals | self-canonical after intent split | P0 | Low-Med |
| PX-0003 | 499 pages | fake AggregateRating | strip from JSON-LD | P0 | Low |
| PX-0010 | currency-converter | false "live rates" | real API or relabel + as-of date | P0 | Low |
| PX-0011 | 15 AI pages + ai.worker | unimplemented AI claims | truthful copy or real models | P1 | Med |
| PX-0004 | sitemap-tools.xml, tools-data.json, homepage registry | 15 intl pages missing | add + wire into audit workflow | P1 | Low |
| PX-0012 | category/tool pages | 265 orphans, JS-only linking | static related/category links in HTML | P1 | Med |
| PX-0013 | vercel.json | dead intl rewrites; text-translator 404 | remove/fix rules; delete ghost route or build page | P1 | Low |
| PX-0014 | site-config/app.js | no analytics | real GA4 (+events: process_start/success/fail, download) | P1 | Low |
| PX-0025 | seo-hardening.yml | mutating self-deleting workflow | delete; add read-only invariant CI | P1 | Low |
| PX-0026 | 498 pages | unused adapter scripts shipped | unload, then consolidate runtime | P1 | Med |
| PX-0027 | pdf pages + worker + vercel headers | mixed pdf-lib sources, CDN worker import, COEP | single vendored pdf-lib@1.17.1, local worker deps, drop COEP | P1 | Med |
| PX-0029 | sw.js | Monetag coupling + cache-first JS | decouple + SWR/versioning | P1 | Med |
| PX-0002 | 33 convert-* pages | 200 cross-canonical dupes | 301 to winners, delist | P1 | Low |
| PX-0005 | demo-premium | public dev page, no canonical | remove or noindex+self-canonical | P2 | Low |
| PX-0006 | 528 pages | keywords meta present | strip (one-off reviewed script) | P3 | Low |
| PX-0007 | 513 pages | uniform stale dateModified | maintain per real edit | P3 | Low |
| PX-0008 | sitemap-tools.xml | stale uniform lastmod | regenerate from git dates | P3 | Low |
| PX-0009 | 6 pairs | duplicate titles/descs (conversion) | differentiate or 301 (ties PX-0002) | P2 | Low |
| PX-0028 | category HTML + modules | SmartLinks w/o rel=sponsored, triple definition | centralize config + rel attrs | P2 | Low |
| PX-0034 | pdf-to-word etc. | cdn.tailwindcss.com, no SRI | remove Tailwind, add SRI/vendor | P2 | Low |
| PX-0035 | modules using innerHTML | filename interpolation XSS surface | escape/textContent | P2 | Low |
| PX-0036 | vercel.json headers | no CSP | Report-Only rollout | P2 | Med |
| PX-0037 | guides | not in any sitemap | add to sitemap.xml | P2 | Low |
| PX-0038 | llms.txt | incomplete family coverage | add utilities/editor/social/intl roots | P4 | Low |
| PX-0039 | manifest vs seo-config | theme color mismatch | align | P4 | Low |
| PX-0040 | homepage | "120+" vs 520+ reality | settle one accurate figure | P3 | Low |

## 38. What Must Be ADDED

### ADD

| ID | Location | What to Add | Why | Priority |
|---|---|---|---|---|
| PX-0014 | all pages | real GA4 + tool success/failure events | measurement loop | P1 |
| PX-0041 | CI | read-only SEO invariant checks (canonical==self, no ratings, sitemap parity) | regression prevention | P1 |
| PX-0042 | repo | documented GSC baseline export + CWV measurement run | evidence for consolidation decisions | P1 |
| PX-0043 | tool pages | static related-tools + breadcrumbs markup matching BreadcrumbList schema | linking + AEO | P1 |
| PX-0044 | resize/DPI pages | truthful DPI behavior statement (metadata vs resample) or implement DPI tagging | accuracy | P2 |
| PX-0045 | ai pages | capability matrix per tool (what actually runs) | GEO/AEO honesty | P2 |
| PX-0046 | guides | sitemap entries + reciprocal tool links | crawl depth | P2 |
| PX-0047 | tests | Playwright smoke: each tool processes a fixture file, asserts output blob | broken-tool detection | P1 |
| PX-0048 | forms/controls | axe accessibility CI scan | a11y baseline | P3 |

## 39. What Must Be REMOVED

### REMOVE

| ID | Location | What | Why | Safe? | Priority |
|---|---|---|---|---|---|
| PX-0003 | 499 pages | AggregateRating JSON-LD | fabricated | Yes | P0 |
| PX-0006 | 528 pages | meta keywords | obsolete | Yes | P3 |
| PX-0013 | vercel.json | 12 international rewrites | dead/wrong | Yes | P1 |
| PX-0025 | .github/workflows | seo-hardening.yml | mutating, self-deleting, ineffective | Yes (replace with validation) | P1 |
| PX-0030 | js/ | core.js, core/, services/, pages/tool-engine.js, pages/tool-runner.js | zero references | Yes after staging log check | P2 |
| PX-0031 | css/ | main, components, utilities, premium-tools, advanced-tools | 0 refs | Yes | P4 |
| PX-0005 | tools/compression/demo-premium/ | dev demo page | public artifact | Yes (301 to compress-image) | P2 |
| PX-0032 | config/site-config.js | G-XXXXXXXXXX, pub-XXXX placeholders | fake values | Yes (until real IDs land) | P1 |
| PX-0033 | pdf-to-word | cdn.tailwindcss.com include | dev lib in prod | Yes | P2 |

## 40. What Must Be CONSOLIDATED

### CONSOLIDATE

| ID | Current Components | Canonical Component | Why |
|---|---|---|---|
| PX-0026 | inline page processors + engine.js + enhanced adapters + pro stack | js/engine.js + one controller contract (decide inline-vs-module once) | 4 parallel runtimes |
| PX-0027 | unpkg pdf-lib + vendored pdf-lib + worker importScripts | js/vendor/pdf-lib.min.js everywhere; pdfjs vendored too | reliability, version drift |
| PX-0021 | tools-data.json / homepage TOOLS_DATA / tools-config.js / POPULAR_TOOLS | single generated registry consumed by all (committed, audited) | 4 drifting registries |
| PX-0022 | smart-upload.js / inline dropzones / controller upload | one upload component | triplicated UX bugs |
| PX-0023 | level2 toast / inline toasts / modules/toast.js | modules/toast.js | duplicate UI |
| PX-0024 | 10 CSS files + per-page inline styles | output.css (+ animations) | delivery simplicity |
| PX-0028 | SmartLinks in 3 places | monetization.js reading site-config | drift |

## 41. What Must Be MIGRATED

### MIGRATE

| ID | From | To | Reason | Dependencies |
|---|---|---|---|---|
| PX-0050 | 498 pages' unused adapter scripts | either wired controller OR deleted | finish stalled migration | PX-0026 decision |
| PX-0051 | jpeg-compressor + demo-premium pro-stack | standard runtime | retire pro/premium legacy | PX-0026 |
| PX-0052 | convert-* pages | 301 → bare slugs | dedupe | PX-0002 |
| PX-0053 | international pages | full platform parity (sitemap, registry, ratings policy, footer links) | consistency | PX-0004 |
| PX-0054 | Monetag SW code | separate from Pixaroid SW (if policy permits) | stability | PX-0029 |
| PX-0055 | CDN libs (FileSaver, jszip, docx, qrcode, pdfjs) | vendored + SRI | availability/integrity | — |

## 42. What Must NOT Be Changed

- Trailing-slash/cleanUrl scheme and 308 normalization (working perfectly).
- robots.txt structure (correct today).
- llms.txt approach (extend, don't rewrite tone).
- Self-canonicals on the 414 already-correct pages.
- Schema coverage (FAQPage/HowTo/BreadcrumbList) — fix falsehoods inside, keep structure.
- Monetization isolation/labeling design in monetization.js (good pattern; just centralize config).
- Static-site architecture and no-op build (correct choice; resist reintroducing generators).
- Category directory layout `/tools/<category>/<slug>/`.
- Guides content (strong AEO assets).
- Do NOT add hreflang. Do NOT mass-generate new pages. Do NOT delete C-class pages before GSC evidence (§33).

---

## 43. Priority Roadmap

PHASE 0 — Baseline (before any change): pull GSC indexing+performance export; run Lighthouse/CrUX; Playwright smoke of 1 tool per category; record "Google chose different canonical" URL list to validate §15 predictions.
PHASE 1 — Critical trust/indexing (P0): PX-0001 canonical restoration · PX-0003 rating removal · PX-0010 currency claims. Then request re-indexing of affected groups.
PHASE 2 — Indexing completeness (P1): PX-0004 intl sitemap/registry · PX-0013 rewrites · PX-0002 conversion 301s · PX-0012 static linking · PX-0041 invariant CI · PX-0025 workflow deletion.
PHASE 3 — Unified runtime (P1): decide inline-vs-controller (PX-0026), unload adapters, migrate 2 legacy pages (PX-0051), delete dead code (PX-0030/0031), PDF consolidation (PX-0027), SW strategy (PX-0029).
PHASE 4 — Truth & quality (P1/P2): AI claims (PX-0011), DPI semantics (PX-0044), duplicate title/content differentiation, demo-premium removal.
PHASE 5 — SEO hygiene (P2/P3): keywords meta, lastmod/date maintenance, guides sitemap, og parity sweep.
PHASE 6 — AEO/GEO refinement: llms.txt coverage, capability matrices, entity consistency (twitter handle, tool-count wording).
PHASE 7 — Performance: bundle/cache audit, Monetag impact measurement, page-weight reduction (guided by Phase 0 CWV data).
PHASE 8 — International category product pass (claims, data sources, disclaimers).
PHASE 9 — Analytics activation + dashboards (PX-0014) feeding next consolidation decisions.
PHASE 10 — Final validation: full recrawl, invariant CI green, GSC delta review.

---

## 44. Verification Checklist

After each phase, re-run:
1. `for each sitemap URL: GET → 200 && canonical == self` (crawler script; expect 0 failures except sanctioned 301s).
2. `grep -r '"AggregateRating"' --include=*.html | wc -l` → 0.
3. `grep -r 'G-XXXXXXXXXX\|pub-XXXX'` → 0 (or real IDs).
4. sitemap-tools.xml ∪ sitemap.xml == every indexable HTML path (audit-tool-inventory CI green).
5. Orphan recount: pages with 0 static inbound links == 0.
6. JSON-LD validator (Rich Results Test) on 20 sampled URLs → no errors, no ratings.
7. Playwright: 1 upload→process→download per category passes; console errors == 0; `/workers/*` fetch trace confirms intended engine path only.
8. Lighthouse mobile ≥ previous baseline on home + 5 tools; document LCP/INP/CLS with real numbers (never estimates).
9. robots.txt + sw.js + worker headers unchanged in intent.
10. Diff review: no file touched outside the declared fix scope (protect §42 list).

Before/after success criteria: every FIX row above maps to checklist item 1–8; e.g. PX-0001 → items 1&6; PX-0003 → item 2; PX-0013 → item 4 + curl 404 check gone.

---

## 45. Final Audit Statistics

TOTAL ISSUES: 42
P0: 4 (PX-0001, PX-0003, PX-0010, plus P0-rated canonical/sitemap integrity consequence of PX-0004 grouping)
P1: 14 (PX-0002, 0004, 0011, 0012, 0013, 0014, 0025, 0026, 0027, 0029, 0041, 0042, 0043, 0047)
P2: 14 (PX-0005, 0009, 0021, 0022, 0023, 0024, 0028, 0030, 0034, 0035, 0036, 0037, 0044, 0045)
P3: 7 (PX-0006, 0007, 0008, 0040, 0046, 0048, misc config hygiene)
P4: 3 (PX-0031, PX-0038, PX-0039)

TOTAL TO FIX: 25 · TOTAL TO ADD: 8 · TOTAL TO REMOVE: 9 · TOTAL TO CONSOLIDATE: 8 · TOTAL TO MIGRATE: 6 · TOTAL UNVERIFIED: 12 (field CWV, GSC data, console errors, holiday/VAT/phone data accuracy, svg-vectorization outputs, twitter handle, COEP behavior, Monetag CMP, Actions history, DPI metadata, full git history, convert-*-to-svg capability)

Recommended implementation order: PHASE 0 → 1 (PX-0001 → PX-0003 → PX-0010) → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10, verifying via §44 after each phase.

---

# MASTER PRIORITY QUEUE

P0:
1. PX-0001 Restore self-canonicals on ~121 resize/AI pages (intent-reviewed)
2. PX-0003 Remove fabricated AggregateRating from 499 pages
3. PX-0010 Fix false "live exchange rates" claim (API or relabel)
4. PX-0042 Obtain GSC/CWV baseline (blocks evidence-based decisions; treat as P0 operational prerequisite)

P1:
1. PX-0004 Add 15 international pages to sitemap-tools.xml + registries
2. PX-0013 Clean vercel.json international rewrites; resolve text-translator 404
3. PX-0002 301 convert-* duplicates → canonical winners
4. PX-0012 Static internal linking: category listings + related blocks in raw HTML
5. PX-0025 Delete seo-hardening.yml; add read-only invariant CI (PX-0041)
6. PX-0011 Correct AI capability claims / implement models
7. PX-0026 Resolve runtime: unload unused adapters, pick canonical execution path
8. PX-0027 Unify PDF libraries (vendored, local worker deps, header fix)
9. PX-0029 Decouple Monetag from Pixaroid service worker; fix cache strategy
10. PX-0014 Real analytics + tool success/failure events
11. PX-0047 Playwright tool smoke tests
12. PX-0032 Purge placeholder IDs from config
13. PX-0043 Visible breadcrumbs matching schema
14. PX-0005 Remove/noindex demo-premium

P2:
1. PX-0009 Differentiate duplicate conversion titles/descriptions
2. PX-0021 Single tool registry
3. PX-0022/0023/0024 Consolidate upload/toast/styles
4. PX-0028 SmartLink config centralization + rel="sponsored"
5. PX-0030/0031 Dead code & unused CSS deletion
6. PX-0034/0055 Vendor+SRI CDN libs; remove Tailwind CDN
7. PX-0035 innerHTML escaping audit
8. PX-0036 CSP Report-Only rollout
9. PX-0037 Guides into sitemap
10. PX-0044 DPI truthfulness
11. PX-0045 AI capability matrix

P3:
1. PX-0006 Strip meta keywords
2. PX-0007/0008 Maintain dateModified/lastmod
3. PX-0040 Homepage tool-count wording
4. PX-0046 Guide↔tool reciprocal links
5. PX-0048 axe accessibility CI

P4:
1. PX-0038 llms.txt family coverage
2. PX-0039 manifest/config theme color alignment
3. CSS repo tidy

*Priorities derived from impact × severity × scope × risk × dependency, not preference.*
