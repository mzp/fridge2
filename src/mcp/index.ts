import { StreamableHTTPTransport } from "@hono/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Context } from "hono";
import type { Db } from "@/db/index.js";
import { registerPing } from "@/mcp/ping.js";

/**
 * Build a fresh MCP server with the Fridge tools registered. `db` is threaded
 * through so tools can use it as they are added (register functions take it).
 */
export function buildMcpServer(_db: Db): McpServer {
  const server = new McpServer({ name: "fridge", version: "0.1.0" });
  registerPing(server);
  return server;
}

/**
 * Hono handler for the Streamable HTTP MCP endpoint. Stateless: a new server and
 * transport are created per request (no session storage), which is the simplest
 * correct model for tool calls.
 */
export function mcpHandler(db: Db) {
  return async (c: Context) => {
    const server = buildMcpServer(db);
    // No sessionIdGenerator → stateless: no session tracking between requests.
    const transport = new StreamableHTTPTransport();
    await server.connect(transport);
    return transport.handleRequest(c);
  };
}
