# Pixaroid CSS Architecture

The production site is a static HTML application. CSS files under this directory are runtime assets; Vercel deployment must not regenerate or mutate them.

## Active production styles

- `output.css` — primary production stylesheet used by the current static tool/category pages and cached by the service worker.
- `animations.css` — small shared animation layer loaded by production category/tool pages.
- `main.css` — legacy/Tailwind-oriented compatibility stylesheet retained because older standalone pages still reference it.

## Legacy compatibility styles

- `premium.css` — legacy premium/demo stylesheet referenced by the premium demo page.
- `premium-tools.css` — legacy premium-tool definitions retained for compatibility; no current repository references were found during the CSS audit.
- `advanced-tools.css` — legacy advanced component definitions retained for compatibility; no current repository references were found during the CSS audit.
- `components.css` — legacy Tailwind component source retained for compatibility; it contains `@apply` directives and is not a browser-ready standalone stylesheet without a Tailwind build step.
- `utilities.css` — legacy utility stylesheet retained for compatibility.

## Change policy

Do not add build-time CSS generators or scripts. Production CSS should only be changed when there is a verified runtime consumer, visual bug, accessibility issue, performance issue, or intentional design-system update. Avoid speculative rewrites because `output.css` is consumed directly by the static site.
