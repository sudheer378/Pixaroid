# Pixaroid — 527-Tool Indexing Policy

## Purpose

Protect useful long-tail search pages while preventing near-duplicate tool variants from competing unnecessarily.

## Current evidence

Google Search Console's latest settled 28-day sitemap report contains 527 tool URLs. 32 of those URLs received Search Console performance data during the period. This is performance visibility, not a claim that exactly 32 URLs are officially indexed.

Examples with demonstrated search visibility include Chromebook resize (370 impressions, average position 10.06), iPad wallpaper resize (239 impressions), JPG-to-15KB compression (346 impressions), and JPEG-to-500KB compression (225 impressions).

## Tier A — Protect and strengthen

A page belongs here when it has meaningful Search Console impressions/clicks, ranks for a distinct intent, or is a strategically important core tool.

Actions:
- Keep indexable.
- Keep a self-referencing canonical.
- Keep in sitemap.
- Give it a unique title, H1 and description.
- Add useful explanatory content and relevant internal links.
- Do not consolidate solely because another page has similar wording.

## Tier B — Keep and improve

Useful tool pages with a distinct task but little or no current Search Console visibility.

Actions:
- Keep indexable initially.
- Ensure the tool actually performs the stated task.
- Improve unique explanatory content, metadata and internal links.
- Re-evaluate after Google/Bing have had time to crawl the improved pages.

## Tier C — Consolidation candidates

Pages should only enter this tier after confirming that their user intent and actual tool behavior are substantially the same as another URL.

Typical investigation clusters:
- JPG vs JPEG versions of the same conversion.
- Multiple URLs differing only by generic wording such as `convert-*` vs `*-to-*`.
- Extremely large families of size variants where the underlying tool behavior is identical.
- Multiple social-platform URLs that provide no meaningful platform-specific difference.

Actions must be deliberate:
1. Select the strongest canonical target based on intent, search demand and usefulness.
2. Prefer a permanent redirect when the old URL should resolve to the replacement.
3. Update internal links and sitemap.
4. Only use noindex when consolidation/redirect is not appropriate.
5. Never remove a page solely because it currently has zero impressions.

## Guardrails

- Never automatically noindex all zero-impression URLs.
- Never automatically merge pages based only on slug similarity.
- Never use aggregate ratings or unsupported performance claims.
- Keep sitemap URLs indexable and self-canonical.
- Validate representative live URLs after each large change.
- Re-submit changed URLs through IndexNow for Bing discovery; IndexNow does not guarantee indexing.

## Current priority

First strengthen pages already producing impressions, then improve high-value unique Tier B pages. Only after that should confirmed duplicate clusters be consolidated.
