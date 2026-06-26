# Tests — conventions

Rules for files under `tests/`. (Why testing is set up this way:
[docs/004-test.md](../docs/004-test.md).)

## Naming

- `tests/lib/` and `tests/routes/` mirror the source module they test:
  `src/routes/auth.ts` → `tests/routes/auth.test.ts`,
  `src/lib/password.ts` → `tests/lib/password.test.ts`.
- `tests/e2e/` is named after the URL/page under test, not the source file:
  the `/login` flow → `tests/e2e/login.spec.ts`.

## Layers

- The happy path belongs in `tests/e2e` (Playwright).
- `tests/routes` (vitest) keeps the fast negative/edge cases. Don't duplicate a
  scenario already covered end-to-end.
