---
description: MCP tools must type and validate their inputs with Zod
paths:
  - src/mcp/**
---

Every MCP tool in `src/mcp/` must define its arguments with a **Zod schema** and
let the SDK validate them — never accept untyped or unvalidated input.

- Register via `loggedTool(server, name, description, schema, handler)` (not
  `server.tool` directly) so every call is logged. Pass the Zod shape as `schema`.
- One tool per file, registered via an exported `register<Name>(server[, db])`
  function that `src/mcp/index.ts` wires into `buildMcpServer`.
- Describe each field with `.describe(...)` so the schema doubles as the tool's
  documentation for clients.
- When you add, remove, or rename a tool, update the tool inventory in
  [`docs/006-mcp.md`](../../docs/006-mcp.md) in the same change — that doc, not
  `CLAUDE.md`, is the canonical list of what `/mcp` exposes.
