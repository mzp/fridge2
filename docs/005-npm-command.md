# 005 — npm Commands

Reference for every npm script. Run them through `volta run` so the pinned Node.js
version is used (e.g. `volta run npm run dev`). For *when* to use them, see the
workflows in [CLAUDE.md](../CLAUDE.md).

## App

| Command | What it does |
|---|---|
| `dev` | Start the dev server with `tsx watch` on `:3000`. Loads `.env` if present. Does **not** auto-migrate or seed (that is production-only). |
| `build` | Compile TypeScript to `dist/` via `tsc`, then `tsc-alias` to rewrite the `@/*` alias to relative paths so plain `node` can run it. |
| `start` | Run the compiled app: `node dist/index.js`. This is what production runs; on boot it migrates + seeds when `NODE_ENV=production`. Loads `.env` if present. |

## Quality

| Command | What it does |
|---|---|
| `check` | Umbrella gate: runs `typecheck` → `lint` → `test`, stopping at the first failure. The one command to run before finalizing a change. |
| `typecheck` | `tsc --noEmit` over `src` and `tests`. |
| `lint` | `biome check src tests` (lint + import/format checks, no writes). |
| `format` | `biome format --write src tests` (apply formatting). |
| `test` | `vitest run` — the full test suite once. See [004-test.md](./004-test.md). |
| `test:watch` | `vitest` in watch mode for local iteration. |

## Database

| Command | What it does |
|---|---|
| `db:up` | Start local Postgres via Docker Compose (detached). |
| `db:down` | Stop the local Postgres container. |
| `db:push` | `drizzle-kit push` — sync `src/db/schema.ts` straight into the dev DB, including destructive changes. The fast dev path; no migration files. |
| `db:generate` | `drizzle-kit generate` — create a committed migration in `db/migrations/` from the current schema. Run before opening a PR. |
| `db:migrate` | `drizzle-kit migrate` — apply committed migrations. Useful to verify the production path locally. |
| `db:seed` | Seed the admin user from `SEED_ADMIN_*` in `.env` (`scripts/seed.ts`). Idempotent. |
| `db:reset` | Rebuild a clean dev DB: drop schemas (`scripts/reset.ts`) → `db:push` → `db:seed`. |

Why dev (push) and prod (migrations) differ: [003-render.md](./003-render.md).
