import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loggedTool } from "@/mcp/logged-tool.js";

/** Register the `ping` tool: echoes a message back. */
export function registerPing(server: McpServer) {
  loggedTool(
    server,
    "ping",
    "Health check that echoes a message back.",
    { message: z.string().describe("Text to echo back") },
    async ({ message }) => ({
      content: [{ type: "text" as const, text: `pong: ${message}` }],
    }),
  );
}
