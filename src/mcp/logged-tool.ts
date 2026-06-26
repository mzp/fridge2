import type { McpServer, ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { logger } from "@/logger.js";

/**
 * Register an MCP tool whose every call is logged: tool name, arguments, duration,
 * and errors. Use this instead of `server.tool` directly so every invocation shows
 * up in the logs (Render captures stdout).
 */
export function loggedTool<Args extends ZodRawShape>(
  server: McpServer,
  name: string,
  description: string,
  inputSchema: Args,
  cb: ToolCallback<Args>,
): void {
  const call = cb as (...a: unknown[]) => unknown;
  const wrapped = (async (...args: unknown[]) => {
    const start = Date.now();
    try {
      const result = await call(...args);
      logger.info({ tool: name, args: args[0], ms: Date.now() - start }, "mcp tool");
      return result;
    } catch (err) {
      logger.error({ tool: name, args: args[0], ms: Date.now() - start, err }, "mcp tool failed");
      throw err;
    }
  }) as ToolCallback<Args>;

  server.tool(name, description, inputSchema, wrapped);
}
