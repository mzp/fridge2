# 005 — npm Commands

**Status:** Implemented

Reference for every npm script. Run them through `volta run` so the pinned Node.js
version is used (e.g. `volta run npm run dev`). For *when* to use them, see the
workflows in [CLAUDE.md](../CLAUDE.md).

## App

| Command | What it does |
|---|---|
| `dev` | Build the CSS, then start the dev server with `tsx watch` on `:3000`. Loads `.env` if present. Does **not** auto-migrate or seed (that is production-only). |
| `build` | Build the CSS, then compile TypeScript to `dist/` via `tsc` + `tsc-alias` (rewrites the `@/*` alias so plain `node` can run it). |
| `start` | Run the compiled app: `node dist/index.js`. This is what production runs; on boot it migrates + seeds when `NODE_ENV=production`. Loads `.env` if present. |
| `css:build` | Compile `public/style.css` → `public/dist.css` with the Tailwind CLI. Wired into `dev`/`build`/`start:e2e`. See [007-tailwind.md](./007-tailwind.md). |
| `css:watch` | Same as `css:build` with `--watch`, for iterating on classes in dev. |

## Quality

| Command | What it does |
|---|---|
| `check` | Umbrella gate: runs `typecheck` → `lint` → `test`, stopping at the first failure. The one command to run before finalizing a change. |
| `typecheck` | `tsc --noEmit` over `src` and `tests`. |
| `lint` | `biome check src tests` (lint + import/format checks, no writes). |
| `format` | `biome format --write src tests` (apply formatting). |
| `test` | `vitest run` — unit + route tests once (E2E is separate). See [004-test.md](./004-test.md). |
| `test:watch` | `vitest` in watch mode for local iteration. |
| `test:mcp` | `vitest run tests/mcp` — just the MCP OAuth + ping smoke test, over real HTTP. |

## End-to-end (Playwright, Docker)

E2E always runs in the official Playwright Docker image for deterministic
screenshots. See [004-test.md](./004-test.md).

| Command | What it does |
|---|---|
| `e2e` | Run the E2E suite in the Playwright Docker image: `docker compose run --rm e2e`. Needs `db:up`. |
| `e2e:update` | Same, but regenerate screenshot baselines (`--update-snapshots`). Run after an intended UI change, then commit the PNGs. |
| `test:e2e` | `playwright test` — the runner itself. Invoked **inside** the Docker container / CI, not directly on the host. |
| `start:e2e` | Boots the app for E2E (`scripts/start-e2e.ts` with `.env.test`): ensures `fridge_test`, migrates, seeds. Launched by Playwright's `webServer`, not run directly. |

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
