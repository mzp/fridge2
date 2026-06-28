---
description: When you add/remove a path-scoped instruction file (.claude/rules/*.md or a directory CLAUDE.md), update AGENTS.md routing
paths:
  - .claude/rules/**
  - "**/CLAUDE.md"
---

Claude auto-loads path-scoped instructions: `.claude/rules/*.md` (from their
`paths` globs) and per-directory `CLAUDE.md` files. Codex does **not** — it relies
on `AGENTS.md` as a manual router to the same files.

So when you add, rename, remove, or re-scope one of these — a rule under
`.claude/rules/`, or a directory's `CLAUDE.md` — update `AGENTS.md` in the **same
change**:

- A newly added file has a bullet routing its path(s) to it.
- A removed or renamed file leaves no stale bullet behind.
- If its scope changed, the matching bullet's path description follows.

(The root `CLAUDE.md` is already the always-read source of truth, so it needs no
per-path bullet — this is about the scoped files layered on top.)
