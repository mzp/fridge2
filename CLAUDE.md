# Fridge

Meal planning system: a public, OAuth-protected MCP server integrated into a Hono
web app. This file is the **command & procedure reference**. The reasoning behind
these choices lives in `docs/`:

- [docs/001-techstack.md](./docs/001-techstack.md) — tech stack & repo layout (why).
- [docs/002-user.md](./docs/002-user.md) — users, auth, no-signup flow (why).
- [docs/003-render.md](./docs/003-render.md) — Render hosting & dev-vs-prod DB handling (why).
- [docs/004-test.md](./docs/004-test.md) — testing setup (why).
- [docs/005-npm-command.md](./docs/005-npm-command.md) — every npm script, explained.

Run npm commands through `volta run` so the pinned Node.js version is used.

## Repository Layout

```text
src/
  index.ts        Server entrypoint (in prod: migrate + seed admin, then start Hono)
  app.ts          App assembly and route mounting
  auth.ts         Session cookie + auth middleware (sessionMiddleware, requireAuth)
  db/
    schema.ts     Drizzle schema
    index.ts      DB connection (reads DATABASE_URL)
    migrate.ts    runMigrations: applies committed migrations (used in prod on boot)
    seed.ts       seedAdmin: idempotent admin upsert from SEED_ADMIN_*
  lib/
    password.ts   scrypt hash/verify
  routes/         Hono route modules (auth, home)
db/
  migrations/     drizzle-kit migrations (committed; the source of truth for prod)
scripts/
  seed.ts         Dev seed CLI (npm run db:seed)
  reset.ts        Dev DB reset: drop schemas so db:reset can rebuild
tests/            Vitest tests (+ helpers/db.ts: PGlite test DB)
```

The `@/*` path alias maps to `src/*`, and `@test/*` to `tests/*`.

## Setup

```bash
cp .env.example .env          # then fill SEED_ADMIN_PASSWORD
volta run npm install
volta run npm run db:up       # start local Postgres (Docker)
volta run npm run db:reset    # push schema + seed admin into a clean dev DB
volta run npm run dev         # tsx watch on :3000
```

`PORT` overrides the default port (3000). `.env` is gitignored; secrets
(`DATABASE_URL`, `SESSION_SECRET`, `SEED_ADMIN_*`) live there locally and in the
Render dashboard in prod.

Full npm command reference: [docs/005-npm-command.md](./docs/005-npm-command.md).

## Workflows

Task workflows, organized by phase: **develop → test → finalize → deploy**. Each
phase groups its steps by area (currently **Database**; more, e.g. views, will be
added here).

### Develop

**Database** — push-centric, no migration files yet:

```bash
# edit src/db/schema.ts, then:
volta run npm run db:push     # apply the new shape to the dev DB (incl. drops)
volta run npm run db:reset    # or rebuild a clean dev DB: drop + push + seed
volta run npm run db:seed     # seed admin only (from SEED_ADMIN_* in .env)
```

### Test

Automated — run the full suite for any change (tests run against the committed
migrations — see [docs/004-test.md](./docs/004-test.md)):

```bash
volta run npm run check       # typecheck + lint + tests
```

Manual — exercise it in a browser at http://localhost:3000:

```bash
volta run npm run db:up       # Postgres running (if not already)
volta run npm run db:reset    # ensure schema + admin are present
volta run npm run dev         # tsx watch on :3000
# open http://localhost:3000 → /login → name "admin" + your SEED_ADMIN_PASSWORD
```

### Finalize

Wrap up the change before opening a pull request.

**Database** — turn the pushed schema into a committed migration:

```bash
volta run npm run db:generate # create a committed migration from schema.ts
volta run npm run db:migrate  # (optional) apply locally to verify the prod path
volta run npm run check       # confirm everything passes against the migration
# commit db/migrations/* with the change, then open the PR
```

> Generate and commit the migration before the PR — `db/migrations/` is the source
> of truth production applies on boot. Why this dev-vs-prod split exists:
> [docs/003-render.md](./docs/003-render.md).

### Deploy

Deploys are automatic: merging to `main` triggers Render to rebuild and, on boot,
re-apply migrations and re-seed the admin. No manual step.

One-time setup (first deploy only; details and caveats in
[docs/003-render.md](./docs/003-render.md)):

```text
Render: New → Blueprint → select repo (reads render.yaml)
→ enter SEED_ADMIN_PASSWORD when prompted
→ Apply  (on boot: auto migrate + seed admin; /health turns green)
```

## Working Agreements

- **Never commit without explicit permission.** Stage and show changes, but do not
  run `git commit` (or push) until the user asks for it.
