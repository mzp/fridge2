import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Db } from "@/db/index.js";
import { loggedTool } from "@/mcp/logged-tool.js";
import {
  bestBeforeDaysField,
  idField,
  jsonResult,
  nameField,
  notFoundResult,
  statusField,
  stockDateField,
} from "@/mcp/pantry/pantry-fields.js";
import { PantryItem } from "@/models/pantry.js";

/**
 * Register the `update_pantry_item` tool: edit an existing item. Only the fields
 * supplied are changed; omitted fields keep their current value (a partial update).
 */
export function registerUpdatePantryItem(server: McpServer, db: Db, userId: string) {
  loggedTool(
    server,
    "update_pantry_item",
    "Update fields of one of the caller's pantry items. Omitted fields are left unchanged.",
    {
      id: idField,
      name: nameField.optional(),
      stockDate: stockDateField.optional(),
      bestBeforeDays: bestBeforeDaysField.optional(),
      status: statusField.optional(),
    },
    async ({ id, name, stockDate, bestBeforeDays, status }) => {
      const existing = await PantryItem.find(db, userId, id);
      if (!existing) {
        return notFoundResult(id);
      }
      const item = await PantryItem.update(db, userId, id, {
        name: name ?? existing.row.name,
        stockDate: stockDate === undefined ? existing.row.stockDate : stockDate,
        bestBeforeDays: bestBeforeDays === undefined ? existing.row.bestBeforeDays : bestBeforeDays,
        status: status ?? existing.row.status,
      });
      return item ? jsonResult(item.toSummary()) : notFoundResult(id);
    },
  );
}
