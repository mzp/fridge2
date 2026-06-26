# 007 — Tailwind CSS

**Status:** Implemented

How styling works and why it is wired this way. Commands live in the Develop/UI
workflow in [AGENTS.md](../AGENTS.md).

## Approach

Tailwind v4 via the **standalone CLI** (`@tailwindcss/cli`), compiled to a single
static stylesheet that Hono serves. No PostCSS, no bundler, no front-end build tool —
the app is server-rendered `hono/html`, so all we need is a plain CSS file in the
page `<head>`.

Why this shape:

- **CLI over a bundler.** There is no Vite/webpack here and no client JS to bundle.
  The CLI scans our templates for class names and emits one CSS file.
- **Built file over the Play CDN.** `cdn.tailwindcss.com` is a dev-only convenience
  (ships the whole engine, compiles in the browser, no purge). A built,
  content-scanned stylesheet is what we serve.

## Semantic classes, not inline utilities

**Do not scatter raw utility classes (especially colors) across the markup.** Define
**semantic component classes** in `public/style.css` with `@apply` inside
`@layer components`, and apply those names in the templates. The palette (emerald
primary, red danger, gray for muted text/borders) lives in the stylesheet, not in the
views — so a restyle is one file, and the markup reads by intent.

`public/style.css`:

```css
@import "tailwindcss";

@layer components {
  .page {
    @apply max-w-lg mx-auto px-4 py-8;
  }
  .page-title {
    @apply text-2xl font-bold text-emerald-600 mb-6;
  }
  .btn {
    @apply inline-flex items-center justify-center rounded border font-medium transition-colors;
  }
  .btn-md {
    @apply px-4 py-2;
  }
  .btn-primary {
    @apply border-emerald-600 bg-emerald-600 text-white hover:border-emerald-700 hover:bg-emerald-700;
  }
  .btn-danger {
    @apply border-red-300 text-red-600 hover:bg-red-50;
  }
}
```

In a view: `<h1 class="page-title">…</h1>`, `<button class="btn btn-md btn-danger">…</button>`.
Raw utilities are fine only for one-off layout (`class="flex gap-3"`); anything with a
color or reused across pages becomes a semantic class (e.g. `.form-control`,
`.btn-secondary`, `.data-table-*`), defined the same way in `public/style.css`.

## Serving the stylesheet

Build output goes to `public/dist.css` (gitignored). Serve it from `src/app.ts`,
alongside `/health` (before `sessionMiddleware`, so the asset needs no session):

```ts
import { serveStatic } from "@hono/node-server/serve-static";

// inside createApp, next to app.get("/health", …):
app.use("/dist.css", serveStatic({ path: "./public/dist.css" }));
```

Reference it from a view's `<head>`:

```html
<link rel="stylesheet" href="/dist.css" />
```

Add `public/dist.css` to `.gitignore` — it is a build artifact, rebuilt on deploy.

## npm scripts

Add to `package.json` (run through `volta run`):

| Command | What it does |
|---|---|
| `css:build` | `npx @tailwindcss/cli -i public/style.css -o public/dist.css` — compile the stylesheet. |
| `css:watch` | same with `--watch` — rebuild on change in dev. |

Wire `css:build` into the entrypoints so the CSS is never stale:

- **`build`** — prepend it so production (Render) ships a fresh stylesheet:
  `"build": "npm run css:build && tsc -p tsconfig.build.json && tsc-alias -p tsconfig.build.json"`.
- **`dev`** — run a one-off `volta run npm run css:build` first, or `css:watch` in a
  second terminal while iterating on classes.

## Views

Page markup lives in `src/views/` as functions returning `hono/html` templates; the
route module in `src/routes/` calls the view and returns it. Keeping markup out of the
route keeps handlers about request/response and views about presentation.

## Verify

```bash
volta run npm run css:build   # produce public/dist.css
volta run npm run check        # typecheck + lint + tests still pass
volta run npm run dev          # open http://localhost:3000 and confirm styles load
```
