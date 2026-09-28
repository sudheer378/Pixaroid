# PIXAROID — FULL REPOSITORY PRE-LAUNCH AUDIT PROMPT FOR QWEN CODER

Repository: https://github.com/sudheer378/Pixaroid
Branch: main

MISSION
Perform a complete production-readiness audit of the ENTIRE Pixaroid repository before public launch/deployment.

This is a large static/Vercel-style website, not a simple framework app. Audit HTML, CSS, JS, tools, workers, assets, data, SEO files, baselines, scripts, Vercel configuration, service worker, manifests, CI, and deployment behavior.

Repository areas/files known to exist include:
- index.html, 404.html, about.html, contact.html
- privacy-policy.html, cookie-policy.html, terms-of-service.html
- tools/, workers/, js/, css/, assets/, scripts/, config/, templates/
- tools-data.json
- vercel.json, .vercelignore, manifest.json, sw.js
- robots.txt, sitemap.xml, sitemap-tools.xml, llms.txt, ads.txt
- PIXAROID_MASTER_AUDIT_REPORT.md
- PIXAROID_CANONICAL_BASELINE.csv
- PIXAROID_INTERNAL_LINK_BASELINE.csv
- internal_link_baseline_build.txt
- internal_link_final.txt
- canonical_baseline_log.txt
- prod_http_baseline.txt
- smoke_test_results.txt
- worker_baseline.txt
- SEO-INDEXING-POLICY.md
- SEO-TARGET-PAGES.md
- SEO-TIER-A-OPPORTUNITIES.md

Do not trust these documents/baselines as authoritative. Verify them against current code.

RULES
1. Audit actual current repository code.
2. Inspect the full repository tree before declaring completion.
3. Trace references between HTML, JS, CSS, tools, workers, JSON, config and deployment.
4. Every confirmed bug must include evidence: exact file/path, relevant logic, root cause, impact and reproduction/verification where possible.
5. Separate confirmed bugs, likely/unverified risks, architecture risks, missing tests and improvements.
6. Never mark an issue fixed until verified.
7. Preserve working functionality and the current architecture unless a real defect requires change.
8. Do not introduce unnecessary uploads, tracking, telemetry, remote processing or dependencies.
9. Do not blindly delete old files or scripts; prove whether they are referenced/required first.
10. Do not reintroduce scripts that mutate production source/data during every deployment.
11. Do not claim READY merely because a build or smoke test passes.

PHASE 1 — COMPLETE REPOSITORY INVENTORY
Inventory all files/directories:
- production pages
- tools
- JS/CSS
- workers
- service worker
- assets
- data/config
- scripts
- templates
- tests
- GitHub workflows
- SEO/indexing files
- baseline/audit artifacts
- deployment files

Find duplicate, dead, obsolete, abandoned, conflicting and generated files. Map important producers/consumers.

PHASE 2 — DEPLOYMENT/BUILD AUDIT
Determine exactly how the site deploys to Vercel.
Inspect:
- package.json/package-lock.json
- vercel.json
- .vercelignore
- .github/workflows
- scripts/
- config/

Run clean installation/build/deployment-equivalent checks where possible.

Verify:
- build commands are valid
- referenced scripts exist
- workflow commands match package.json
- Node/runtime assumptions are consistent
- Vercel routing is correct
- source/data files are not mutated by build/deployment
- tracked-file state remains clean after build/generation
- no obsolete generation script is triggered
- no multiple competing build pipelines cause drift

For scripts/, identify:
- purpose
- callers
- files modified
- whether still needed
- KEEP / DELETE / ISOLATE recommendation
Do not delete blindly.

PHASE 3 — COMPLETE PAGE/ROUTE AUDIT
Build a route/page inventory for every production URL.

For every page:
- exists
- loads
- correct status behavior
- title
- description
- canonical
- robots directive
- OG/Twitter metadata where relevant
- structured data where relevant
- navigation
- CSS/JS/assets
- no runtime errors
- mobile behavior
- correct internal links
- no duplicate page/slug
- no accidental noindex

Find:
- pages in sitemap but missing
- pages on disk but incorrectly omitted
- orphan pages
- broken links
- casing inconsistencies
- duplicate slugs
- canonical/redirect conflicts

PHASE 4 — TOOL-BY-TOOL AUDIT
Create:
Tool | URL | page | registry/data | JS | worker | input | output | dependencies | tests | status

For EVERY tool verify:
- page exists
- discoverable
- data/registry entry valid
- JS actually loads
- dependencies exist
- worker path valid if used
- inputs validate
- valid input works
- invalid/empty input handled
- large/boundary input handled
- repeated use works
- reset/retry works
- loading/progress works
- errors visible
- output correct
- output download works
- filename correct
- object URLs/resources cleaned
- worker errors surfaced
- no silent failures
- no obvious race/stale-state bug
- no tool is merely a UI shell

PHASE 5 — FILE/IMAGE/PDF PROCESSING
Audit all file-processing code:
- MIME/type validation
- extension spoofing
- corrupt/zero-byte files
- huge dimensions/pixel counts
- memory exhaustion
- image decode/canvas limits
- PDF corruption/encryption/large-page-count cases
- HEIC/HEIF where claimed
- output MIME and filenames
- download behavior
- cleanup

Test boundary cases where possible, including invalid and repeated processing.

PHASE 6 — WORKERS AND SERVICE WORKER
Audit workers/ and sw.js.

Workers:
- load/path
- message contracts
- malformed messages
- errors
- cancellation
- termination
- parallel jobs
- stale responses
- race conditions
- transferables
- memory leaks
- production browser compatibility

Service worker:
- registration/scope
- cache strategy
- cache versioning
- stale asset risks
- invalidation/update behavior
- offline/error handling
- navigation fallback
- sensitive-data caching
- cache size
- deployment behavior

A stale service worker must not be able to keep a broken version live indefinitely.

PHASE 7 — JAVASCRIPT DEEP AUDIT
Search all production JS for:
- undefined variables/functions
- null dereferences
- broken selectors
- missing dependencies
- unhandled promises
- swallowed errors
- event-listener duplication
- race conditions
- global-state problems
- stale closures
- browser API misuse
- unsupported browser assumptions
- memory leaks
- unsafe dynamic HTML/URLs
- dead branches
- duplicate functions

Specifically inspect:
innerHTML, outerHTML, insertAdjacentHTML, eval, Function, document.write, dynamic script injection, postMessage, storage APIs, fetch/XHR/sendBeacon, Blob/object URLs, Worker, serviceWorker.

PHASE 8 — CSS/UI/RESPONSIVE
Audit CSS for:
- conflicting/duplicate rules
- broken selectors
- !important abuse affecting behavior
- CSS variable failures
- overflow/fixed width
- z-index issues
- responsive failures
- invisible focus
- inaccessible controls
- dark/light inconsistency
- unused CSS

Check mobile/tablet/desktop, navigation, dialogs, upload controls, result areas and error states.

PHASE 9 — SEO / INDEXING
Audit:
- page title/meta
- canonicals
- robots.txt
- sitemap.xml
- sitemap-tools.xml
- HTTP status
- duplicate URLs
- trailing-slash policy
- host consistency
- HTTPS
- noindex
- orphan pages
- thin/duplicate pages
- stale sitemap entries
- missing indexable pages
- invalid XML
- canonical targets

Compare actual pages against:
- sitemap(s)
- internal links
- canonical baseline
- internal-link baseline
- SEO target documents
- actual HTML metadata

Report every mismatch and classify stale baseline vs actual defect.

PHASE 10 — GEO / AEO / LLM DISCOVERY
Audit:
- llms.txt
- aeo_geo_sample.txt
- JSON-LD/schema
- semantic heading structure
- FAQ/answer-ready structure
- entity consistency
- machine-readable tool metadata
- internal linking for discovery

Verify documentation claims against implementation. Avoid spammy/duplicate programmatic pages.

PHASE 11 — CANONICAL / INTERNAL-LINK CONSISTENCY
Explicitly compare:
- PIXAROID_CANONICAL_BASELINE.csv
- PIXAROID_INTERNAL_LINK_BASELINE.csv
- internal_link_baseline_build.txt
- internal_link_final.txt
- canonical_baseline_log.txt
against the current site.

For each mismatch decide:
- intentional
- stale baseline
- accidental regression
- broken canonical
- broken link
- duplicate URL
- redirect issue

PHASE 12 — SECURITY / PRIVACY
Audit:
- XSS/DOM injection
- unsafe URLs/javascript: URLs
- open redirects
- unsafe user-controlled HTML
- malicious files
- regex DoS/unbounded memory
- third-party scripts
- telemetry/tracking
- data leakage
- secrets/API keys/tokens in source
- service-worker cache privacy
- privacy-policy accuracy

Search specifically for secrets and network/data-exfiltration mechanisms.

PHASE 13 — PERFORMANCE
Audit:
- HTML/JS/CSS size
- duplicate libraries/assets
- render-blocking resources
- image sizing/lazy loading
- font loading
- tool bundle size
- worker size
- caching
- service worker overhead
- unused production assets
- code loaded globally but used by only one tool

PHASE 14 — ACCESSIBILITY
Check:
- semantic HTML
- labels
- alt text
- heading hierarchy
- link/button semantics
- keyboard navigation
- focus management
- ARIA
- form errors
- contrast
- reduced motion
- touch target sizes

PHASE 15 — DATA/CONFIG INTEGRITY
Audit:
- tools-data.json
- CSVs
- config files
- manifests
- generated data

Find duplicate IDs/slugs, malformed files, missing fields, orphan records and references to missing tools/pages.

PHASE 16 — VERCEL / ROUTING
Deeply inspect vercel.json:
- routes
- rewrites
- redirects
- headers
- clean URLs
- caching
- MIME handling
- security headers
- wildcard conflicts
- 404 behavior
- static assets
- worker routing
- service-worker routing
- robots/sitemap routing

PHASE 17 — CI/GITHUB ACTIONS
Inspect every workflow:
- trigger
- Node version
- installation
- caching
- tests/build
- generated-file mutations
- secrets
- deployment
- obsolete/deleted script references

PHASE 18 — TESTING
Audit existing tests and determine missing meaningful coverage for:
- tool discovery/loading
- processing
- malformed input
- downloads
- workers
- service worker
- routes/page existence
- sitemap validity
- canonical consistency
- internal links
- metadata
- critical mobile UI

Do not inflate coverage with trivial tests.

PHASE 19 — DEAD / DUPLICATE / OBSOLETE FILES
For each candidate file prove whether unused before recommending:
KEEP / DELETE / MOVE / ARCHIVE.

Include scripts, old audits, baselines, assets, CSS, JS, pages, tests and generated files.

PHASE 20 — RUNTIME SMOKE TEST
Run production-like checks where possible:
1. Home page
2. Navigation
3. Categories
4. Direct tool routes
5. CSS
6. JS
7. assets
8. valid tool operation
9. invalid input
10. output correctness
11. download
12. reset/retry
13. service-worker freshness
14. direct refresh
15. 404
16. robots.txt
17. sitemap.xml
18. sitemap-tools.xml
19. manifest
20. console errors
21. unexpected network requests
22. privacy violations

PHASE 21 — DETERMINISTIC BUILD
Record Git SHA and working-tree state before build.
After build/generation:
- check source/data changes
- compare checksums where useful
- identify generated changes
- prove deployment is deterministic

PHASE 22 — FIX CONFIRMED BUGS
For each confirmed defect:
1. root cause
2. smallest safe fix
3. regression test/check
4. rerun relevant verification
5. check for regression

Do not perform broad rewrites for isolated bugs.

SEVERITY
P0 = release blocker
P1 = critical
P2 = high
P3 = medium
P4 = low

REQUIRED FILES
Create/update:
1. AUDIT_PRELAUNCH_QWEN.md
2. AUDIT_FIX_PLAN.md

AUDIT_PRELAUNCH_QWEN.md must contain:
- Executive Summary
- exact audited Git SHA
- deployment model
- repository inventory
- build/deployment results
- page/route audit
- tool-by-tool matrix
- JS audit
- worker/service-worker audit
- CSS/UI audit
- security/privacy audit
- SEO/indexing audit
- GEO/AEO/LLM audit
- canonical audit
- internal-link audit
- Vercel audit
- CI/CD audit
- performance audit
- accessibility audit
- data/config audit
- dead/duplicate/obsolete code
- confirmed bugs with evidence
- likely/unverified risks
- fixes applied
- remaining work
- strict final production gate with PASS/FAIL

AUDIT_FIX_PLAN.md must contain only unresolved actionable work with:
priority | issue | exact path | required change | verification method

FINAL REPORT
Return:
- exact audited SHA
- deployment model
- commands/tests actually run
- pages audited
- tools audited
- issues by severity
- fixed vs remaining
- tests/checks added
- deployment verification
- READY / NOT READY
- exact blockers

Never say "looks good", "should be fine" or "0 bugs" without evidence.
Do not claim a feature works solely because the code exists.
Do not claim SEO is correct solely because sitemap/canonical files exist.
If a verification step is impossible, mark it UNVERIFIED rather than guessing.
