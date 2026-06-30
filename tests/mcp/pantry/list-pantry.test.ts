import { connectMcp, resultText, seedMcpUser } from "@test/helpers/mcp.js";
import { startTestServer, type TestServer } from "@test/helpers/server.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pantryItems } from "@/db/schema.js";

let srv: TestServer;
let token: string;
let userId: string;

beforeAll(async () => {
  srv = await startTestServer(4601);
  const user = await seedMcpUser(srv, "admin");
  token = user.token;
  userId = user.id;
  await srv.db.insert(pantryItems).values([
    { userId, name: "milk", stockDate: "2026-06-01", bestBeforeDays: 5, status: "in_stock" },
    { userId, name: "leftovers", stockDate: null, bestBeforeDays: null, status: "consumed" },
  ]);
});

afterAll(() => srv.close());

describe("mcp: list_pantry", () => {
  it("defaults to in-stock items only, with a computed expiry date", async () => {
    const client = await connectMcp(srv, token);
    const res = await client.callTool({ name: "list_pantry", arguments: {} });
    await client.close();
    const items = JSON.parse(resultText(res)) as { name: string; expiryDate: string | null }[];
    expect(items.map((i) => i.name)).toEqual(["milk"]); // "leftovers" is consumed
    expect(items.find((i) => i.name === "milk")?.expiryDate).toBe("2026-06-06");
  });

  it("includes consumed items when inStockOnly is false", async () => {
    const client = await connectMcp(srv, token);
    const res = await client.callTool({ name: "list_pantry", arguments: { inStockOnly: false } });
    await client.close();
    const items = JSON.parse(resultText(res)) as { name: string; expiryDate: string | null }[];
    expect(items.map((i) => i.name).sort()).toEqual(["leftovers", "milk"]);
    expect(items.find((i) => i.name === "leftovers")?.expiryDate).toBeNull();
  });
});
