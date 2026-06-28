---
description: Define colours as @theme tokens in src/style; components reference tokens, never raw colour utilities
paths:
  - src/style/**
---

Colours live as semantic tokens in `@theme`, never as raw values scattered across
component classes. (Why this setup: [docs/007-tailwind.md](../../docs/007-tailwind.md).)

- Define every colour as a `--color-*` token in an `@theme` block — shared tokens
  in `theme.css`; a colour used by only one area (e.g. a calendar event kind) goes
  in that file's own `@theme` block.
- Token values reference Tailwind's scale, not raw hex:
  `--color-line: var(--color-gray-200)`.
- Component classes reference tokens only — `bg-primary`, `text-ink`,
  `border-line`, `bg-pantry/10`. Never raw colour utilities (`bg-gray-200`,
  `text-red-600`) or hex literals.
- Derive a soft/hover variant with an opacity modifier (`bg-danger/10`,
  `hover:bg-primary/90`) rather than adding a near-duplicate token.
