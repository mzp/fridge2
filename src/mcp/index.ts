import { StreamableHTTPTransport } from "@hono/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Context } from "hono";
import type { Db } from "@/db/index.js";
import { registerPantryTools } from "@/mcp/pantry/index.js";
import { registerPing } from "@/mcp/ping.js";
import type { AppEnv } from "@/middlewares/session.js";

/**
 * Build a fresh MCP server with the Fridge tools registered. `db` and the caller's
 * `userId` (from the Bearer token) are threaded through so the user-scoped tools
 * (pantry) only ever touch the caller's own data.
 */
export function buildMcpServer(db: Db, userId: string): McpServer {
  const server = new McpServer({ name: "fridge", version: "0.1.0" });
  registerPing(server);
  registerPantryTools(server, db, userId);
  return server;
}

/**
 * Hono handler for the Streamable HTTP MCP endpoint. Stateless: a new server and
 * transport are created per request (no session storage), which is the simplest
 * correct model for tool calls. The caller is resolved upstream by `requireBearer`.
 */
export function mcpHandler(db: Db) {
  return async (c: Context<AppEnv>) => {
    const userId = c.var.userId;
    if (!userId) {
      // requireBearer should have set this; guard defensively.
      return c.json({ error: "unauthorized" }, 401);
    }
    const server = buildMcpServer(db, userId);
    // No sessionIdGenerator → stateless: no session tracking between requests.
    const transport = new StreamableHTTPTransport();
    await server.connect(transport);
    return transport.handleRequest(c);
  };
}
