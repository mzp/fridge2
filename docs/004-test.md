# 004 — Testing

**Status:** Implemented

Why testing is set up the way it is. For the command, see [CLAUDE.md](../CLAUDE.md):
`npm run check` runs the whole suite (typecheck → lint → tests) in one shot.

## What `check` covers

`check` is the umbrella that gates a change. It runs, in order:

1. `typecheck` — `tsc --noEmit` over `src` and `tests`.
2. `lint` — `biome check src tests`.
3. `test` — `vitest run`.

It stops at the first failure. CLAUDE.md only documents `check` so there is one
canonical "is everything OK?" command; the individual scripts still exist as its
building blocks.

## Framework & layout

- **Vitest**, configured in `vitest.config.ts`.
  - `resolve.tsconfigPaths` makes the `@/*` and `@test/*` aliases resolve in tests.
  - `test.env` sets a fixed `SESSION_SECRET` so session signing is deterministic.
  - `fridge/**` is excluded — that directory holds the previous implementation and
    must never be run as part of this project's suite.
- Tests live in `tests/`, grouped by kind:
  - `tests/lib/` — pure unit tests (e.g. `password.test.ts`: scrypt hash/verify).
  - `tests/routes/` — route/integration tests via `app.request(...)` against a real
    app instance (e.g. `auth.test.ts`: login/session edge cases).
  - `tests/e2e/` — Playwright browser tests (`*.spec.ts`), excluded from vitest.
  - `tests/helpers/` — `db.ts` (PGlite test DB), `e2e.ts` (E2E reset + constants).

## Naming

- **`tests/lib/` and `tests/routes/`** mirror the source file they test: name the
  test after the module under `src/` (e.g. `src/routes/auth.ts` →
  `tests/routes/auth.test.ts`, `src/lib/password.ts` → `tests/lib/password.test.ts`).
  Organized by code structure.
- **`tests/e2e/`** is named after the URL/page under test, not the source file
  (e.g. the `/login` flow → `tests/e2e/login.spec.ts`). Organized by what the user
  visits, since one page may exercise many modules.

## DB-backed tests run on PGlite

`createTestDb()` (`tests/helpers/db.ts`) spins up an **in-memory Postgres (PGlite)**
and applies migrations to it. Consequences:

- The suite needs **no Docker** and no external Postgres — fast and hermetic.
- The PGlite handle is cast to the app's `Db` type; the runtime query API matches
  node-postgres, so app code runs unchanged against it.

## Tests apply committed migrations (drift guard)

The test DB is built by applying the **committed migrations** in `db/migrations/`,
not by pushing `schema.ts` directly. So if you change `schema.ts` but forget to
`db:generate` a migration, queries reference columns the migrated DB doesn't have
and tests fail. That failure is intentional — it catches schema/migration drift
before it can reach production. See [003-render.md](./003-render.md) for the
dev-vs-prod DB handling this ties into.

## End-to-end tests (Playwright)

`tests/e2e/*.spec.ts` drive a real browser against the running app. They are **not**
part of `check`; run them with `npm run e2e` (see [CLAUDE.md](../CLAUDE.md)).

- **Always run in Docker** (the official `mcr.microsoft.com/playwright` image, via
  the `e2e` service in `docker-compose.yml`). This is what makes visual snapshots
  reliable: the same Linux image renders pixel-identical screenshots on every
  machine and in CI, so baselines don't drift by OS. `npm run e2e` wraps
  `docker compose run`; CI runs the same image as a job container.
- The app under test is started by Playwright's `webServer` (`scripts/start-e2e.ts`),
  which uses `.env.test`. That script ensures the `fridge_test` database exists, runs
  migrations, and seeds the admin. `DATABASE_URL` points at the compose service
  `postgres`, so it only resolves inside the Docker network.
- Isolation: `POST /__test__/reset` (enabled only when `NODE_ENV=test`) clears data
  and re-seeds the admin; specs call it in `beforeEach`.

### Visual regression (design changes)

Specs assert `await expect(page).toHaveScreenshot(...)`. Baselines are committed
under `tests/e2e/<spec>-snapshots/` (e.g. `login-chromium-linux.png`).

- A change that alters rendering makes the screenshot diff and the test fails.
- When the change is intentional, regenerate baselines with `npm run e2e:update`
  and commit the updated PNGs.

**Why we commit the baselines: design review in PRs.** The point isn't only to
catch accidental regressions — because the baseline PNGs are committed, an
intentional UI change shows up as an *image diff* in the pull request. Reviewers
see the before/after of the actual rendered page next to the code, so design
changes get reviewed alongside the code that caused them. Updating a screenshot is
a deliberate, visible part of the diff, not a hidden side effect.

