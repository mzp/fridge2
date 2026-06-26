---
description: Keep docs/005-npm-command.md in sync with package.json scripts
paths:
  - package.json
---

When you change `scripts` in `package.json` — add, remove, rename, or repurpose a
script — update `docs/005-npm-command.md` in the **same change**:

- Every script in `package.json` has an entry in `docs/005-npm-command.md`.
- No entry remains for a script that was removed or renamed.
- If a script's behavior changed (e.g. `dev` now also builds CSS), its description
  reflects that.
