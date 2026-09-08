# Pixaroid V2 Architecture

## 1. Application layers

```text
Presentation
   ↓
Tool Controller
   ↓
ToolEngine
   ↓
Worker Adapter
   ↓
Dedicated Worker / Specialized Engine
   ↓
Result Normalizer
   ↓
Presentation
```

### Presentation

Owns layout, controls, drag/drop, progress display, previews, errors, downloads and accessibility. It does not contain processing algorithms.

### Tool Controller

Translates UI events into a typed `ToolRequest`. It knows the selected tool and its configured controls, but not worker implementation details.

### ToolEngine

The only public processing entry point for V2. It validates the request, chooses the configured adapter, tracks cancellation/progress, normalizes results, releases resources and reports errors.

### Worker Adapter

A small adapter translates the generic request into the worker's operation contract. Workers never manipulate the page DOM.

## 2. Common request contract

```js
{
  toolId,
  operation,
  input: { buffer, mime, name },
  options,
  requestId
}
```

## 3. Common result contract

```js
{
  requestId,
  ok: true,
  output: { blob, mime, name },
  metadata: { width, height, originalSize, resultSize },
  warnings: []
}
```

Errors use:

```js
{
  requestId,
  ok: false,
  error: { code, message, recoverable }
}
```

## 4. Worker groups

### Image compression

`compress.worker.js`

### Image conversion

`convert.worker.js`

### Image resize

`resize.worker.js`

### Image editing

`filter.worker.js`

### PDF

Dedicated PDF adapter/engine. It never routes through image workers.

### HEIC

Dedicated HEIC decoder adapter. It never relies on DOM-only APIs inside a Worker.

### AI

Explicit provider adapter with secure server-side/API boundary where required.

## 5. Lifecycle

```text
select file
 → validate
 → create request
 → process
 → progress
 → normalize result
 → preview
 → download
 → revoke object URLs / cleanup
```

Cancellation must terminate the active worker/job and leave the UI in a reusable state.

## 6. Tool registry

Every tool declares:

- id
- slug
- title
- category
- interface type
- execution adapter
- accepted formats
- output formats
- controls
- limits
- SEO metadata
- schema metadata

The registry is the source of truth for application UI and SEO generation.

## 7. Isolation from production

All V2 files remain under `v2/` during the foundation stage. Existing production files, routes and homepage are not modified by this branch.
