import { serve } from "@hono/node-server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { createTestDb } from "@test/helpers/db.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "@/app.js";

// Exercise the real Streamable HTTP endpoint through Hono (not an in-memory
// transport), on an ephemeral port. PGlite means no external Postgres is needed.
let server: ReturnType<typeof serve>;
let baseUrl: string;

beforeAll(async () => {
  const db = await createTestDb();
  await new Promise<void>((resolve) => {
    server = serve({ fetch: createApp(db).fetch, port: 0 }, ({ port }) => {
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

async function connect(): Promise<Client> {
  const client = new Client({ name: "test-client", version: "0.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`));
  // The SDK transport's optional sessionId trips exactOptionalPropertyTypes.
  await client.connect(transport as unknown as Transport);
  return client;
}

describe("mcp: ping (over HTTP)", () => {
  it("exposes the ping tool", async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toContain("ping");
    await client.close();
  });

  it("echoes the message back", async () => {
    const client = await connect();
    const res = await client.callTool({ name: "ping", arguments: { message: "hi" } });
    expect(res.content).toEqual([{ type: "text", text: "pong: hi" }]);
    await client.close();
  });
});
