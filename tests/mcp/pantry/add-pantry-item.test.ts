import { connectMcp, resultText, seedMcpUser } from "@test/helpers/mcp.js";
import { startTestServer, type TestServer } from "@test/helpers/server.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PantryItem } from "@/models/pantry.js";

let srv: TestServer;
let token: string;
let userId: string;

beforeAll(async () => {
  srv = await startTestServer(4602);
  const user = await seedMcpUser(srv, "admin");
  token = user.token;
  userId = user.id;
});

afterAll(() => srv.close());

describe("mcp: add_pantry_item", () => {
  it("creates an item and returns it with a computed expiry", async () => {
    const client = await connectMcp(srv, token);
    const res = await client.callTool({
      name: "add_pantry_item",
      arguments: { name: "eggs", stockDate: "2026-06-10", bestBeforeDays: 14 },
    });
    await client.close();

    const item = JSON.parse(resultText(res)) as {
      id: number;
      name: string;
      status: string;
      expiryDate: string | null;
    };
    expect(item.name).toBe("eggs");
    expect(item.status).toBe("in_stock");
    expect(item.expiryDate).toBe("2026-06-24");

    const stored = await PantryItem.find(srv.db, userId, item.id);
    expect(stored?.row.name).toBe("eggs");
  });

  it("defaults optional fields (no shelf life, in_stock)", async () => {
    const client = await connectMcp(srv, token);
    const res = await client.callTool({ name: "add_pantry_item", arguments: { name: "salt" } });
    await client.close();
    const item = JSON.parse(resultText(res)) as {
      stockDate: string | null;
      bestBeforeDays: number | null;
      expiryDate: string | null;
      status: string;
    };
    expect(item.stockDate).toBeNull();
    expect(item.bestBeforeDays).toBeNull();
    expect(item.expiryDate).toBeNull();
    expect(item.status).toBe("in_stock");
  });
});
