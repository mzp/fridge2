import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/** Register the `ping` tool: echoes a message back. */
export function registerPing(server: McpServer) {
  server.tool(
    "ping",
    "Health check that echoes a message back.",
    { message: z.string().describe("Text to echo back") },
    async ({ message }) => ({
      content: [{ type: "text" as const, text: `pong: ${message}` }],
    }),
  );
}
