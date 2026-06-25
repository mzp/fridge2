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
- Language: TypeScript, run directly with `tsx` (no separate build step yet).
- Lint/format: Biome.

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
volta run npm run dev        # start with file watching on :3000
volta run npm run start      # start once on :3000
volta run npm run typecheck  # tsc --noEmit
volta run npm run lint       # biome check src
volta run npm run format     # biome format --write src
```

`PORT` overrides the default port (3000).

## Notes

- This is a fresh implementation. Architectural choices are recorded here as new
  decisions rather than inherited assumptions.
