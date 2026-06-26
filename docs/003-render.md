# 003 — Render Hosting & Dev-vs-Prod DB Handling

**Status:** Implemented

Why hosting and DB lifecycle work the way they do. For the actual commands and
deploy steps, see [CLAUDE.md](../CLAUDE.md).

## Hosting on Render (free plan)

`render.yaml` is a Blueprint that provisions **both** the web service and a free
Postgres database (`fridge-db`) together, so a single Apply stands up the whole
stack and wires them.

Config decisions worth knowing:

- **`buildCommand` forces `--include=dev`.** Render sets `NODE_ENV=production`,
  which makes `npm install` skip devDependencies — but `typescript`/`tsc-alias`
  are needed to build. `npm install --include=dev` overrides that.
- **`NODE_ENV=production` is set explicitly.** It gates the boot-time migrate +
  seed (below), so we don't rely on Render's implicit default.
- **`DATABASE_URL` is wired from `fridge-db`** via `fromDatabase` (no copy-paste).
- **`SESSION_SECRET` is auto-generated** (`generateValue: true`).
- **`SEED_ADMIN_NAME` and `SEED_ADMIN_PASSWORD` are `sync: false`**, so the admin
  credentials are entered in the dashboard on first apply and never committed.

### Environment variables

Non-secret config lives in `render.yaml` (declarative, committed); admin
credentials go in the dashboard. (If you build a Web Service by hand instead,
`render.yaml` is ignored, so set all of these under **Environment**.)

**Managed by `render.yaml` (automatic on a Blueprint deploy):**

| Key | Value | How |
|---|---|---|
| `NODE_ENV` | `production` | Static value — enables boot-time migrate + seed. |
| `DATABASE_URL` | the DB's **Internal Database URL** | Wired via `fromDatabase` (internal = private network, no SSL). |
| `SESSION_SECRET` | a long random string | Auto-generated via `generateValue: true`. |

**Set in the dashboard (`sync: false`, never committed):**

| Key | Value | Notes |
|---|---|---|
| `SEED_ADMIN_NAME` | e.g. `admin` | Login name of the seeded admin. |
| `SEED_ADMIN_PASSWORD` | chosen password | The admin's password. |

Do **not** set `PORT` — Render injects it and the app reads `process.env.PORT`.
The Node version is not an env var either; it comes from the committed
`.node-version` file, which Render reads automatically.

### Setting up the database on Render

With the Blueprint, **you do not create or migrate the database by hand** — but
here is what happens and how to reach it when you need to.

1. **Provisioning (automatic).** The `databases: - name: fridge-db` entry in
   `render.yaml` makes Render create the free Postgres instance on the first
   Blueprint Apply, in the same region as the web service.
2. **Wiring (automatic).** `DATABASE_URL` is injected into the web service from
   `fridge-db` via `fromDatabase ... property: connectionString`. That is the
   **internal** connection string (Render's private network), so no SSL config is
   needed and there is nothing to copy-paste.
3. **Schema + admin (automatic).** On boot the app runs migrations and seeds the
   admin (`NODE_ENV=production`). A fresh database is empty; the first boot creates
   the tables and the admin. Just set `SEED_ADMIN_PASSWORD` when prompted.

Connecting manually (psql / a GUI, e.g. to inspect data) — use the **External
Database URL** from the database's page in the dashboard. Unlike the internal URL
it is public and **requires SSL** (`ssl: { rejectUnauthorized: false }` or
`?sslmode=require`).

To create it manually instead of via Blueprint: Dashboard → New → Postgres
(Free) → copy its **Internal Database URL** into the web service's `DATABASE_URL`
env var (same region as the service).

Hardening: a free Postgres is reachable from the public internet by default.
Once you no longer need external access, remove the `0.0.0.0/0` entry from the
database's access control list so only your Render private network can connect.

### Free-plan caveats to design around

- The web service sleeps after ~15 min idle (30–60s cold start on next request).
- No persistent disk — durable state must live in the managed Postgres, not on
  the instance.
- Free Postgres instances expire and are removed after ~30 days, so this is for
  hobby/eval use only.

## Why dev and prod handle the DB differently

| | Development | Production (Render) |
|---|---|---|
| Schema changes | manual, push-centric | committed migrations |
| Applied | by you, on demand | automatically on boot |
| Seeding | manual | automatically on boot |

- **Prod auto-migrates and seeds on boot** (`src/index.ts`, gated by
  `NODE_ENV=production`). Render's free plan has no shell and no one-off jobs, so
  the only reliable place to run migrations and provision the admin is process
  startup. `seedAdmin`'s upsert is idempotent, which makes running it on every boot
  safe.
- **Dev does neither on boot.** During active development the schema changes
  constantly; auto-applying on every restart would fight the developer. Instead the
  schema is pushed on demand (`db:push`) and the DB can be rebuilt at will
  (`db:reset`), keeping iteration fully under manual control.
- **Migrations are the prod contract.** `db/migrations/` (generated by
  `db:generate`) is the source of truth prod applies. Dev push is for iteration;
  the migration is what actually ships. Tests apply the committed migrations (via
  PGlite), so a schema change without a generated migration fails tests — a guard
  against drift.

### Gotcha: drizzle's migration bookkeeping schema

drizzle's node-postgres migrator records applied migrations in a separate `drizzle`
schema, not `public`. So a reset that only drops `public` leaves stale
"already applied" records, and a later migrate would skip creating tables.
`db:reset` (`scripts/reset.ts`) drops **both** `public` and `drizzle` to avoid this.
