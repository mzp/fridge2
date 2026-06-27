---
name: self-review
description: Pre-PR self-review for fridge. Verify docs and CLAUDE.md are up to date with the change, the DB migration is generated (no schema drift), test files follow the naming conventions, and no secrets are committed. Use before opening a pull request.
---

# Self Review

Run this before opening a pull request. Scope the change, work through each check,
then report a checklist with concrete fixes.

This is a review, not a test runner — it inspects the change and reports. It does
not run the e2e suite; visual snapshots are covered by CI and the Finalize workflow
in CLAUDE.md. The one command it runs is `db:generate` (to detect schema drift), so
local Postgres should be up (`volta run npm run db:up`).

## Scope

Find what changed and review only those files:

```bash
git fetch origin main
git diff --name-only origin/main...HEAD   # committed changes vs base
git status --short                         # uncommitted/untracked
```

## Checks

### 1. Docs & CLAUDE.md are up to date

For each area the change touches, confirm the matching doc was updated. The docs
are the source of *why*; CLAUDE.md is the *commands/procedures* reference.

| Changed | Update |
|---|---|
| `package.json` scripts | `docs/005-npm-command.md` |
| `src/` files / new modules / moved files | `CLAUDE.md` "Repository Layout" |
| deps / tooling / tech choices | `docs/001-techstack.md` |
| auth, users, `src/db/schema.ts` (users), sessions | `docs/002-user.md` |
| `render.yaml`, deploy, env vars, DB dev-vs-prod lifecycle | `docs/003-render.md` |
| `vitest`/`playwright` config, `tests/` setup | `docs/004-test.md` |
| new commands or a new workflow phase/area | `CLAUDE.md` "Workflows" |

If `package.json` `scripts` changed, verify `docs/005-npm-command.md` is in sync
(every script documented, no stale entries, descriptions match behavior) — this is
the path-scoped rule in `.claude/rules/npm-commands.md`.

Also scan CLAUDE.md and `docs/` for contradictions with reality:
- Commands referenced that are not in `package.json` scripts.
- File paths / directory names mentioned that do not exist on disk.
- Tech-stack or env-var claims that contradict `package.json` / `render.yaml`.

### 2. DB migration is generated (no drift)

A schema edit must be captured in a committed migration (production applies
`db/migrations/` on boot).

```bash
volta run npm run db:generate
git status --porcelain db/migrations   # must be empty
```

If this prints anything, `src/db/schema.ts` changed without a committed migration.
Flag it: run `db:generate` and commit `db/migrations/`.

### 3. Test conventions

If any test files changed, confirm they follow the conventions in
[`tests/CLAUDE.md`](../../../tests/CLAUDE.md) (naming by source module vs URL, and
the e2e-vs-routes layer split). That file is the authoritative path-scoped rule;
flag any deviation.

### 4. No secrets committed

Make sure nothing sensitive is tracked or staged.

```bash
git ls-files | grep -E '(^|/)\.env($|\.)' | grep -v '\.env\.example$'   # should be empty
git ls-files | grep -E '\.env\.test$'                                    # ok ONLY if it holds no real secrets
git diff --cached                                                        # eyeball staged changes
```

- `.env` (and any `.env.*.local`) must be gitignored, never tracked. Only
  `.env.example` (placeholders) and `.env.test` (throwaway test values) may be
  committed — confirm `.env.test` contains no real credentials.
- Scan the diff for leaked secrets: real passwords, API tokens, or
  `DATABASE_URL`/connection strings with real hosts/credentials. Production secrets
  live in the Render dashboard, not the repo.

## Report

Output a checklist — `✅` / `❌` per check — with file/line references and the
exact fix for each `❌`. If everything passes, say the change is ready for a PR.
