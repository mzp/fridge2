# 001 — Tech Stack

**Status:** Implemented

Why the stack looks the way it does. For the actual commands, see
[CLAUDE.md](../CLAUDE.md).

## Stack

- Runtime: Node.js, managed via Volta (`package.json` `volta.node`).
- Package manager: npm.
- Web server: Hono on `@hono/node-server`.
- Language: TypeScript. `tsx` for local dev; production runs compiled JS from `dist/`.
- Build: `tsc` + `tsc-alias` (rewrites the `@/*` alias to relative paths so plain
  `node` can run the output).
- CSS: Tailwind v4 via the standalone CLI, compiled to one static stylesheet
  (no bundler). See [007-tailwind.md](./007-tailwind.md).
- Logging: Pino — structured JSON to stdout (captured by Render); pretty-printed
  in local dev. A request-logging middleware records method/path/status/duration.
- Database: PostgreSQL (local via Docker Compose, prod via Render Postgres).
- ORM: Drizzle (`drizzle-orm/node-postgres`); schema diffing and migrations via `drizzle-kit`.
- Auth: session via signed httpOnly cookie (`hono/jwt`); passwords hashed with
  Node's built-in `crypto.scrypt` (no native dependency). See [002-user.md](./002-user.md).
- Testing: Vitest for unit/route tests (DB-backed ones run against in-memory
  Postgres via PGlite, so no Docker is needed). Playwright for end-to-end + visual
  regression, run in the official Playwright Docker image. See [004-test.md](./004-test.md).
- Lint/format: Biome.
- Hosting: Render (free plan). See [003-render.md](./003-render.md).

The repository layout is documented in [CLAUDE.md](../CLAUDE.md).

## Notable choices

- **`tsx` in dev, compiled `dist/` in prod.** No build step needed while iterating,
  but production runs plain `node` on compiled output for a predictable runtime.
  `tsc-alias` rewrites the `@/*` alias so `node` can resolve it without a loader.
- **scrypt over bcrypt/argon2.** Built into Node, so no native module to compile or
  ship — important for a small free-tier deploy. See [002-user.md](./002-user.md).
- **PGlite for tests.** DB-backed tests run against in-memory Postgres, so the suite
  needs no Docker and stays fast and hermetic.
- **Drizzle + drizzle-kit.** Typed schema in `schema.ts` doubles as the dev
  push target and the migration source. Dev-vs-prod handling: [003-render.md](./003-render.md).

Config lives in `.env` locally (gitignored; `.env.example` is committed) and in the
Render dashboard in prod.
