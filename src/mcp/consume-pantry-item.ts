import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Db } from "@/db/index.js";
import { loggedTool } from "@/mcp/logged-tool.js";
import { idField, notFoundResult, textResult } from "@/mcp/pantry-fields.js";
import { PantryItem } from "@/models/pantry.js";

/** Register the `consume_pantry_item` tool: mark an item as consumed. */
export function registerConsumePantryItem(server: McpServer, db: Db, userId: string) {
  loggedTool(
    server,
    "consume_pantry_item",
    "Mark one of the caller's pantry items as consumed (it stays in the pantry, status changes).",
    { id: idField },
    async ({ id }) => {
      const ok = await PantryItem.consume(db, userId, id);
      return ok ? textResult(`Marked pantry item ${id} as consumed.`) : notFoundResult(id);
    },
  );
}
