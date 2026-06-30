import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Db } from "@/db/index.js";
import { registerAddPantryItem } from "@/mcp/pantry/add-pantry-item.js";
import { registerConsumePantryItem } from "@/mcp/pantry/consume-pantry-item.js";
import { registerListPantry } from "@/mcp/pantry/list-pantry.js";
import { registerRemovePantryItem } from "@/mcp/pantry/remove-pantry-item.js";
import { registerUpdatePantryItem } from "@/mcp/pantry/update-pantry-item.js";

/**
 * Register the pantry CRUD tools, all scoped to `userId` (the caller resolved from
 * the Bearer token). Keeps `buildMcpServer` from having to know each pantry tool.
 */
export function registerPantryTools(server: McpServer, db: Db, userId: string): void {
  registerListPantry(server, db, userId);
  registerAddPantryItem(server, db, userId);
  registerUpdatePantryItem(server, db, userId);
  registerConsumePantryItem(server, db, userId);
  registerRemovePantryItem(server, db, userId);
}
