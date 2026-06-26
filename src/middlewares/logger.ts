import { createMiddleware } from "hono/factory";
import { logger } from "@/logger.js";

/**
 * Log every request: method, path, status, duration. Bodies are never logged —
 * they hold secrets (login password, OAuth tokens) and reading them would consume
 * the MCP stream.
 */
export const requestLogger = createMiddleware(async (c, next) => {
  const start = Date.now();
  try {
    await next();
    logger.info(
      { method: c.req.method, path: c.req.path, status: c.res.status, ms: Date.now() - start },
      "request",
    );
  } catch (err) {
    logger.error(
      { method: c.req.method, path: c.req.path, ms: Date.now() - start, err },
      "request failed",
    );
    throw err;
  }
});
