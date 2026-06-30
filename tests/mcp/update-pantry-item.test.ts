import { connectMcp, resultText, seedMcpUser } from "@test/helpers/mcp.js";
import { startTestServer, type TestServer } from "@test/helpers/server.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pantryItems } from "@/db/schema.js";
import { PantryItem } from "@/models/pantry.js";

let srv: TestServer;
let token: string;
let userId: string;

async function newItem(): Promise<number> {
  const [row] = await srv.db
    .insert(pantryItems)
    .values({
      userId,
      name: "yogurt",
      stockDate: "2026-06-01",
      bestBeforeDays: 7,
      status: "in_stock",
    })
    .returning();
  if (!row) {
    throw new Error("failed to seed item");
  }
  return row.id;
}

beforeAll(async () => {
  srv = await startTestServer(4603);
  const user = await seedMcpUser(srv, "admin");
  token = user.token;
  userId = user.id;
});

afterAll(() => srv.close());

describe("mcp: update_pantry_item", () => {
  it("changes only the supplied fields, leaving the rest", async () => {
    const id = await newItem();
    const client = await connectMcp(srv, token);
    const res = await client.callTool({
      name: "update_pantry_item",
      arguments: { id, name: "greek yogurt" },
    });
    await client.close();
    const item = JSON.parse(resultText(res)) as { name: string; stockDate: string | null };
    expect(item.name).toBe("greek yogurt");
    expect(item.stockDate).toBe("2026-06-01"); // untouched

    const stored = await PantryItem.find(srv.db, userId, id);
    expect(stored?.row.name).toBe("greek yogurt");
    expect(stored?.row.bestBeforeDays).toBe(7);
  });

  it("clears a field when explicitly set to null", async () => {
    const id = await newItem();
    const client = await connectMcp(srv, token);
    const res = await client.callTool({
      name: "update_pantry_item",
      arguments: { id, bestBeforeDays: null },
    });
    await client.close();
    const item = JSON.parse(resultText(res)) as { bestBeforeDays: number | null };
    expect(item.bestBeforeDays).toBeNull();
  });

  it("does not touch another user's item", async () => {
    const other = await seedMcpUser(srv, "intruder-target");
    const [row] = await srv.db
      .insert(pantryItems)
      .values({ userId: other.id, name: "their milk", status: "in_stock" })
      .returning();
    const client = await connectMcp(srv, token);
    const res = await client.callTool({
      name: "update_pantry_item",
      arguments: { id: row?.id, name: "hacked" },
    });
    await client.close();
    expect(res.isError).toBe(true);

    const stored = await PantryItem.find(srv.db, other.id, row?.id as number);
    expect(stored?.row.name).toBe("their milk");
  });

  it("reports not found for an unknown id", async () => {
    const client = await connectMcp(srv, token);
    const res = await client.callTool({
      name: "update_pantry_item",
      arguments: { id: 999_999, name: "ghost" },
    });
    await client.close();
    expect(res.isError).toBe(true);
  });
});
