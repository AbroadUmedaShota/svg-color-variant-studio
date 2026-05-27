# SVG Color Variant Studio

Static GitHub Pages tool for reviewing and exporting safe SVG logo color variants.

## Purpose

This tool edits SVG color attributes while preserving the source vector structure. It is designed for logo color review, sample boards, and handoff exports, not pixel painting.

## Features

- Loads `speedad-login-header-logo.svg` by default.
- Recolors fill, stroke, stroke width, and review background.
- Builds a local Variant Board with names, notes, status, and HEX chips.
- Exports SVG without canvas tracing or PNG embedding.
- Exports PNG at 2x or 4x using canvas only as a render target.
- Copies inline SVG, CSS variables, and palette JSON.
- Rejects raster embedded SVGs and removes unsafe SVG elements/attributes.
- Runs as plain static files with no CDN dependency.

## Local Use

Open `index.html` directly, or run a local static server for the same fetch path used by GitHub Pages:

```powershell
python -m http.server 4173
```

Then open `http://127.0.0.1:4173/`.

## GitHub Pages

Publish this repository from the `main` branch root. The `.nojekyll` file is included so GitHub Pages serves the static assets directly.

## Source SVG Requirements

The source SVG should be vector-based and should not include raster `<image>` elements. The built-in source uses:

- `viewBox="0 0 1134 991"`
- 4 `<path>` elements
- `role="img"`
- `aria-label="SPEED AD header logo"`
- `fill-rule="evenodd"`

## Scope

Out of scope: brush tools, bucket fill, eraser, Bezier/path editing, server save, authentication, and collaborative editing.
