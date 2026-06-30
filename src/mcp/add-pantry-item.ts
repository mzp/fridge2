import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Db } from "@/db/index.js";
import { loggedTool } from "@/mcp/logged-tool.js";
import {
  bestBeforeDaysField,
  jsonResult,
  nameField,
  statusField,
  stockDateField,
} from "@/mcp/pantry-fields.js";
import { PantryItem } from "@/models/pantry.js";

/** Register the `add_pantry_item` tool: add an item to the caller's pantry. */
export function registerAddPantryItem(server: McpServer, db: Db, userId: string) {
  loggedTool(
    server,
    "add_pantry_item",
    "Add an item to the caller's pantry. Returns the created item.",
    {
      name: nameField,
      stockDate: stockDateField.optional(),
      bestBeforeDays: bestBeforeDaysField.optional(),
      status: statusField.optional().describe('Defaults to "in_stock".'),
    },
    async ({ name, stockDate, bestBeforeDays, status }) => {
      const item = await PantryItem.create(db, userId, {
        name,
        stockDate: stockDate ?? null,
        bestBeforeDays: bestBeforeDays ?? null,
        status: status ?? "in_stock",
      });
      return jsonResult(item.toSummary());
    },
  );
}
