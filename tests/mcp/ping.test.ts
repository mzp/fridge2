import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { readLogs } from "@test/helpers/logs.js";
import { getAccessToken } from "@test/helpers/oauth.js";
import { startTestServer, type TestServer } from "@test/helpers/server.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { users } from "@/db/schema.js";
import { hashPassword } from "@/lib/password.js";

const PASSWORD = "correct horse";
let srv: TestServer;
let accessToken: string;

beforeAll(async () => {
  srv = await startTestServer(4599);
  await srv.db.insert(users).values({ name: "admin", passwordHash: await hashPassword(PASSWORD) });
  accessToken = await getAccessToken(srv.baseUrl, { name: "admin", password: PASSWORD });
});

afterAll(() => srv.close());

async function connect(token: string): Promise<Client> {
  const client = new Client({ name: "test-client", version: "0.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(`${srv.baseUrl}/mcp`), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
  });
  await client.connect(transport as unknown as Transport);
  return client;
}

describe("mcp: ping (OAuth-protected, over HTTP)", () => {
  it("rejects unauthenticated access with 401 + WWW-Authenticate", async () => {
    const res = await fetch(`${srv.baseUrl}/mcp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: "{}",
    });
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain("resource_metadata");
  });

  it("does not advertise scopes (DCR clients would otherwise hit invalid_scope)", async () => {
    const res = await fetch(`${srv.baseUrl}/.well-known/oauth-authorization-server`);
    const meta = (await res.json()) as { scopes_supported?: string[] };
    expect(meta.scopes_supported ?? []).toEqual([]);
  });

  it("exposes the ping tool with a valid token", async () => {
    const client = await connect(accessToken);
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toContain("ping");
    await client.close();
  });

  it("echoes the message back", async () => {
    const client = await connect(accessToken);
    const res = await client.callTool({ name: "ping", arguments: { message: "hi" } });
    expect(res.content).toEqual([{ type: "text", text: "pong: hi" }]);
    await client.close();
  });

  // Logging is plumbing: this single smoke check (the wiring works) is enough.
  // Don't add a log assertion for every tool.
  it("logs the tool invocation", async () => {
    const client = await connect(accessToken);
    await client.callTool({ name: "ping", arguments: { message: "log via file" } });
    await client.close();
    const logged = readLogs().some(
      (e) => e.msg === "mcp tool" && e.tool === "ping" && e.args?.message === "log via file",
    );
    expect(logged).toBe(true);
  });
});
