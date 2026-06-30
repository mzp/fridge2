import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Db } from "@/db/index.js";
import { loggedTool } from "@/mcp/logged-tool.js";
import { idField, notFoundResult, textResult } from "@/mcp/pantry/pantry-fields.js";
import { PantryItem } from "@/models/pantry.js";

/** Register the `remove_pantry_item` tool: permanently delete an item. */
export function registerRemovePantryItem(server: McpServer, db: Db, userId: string) {
  loggedTool(
    server,
    "remove_pantry_item",
    "Permanently delete one of the caller's pantry items.",
    { id: idField },
    async ({ id }) => {
      const ok = await PantryItem.delete(db, userId, id);
      return ok ? textResult(`Deleted pantry item ${id}.`) : notFoundResult(id);
    },
  );
}
