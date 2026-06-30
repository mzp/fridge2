# Tests — conventions

Conventions for files under `tests/`. (Why testing is set up this way:
[docs/004-test.md](../docs/004-test.md).)

## Naming

**Mirror `src/` structure.** A test lives at the path you get by mapping the
source under test from `src/` to `tests/` — same subdirectories, so the two trees
stay in step. When you move or regroup source files, move their tests to match (and
vice versa). The exception is `tests/e2e/`, which is organised by URL/page rather
than source file (see below).

- `tests/lib/` and `tests/routes/` mirror the source module they test:
  `src/routes/auth.ts` → `tests/routes/auth.test.ts`,
  `src/lib/password.ts` → `tests/lib/password.test.ts`.
- `tests/e2e/` is named after the URL/page under test, not the source file:
  the `/login` flow → `tests/e2e/login.spec.ts`.
- `tests/mcp/` tests MCP tools over real HTTP (the app served on an ephemeral
  port, driven by an MCP client); one file per tool, named after it (the `ping`
  tool → `tests/mcp/ping.test.ts`), and grouped by tool family to mirror
  `src/mcp/` (the pantry tools → `tests/mcp/pantry/`).

## Layers

- The happy path belongs in `tests/e2e` (browser flows) or `tests/mcp` (MCP flows
  over HTTP) — whichever interface owns it.
- `tests/routes` (vitest) keeps the fast negative/edge cases. Don't duplicate a
  scenario already covered by an e2e or mcp test.
