# Pixaroid V2 — New Architecture

Pixaroid V2 is a clean rebuild of the image/PDF utility platform. It is intentionally isolated from the current production implementation until it passes validation.

## Design direction

V2 must **not copy the existing Pixaroid website design**. The visual system is new and independently structured:

- Editorial utility-workbench aesthetic
- Large asymmetric workspace layout
- Compact command rail instead of the current category/navigation pattern
- Distinctive typography hierarchy
- Generous canvas/workspace area
- Tool-specific accent treatment generated from configuration
- Accessible light/dark themes
- Mobile-first responsive behavior
- No reuse of existing Pixaroid page markup or CSS as a visual template

## Architecture principles

1. One configuration registry defines every tool.
2. One `ToolEngine` contract owns processing lifecycle.
3. UI controllers never implement duplicate image-processing algorithms.
4. Workers expose a common request/result/error contract.
5. PDF processing is isolated from image workers.
6. AI processing is isolated behind an explicit provider boundary.
7. HEIC has its own verified decoder boundary.
8. No API secrets are shipped to the browser.
9. SEO/schema/sitemap are generated from the same registry.
10. A tool must have exactly one active processing path.
11. Every migrated tool requires automated contract validation before production.
12. Current production remains untouched while V2 is developed.

## Initial V2 scope

### Core image tools

- Compress Image
- Resize Image
- JPG to PNG

### Later migration groups

- Image compression variants
- Image conversion
- Image resizing/social presets
- Image editing
- PDF tools
- HEIC tools
- AI tools
- International utilities

## Directory plan

```text
v2/
├── README.md
├── ARCHITECTURE.md
├── DESIGN-SYSTEM.md
├── TOOL-CONTRACT.md
├── MIGRATION-PLAN.md
├── app/
│   ├── index.html
│   ├── styles/
│   └── components/
├── config/
├── engine/
├── workers/
├── tools/
└── tests/
```

V2 is experimental until its automated and browser-level tests pass. No production routes are changed by this foundation commit.
