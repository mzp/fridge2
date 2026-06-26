---
description: Keep docs/001-techstack.md in sync with package.json dependencies
paths:
  - package.json
---

When you change `dependencies` or `devDependencies` in `package.json` — adopt a new
library, drop one, or swap tools — update `docs/001-techstack.md` in the **same
change** so the tech-stack overview stays accurate:

- A newly adopted runtime library / framework / tool is listed (with a one-line
  reason if the choice is non-obvious).
- A removed library no longer appears.
- Don't bother documenting minor transitive or type-only `@types/*` bumps.
