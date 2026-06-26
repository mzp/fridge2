---
description: Log enough to reproduce a failure later (URL + params), with secrets and huge payloads redacted
paths:
  - src/routes/**
  - src/mcp/**
---

When handling requests (`src/routes`) or MCP tool calls (`src/mcp`), log enough to
**reproduce a failure later** — at minimum the URL/path and the relevant parameters
(route/query params, tool arguments), especially on errors.

But never leak sensitive data:

- **Redact credentials and secrets** — passwords, OAuth tokens, session cookies,
  `Authorization` headers, etc. Log `[redacted]`, not the value.
- **Truncate or omit oversized payloads** — note them as `[truncated]` rather than
  dumping kilobytes into the logs.

Existing infra to build on: the request logger (`src/middlewares/logger.ts`) records
method/path/status/duration (never bodies); MCP tools log via `loggedTool` (tool
name + args). Add context to those — or to an explicit error log — when it aids
reproduction, keeping the redaction rules above.
