# Fridge

Meal planning system: a public, OAuth-protected MCP server integrated into a Hono
web app. This file is the **command & procedure reference**. The reasoning behind
these choices lives in `docs/`:

- [docs/001-techstack.md](./docs/001-techstack.md) — tech stack & repo layout (why).
- [docs/002-user.md](./docs/002-user.md) — users, auth, no-signup flow (why).
- [docs/003-render.md](./docs/003-render.md) — Render hosting & dev-vs-prod DB handling (why).
- [docs/004-test.md](./docs/004-test.md) — testing setup (why).
- [docs/005-npm-command.md](./docs/005-npm-command.md) — every npm script, explained.
- [docs/006-mcp.md](./docs/006-mcp.md) — MCP over OAuth (planned).
- [docs/007-tailwind.md](./docs/007-tailwind.md) — Tailwind CSS setup & semantic classes (planned).

Each doc starts with a **Status**: `Implemented`, `Not implemented` (planned), or
`Rejected` (considered, decided against).

Run npm commands through `volta run` so the pinned Node.js version is used.

## Repository Layout

```text
src/
  index.ts        Server entrypoint (in prod: migrate + seed admin, then start Hono)
  app.ts          App assembly and route mounting
  logger.ts       Pino logger (JSON to stdout; pretty in dev)
  db/
    schema.ts     Drizzle schema
    index.ts      DB connection (reads DATABASE_URL)
    migrate.ts    runMigrations: applies committed migrations (used in prod on boot)
    seed.ts       seedAdmin: idempotent admin upsert from SEED_ADMIN_*
  lib/
    password.ts   scrypt hash/verify
  mcp/            MCP server (index.ts) + one file per tool (ping.ts); at /mcp
  middlewares/    session.ts (web cookie login), oauth.ts (Bearer guard), logger.ts (request log)
  routes/         Hono route modules: auth, home, oauth/ (OAuth AS at /oauth +
                  provider; well-known discovery served at root)
  views/          hono/html page templates (layout, login, home)
public/
  style.css       Tailwind source (committed); dist.css is the gitignored build
db/
  migrations/     drizzle-kit migrations (committed; the source of truth for prod)
scripts/
  seed.ts         Dev seed CLI (npm run db:seed)
  reset.ts        Dev DB reset: drop schemas so db:reset can rebuild
  start-e2e.ts    E2E web server: ensure test DB, migrate, seed, serve
tests/
  lib/            Unit tests
  routes/         Route/integration tests (app.request)
  e2e/            Playwright browser tests + committed screenshot baselines
  helpers/        db.ts (PGlite test DB), e2e.ts (reset helper)
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

**UI** — markup lives in `src/views/`; styles are semantic classes in
`public/style.css` (see [docs/007-tailwind.md](./docs/007-tailwind.md)). `dev`/`build`
compile the CSS automatically; while iterating on classes:

```bash
volta run npm run css:watch   # rebuild public/dist.css on change
```

### Test

Automated — run the full suite for any change (tests run against the committed
migrations — see [docs/004-test.md](./docs/004-test.md)):

```bash
volta run npm run check       # typecheck + lint + unit/route tests
```

End-to-end (Playwright, in Docker; includes visual snapshots — see
[docs/004-test.md](./docs/004-test.md)):

```bash
volta run npm run db:up       # Postgres running (if not already)
volta run npm run e2e         # browser tests in the Playwright Docker image
volta run npm run e2e:update  # regenerate screenshot baselines after an intended UI change
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

**UI** — if the change alters how a page renders, refresh the screenshot baselines:

```bash
volta run npm run e2e:update  # regenerate screenshot baselines (Docker/Linux)
volta run npm run e2e         # confirm they pass
# commit the updated tests/e2e/**-snapshots/*.png with the change
```

> Commit the updated baselines so the UI change appears as an image diff in the PR
> for review. Why we do this: [docs/004-test.md](./docs/004-test.md).

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

- **Only `git commit`, `git push`, or open a pull request when the user explicitly
  says to.** Make and stage changes and show them, but never commit, push, or create
  PRs on your own — and **don't ask or nag** about it either; the user will say when.
  Each is separate: being told to commit does not authorize a push (or a PR), and
  vice versa — wait for a distinct instruction for each.
- **`.gitignore` is only for files this project generates** (build output, deps,
  reports, logs, local secrets). OS- and editor-generated files (e.g. `.DS_Store`)
  go in `.git/info/exclude` instead — they are personal/local, so they don't belong
  in a committed ignore file.
