# Fridge

Fridge is a meal planning system exposed as a public, OAuth-protected MCP server
with a companion web UI.

## Design Direction

- **Public deployment first.** The server is built to run on the public internet,
  not just locally. Assume untrusted clients.
- **OAuth-based MCP.** MCP access is authenticated via OAuth (Streamable HTTP
  transport), not an unauthenticated local stdio process. Auth is a first-class
  concern, designed in from the start rather than bolted on.
- **MCP integrated into the web server.** MCP is served by the same Hono process
  as the web UI (one deployment, one auth layer), not a separate stdio process.
  Because of this, app code lives directly under `src/` rather than being split
  into `src/web` and `src/mcp`.
- **No signup flow.** The admin account is provisioned via the seed script
  (`db/seed.ts`). Its name and password come from the environment (`SEED_ADMIN_*`,
  see `.env.example`), so nothing user-specific is committed. `name` is the unique
  login identifier. The password is hashed with scrypt at seed time and only the
  hash is stored.

## Tech Stack

- Runtime: Node.js, managed via Volta (`package.json` `volta.node`).
- Package manager: npm.
- Web server: Hono on `@hono/node-server`.
- Language: TypeScript. `tsx` for local dev; production runs compiled JS from `dist/`.
- Build: `tsc` + `tsc-alias` (rewrites the `@/*` alias to relative paths so plain `node` can run the output).
- Database: PostgreSQL (local via Docker Compose, prod via Render Postgres).
- ORM: Drizzle (`drizzle-orm/node-postgres`); migrations via `drizzle-kit`.
- Auth: session via signed httpOnly cookie (`hono/jwt`); passwords hashed with
  Node's built-in `crypto.scrypt` (no native dependency).
- Testing: Vitest. DB-backed tests run against in-memory Postgres (PGlite), so no
  Docker is needed to run the suite.
- Lint/format: Biome.
- Hosting: Render (free plan), configured via `render.yaml`.

## Repository Layout

```text
src/
  index.ts        Server entrypoint (runs migrations, then starts Hono)
  app.ts          App assembly and route mounting
  auth.ts         Session cookie + auth middleware (sessionMiddleware, requireAuth)
  db/
    schema.ts     Drizzle schema
    index.ts      DB connection (reads DATABASE_URL)
    migrate.ts    Applies migrations on startup
  lib/
    password.ts   scrypt hash/verify
  routes/         Hono route modules (auth, home)
db/
  migrations/     drizzle-kit migrations (committed)
  seed.ts         Seed users (no signup flow)
tests/            Vitest tests (+ helpers/db.ts: PGlite test DB)
```

The `@/*` path alias maps to `src/*`, and `@test/*` to `tests/*`.

## Commands

Run npm commands through `volta run` so the pinned Node.js version is used.

```bash
volta run npm install        # install dependencies
volta run npm run db:up      # start local Postgres (docker compose)
volta run npm run db:down    # stop local Postgres
volta run npm run db:generate # generate a migration from schema changes
volta run npm run db:seed    # seed admin user (needs SEED_ADMIN_* in .env)
volta run npm run dev        # tsx watch on :3000 (local dev)
volta run npm run build      # compile TS to dist/ via tsc + tsc-alias
volta run npm run start      # run compiled dist/index.js (what prod runs)
volta run npm run typecheck  # tsc --noEmit
volta run npm run lint       # biome check src tests
volta run npm run format     # biome format --write src tests
volta run npm test           # vitest run
```

Local setup: `cp .env.example .env`, fill `SEED_ADMIN_*`, then
`db:up` → `db:seed` → `dev`. `PORT` overrides the default port (3000); Render
injects `PORT` at runtime.

`.env` is gitignored and holds local secrets (`DATABASE_URL`, `SESSION_SECRET`,
`SEED_ADMIN_*`). In production set these in the Render dashboard instead.

## Deployment

Hosted on Render's free plan as a web service, defined in `render.yaml`:

- Build: `npm install --include=dev && npm run build` — `--include=dev` is required
  because Render sets `NODE_ENV=production`, which would otherwise skip the
  `typescript`/`tsc-alias` devDependencies needed to build.
- Start: `npm run start` (`node dist/index.js`).
- Health check: `GET /health`.
- Node version pinned via `NODE_VERSION` (render.yaml) and `.node-version`.
- Required env vars (set in the Render dashboard, not committed): `DATABASE_URL`
  (Render Postgres), `SESSION_SECRET`.

Free-plan caveats to design around: the service sleeps after ~15 min idle
(30–60s cold start on next request), and there is no persistent disk — durable
state lives in Render's managed Postgres, not on the instance.

## Notes

- This is a fresh implementation. Architectural choices are recorded here as new
  decisions rather than inherited assumptions.
