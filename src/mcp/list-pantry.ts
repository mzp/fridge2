import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Db } from "@/db/index.js";
import { loggedTool } from "@/mcp/logged-tool.js";
import { jsonResult } from "@/mcp/pantry-fields.js";
import { PantryItem } from "@/models/pantry.js";

/** Register the `list_pantry` tool: list the caller's pantry items. */
export function registerListPantry(server: McpServer, db: Db, userId: string) {
  loggedTool(
    server,
    "list_pantry",
    "List the caller's pantry items, each with its computed expiry date.",
    {
      inStockOnly: z
        .boolean()
        .optional()
        .describe("When true, return only in-stock items; otherwise return all items."),
    },
    async ({ inStockOnly }) => {
      const items = inStockOnly
        ? await PantryItem.available(db, userId)
        : await PantryItem.all(db, userId);
      return jsonResult(items.map((item) => item.toSummary()));
    },
  );
}
