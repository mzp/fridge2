# Fridge

Fridge is a meal planning system exposed as a public, OAuth-protected MCP server
with a companion web UI.

## Design Direction

- **Public deployment first.** The server is built to run on the public internet,
  not just locally. Assume untrusted clients.
- **OAuth-based MCP.** MCP access is authenticated via OAuth (Streamable HTTP
  transport), not an unauthenticated local stdio process. Auth is a first-class
  concern, designed in from the start rather than bolted on.

## Tech Stack

- Runtime: Node.js, managed via Volta (`package.json` `volta.node`).
- Package manager: npm.
- Web server: Hono on `@hono/node-server`.
- Language: TypeScript. `tsx` for local dev; production runs compiled JS from `dist/`.
- Build: `tsc` + `tsc-alias` (rewrites the `@/*` alias to relative paths so plain `node` can run the output).
- Lint/format: Biome.
- Hosting: Render (free plan), configured via `render.yaml`.

## Repository Layout

```text
src/
  web/
    index.ts   Web server entrypoint
    app.ts     App assembly and route mounting
```

The `@/*` path alias maps to `src/*`.

## Commands

Run npm commands through `volta run` so the pinned Node.js version is used.

```bash
volta run npm install        # install dependencies
volta run npm run dev        # tsx watch on :3000 (local dev)
volta run npm run build      # compile TS to dist/ via tsc + tsc-alias
volta run npm run start      # run compiled dist/web/index.js (what prod runs)
volta run npm run typecheck  # tsc --noEmit
volta run npm run lint       # biome check src
volta run npm run format     # biome format --write src
```

`PORT` overrides the default port (3000). Render injects `PORT` at runtime.

## Deployment

Hosted on Render's free plan as a web service, defined in `render.yaml`:

- Build: `npm install --include=dev && npm run build` — `--include=dev` is required
  because Render sets `NODE_ENV=production`, which would otherwise skip the
  `typescript`/`tsc-alias` devDependencies needed to build.
- Start: `npm run start` (`node dist/web/index.js`).
- Health check: `GET /health`.
- Node version pinned via `NODE_VERSION` (render.yaml) and `.node-version`.

Free-plan caveats to design around: the service sleeps after ~15 min idle
(30–60s cold start on next request), and there is no persistent disk — durable
state must live in an external store (e.g. Render's free Postgres), not local
SQLite.

## Notes

- This is a fresh implementation. Architectural choices are recorded here as new
  decisions rather than inherited assumptions.
