# Pixaroid V2 Design System

V2 must be visually distinct from the current Pixaroid site. Do not copy its layout, card system, navigation, colors, spacing, hero composition, or page markup.

## Visual concept: Utility Atelier

A focused digital workbench that feels closer to a professional creative instrument than a conventional SaaS dashboard.

### Layout

- Desktop: asymmetric two-zone workspace.
- Left: compact vertical command rail.
- Center: dominant processing canvas.
- Right: contextual settings/results drawer.
- Mobile: command rail becomes a compact top control strip; settings become a bottom sheet.
- No traditional grid of tool cards as the primary interface.

### Surfaces

- Neutral base canvas.
- Layered workspace panels with subtle borders.
- Strong distinction between active workspace and secondary information.
- Rounded geometry should be moderate, not pill-heavy.

### Typography

Use a distinctive modern grotesk for headings and a highly readable system/UI sans for controls. Keep headings short and task-oriented.

### Color direction

Do not reuse the existing Pixaroid electric-blue visual identity. Use a new neutral foundation with a warm signal accent and a secondary cool accent. Exact tokens are to be finalized during implementation.

### Interaction

- Drag-and-drop is the primary file entry.
- Processing state is represented inside the workspace, not by a generic page spinner.
- Results appear as an explicit before/after state.
- Controls progressively disclose advanced options.
- Keyboard shortcuts should be available for frequent actions.

### Accessibility

- WCAG-oriented contrast.
- Visible focus states.
- Full keyboard operation.
- Reduced-motion support.
- Screen-reader labels for all controls.
- Do not rely on color alone for state.

### Brand behavior

Pixaroid branding remains recognizable, but the V2 visual language must be independently designed. The current production site's CSS and HTML should not be copied as the V2 component foundation.
