# 004 — Testing

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
- Tests live in `tests/`:
  - `tests/lib/password.test.ts` — unit tests for scrypt hash/verify.
  - `tests/auth.test.ts` — integration tests for the login/session/logout flow,
    driven through `app.request(...)` against a real app instance.
  - `tests/helpers/db.ts` — builds the test database.

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
