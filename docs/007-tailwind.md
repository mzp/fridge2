# 007 — Tailwind CSS

**Status:** Implemented

How styling works and why it is wired this way. Commands live in the Develop/UI
workflow in [CLAUDE.md](../CLAUDE.md).

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

## Palette tokens (`@theme`)

Colors are named tokens defined once in a `@theme` block, so a restyle is one place.
Tailwind turns each `--color-<name>` into utilities (`bg-primary`, `text-danger`, …)
that the component classes consume — never raw scale colors like `emerald-600`.

```css
@import "tailwindcss";

@theme {
  --color-primary: #059669;
  --color-primary-hover: #047857;
  --color-secondary: #4b5563;
  --color-secondary-hover: #374151;
  --color-danger: #dc2626;
  --color-danger-hover: #b91c1c;
}
```

## Semantic classes, not inline utilities

**Do not scatter raw utility classes (especially colors) across the markup.** Define
**semantic component classes** in `src/style/` (split by area: theme, navigation,
form, calendar) with `@apply` inside
`@layer components`, referencing the palette tokens, and apply those names in the
templates — so the markup reads by intent.

```css
@layer components {
  .page-title {
    @apply mb-6 text-2xl font-bold text-primary;
  }
  .btn {
    @apply inline-flex items-center justify-center rounded border font-medium transition-colors;
  }
  .btn-primary {
    @apply border-primary bg-primary text-white hover:border-primary-hover hover:bg-primary-hover;
  }
  .btn-danger {
    @apply border-danger text-danger hover:bg-red-50;
  }
}
```

In a view: `<h1 class="page-title">…</h1>`, `<button class="btn btn-md btn-primary">…</button>`.
Raw utilities are fine only for one-off layout (`class="flex gap-3"`); anything with a
color or reused across pages becomes a semantic class, defined the same way against
the palette tokens.

## Layout shell

`src/views/layout.ts` is the page shell every view wraps with: the document head
(loads `/dist.css`), a `.site-header` with the brand (showing `Fridge[dev]` outside
production) and — when a user is signed in — their name and a sign-out button, then
the page content in a centered `.page` container. Views call
`layout(title, body, { user })`.

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
| `css:build` | `npx @tailwindcss/cli -i src/style/index.css -o public/dist.css` — compile the stylesheet. |
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
