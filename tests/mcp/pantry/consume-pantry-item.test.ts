import { connectMcp, seedMcpUser } from "@test/helpers/mcp.js";
import { startTestServer, type TestServer } from "@test/helpers/server.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pantryItems } from "@/db/schema.js";
import { PantryItem } from "@/models/pantry.js";

let srv: TestServer;
let token: string;
let userId: string;

beforeAll(async () => {
  srv = await startTestServer(4604);
  const user = await seedMcpUser(srv, "admin");
  token = user.token;
  userId = user.id;
});

afterAll(() => srv.close());

describe("mcp: consume_pantry_item", () => {
  it("marks the item as consumed", async () => {
    const [row] = await srv.db
      .insert(pantryItems)
      .values({ userId, name: "bread", status: "in_stock" })
      .returning();
    const client = await connectMcp(srv, token);
    const res = await client.callTool({
      name: "consume_pantry_item",
      arguments: { id: row?.id },
    });
    await client.close();
    expect(res.isError).toBeFalsy();

    const stored = await PantryItem.find(srv.db, userId, row?.id as number);
    expect(stored?.row.status).toBe("consumed");
  });

  it("does not consume another user's item", async () => {
    const other = await seedMcpUser(srv, "neighbour");
    const [row] = await srv.db
      .insert(pantryItems)
      .values({ userId: other.id, name: "their bread", status: "in_stock" })
      .returning();
    const client = await connectMcp(srv, token);
    const res = await client.callTool({
      name: "consume_pantry_item",
      arguments: { id: row?.id },
    });
    await client.close();
    expect(res.isError).toBe(true);

    const stored = await PantryItem.find(srv.db, other.id, row?.id as number);
    expect(stored?.row.status).toBe("in_stock");
  });
});
