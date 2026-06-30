import { connectMcp, seedMcpUser } from "@test/helpers/mcp.js";
import { startTestServer, type TestServer } from "@test/helpers/server.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pantryItems } from "@/db/schema.js";
import { PantryItem } from "@/models/pantry.js";

let srv: TestServer;
let token: string;
let userId: string;

beforeAll(async () => {
  srv = await startTestServer(4605);
  const user = await seedMcpUser(srv, "admin");
  token = user.token;
  userId = user.id;
});

afterAll(() => srv.close());

describe("mcp: remove_pantry_item", () => {
  it("deletes the item", async () => {
    const [row] = await srv.db
      .insert(pantryItems)
      .values({ userId, name: "expired sauce", status: "in_stock" })
      .returning();
    const client = await connectMcp(srv, token);
    const res = await client.callTool({
      name: "remove_pantry_item",
      arguments: { id: row?.id },
    });
    await client.close();
    expect(res.isError).toBeFalsy();

    const stored = await PantryItem.find(srv.db, userId, row?.id as number);
    expect(stored).toBeNull();
  });

  it("does not delete another user's item", async () => {
    const other = await seedMcpUser(srv, "roommate");
    const [row] = await srv.db
      .insert(pantryItems)
      .values({ userId: other.id, name: "their sauce", status: "in_stock" })
      .returning();
    const client = await connectMcp(srv, token);
    const res = await client.callTool({
      name: "remove_pantry_item",
      arguments: { id: row?.id },
    });
    await client.close();
    expect(res.isError).toBe(true);

    const stored = await PantryItem.find(srv.db, other.id, row?.id as number);
    expect(stored?.row.name).toBe("their sauce");
  });
});
