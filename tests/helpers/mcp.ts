import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { getAccessToken } from "@test/helpers/oauth.js";
import type { TestServer } from "@test/helpers/server.js";
import { users } from "@/db/schema.js";
import { hashPassword } from "@/lib/password.js";

const PASSWORD = "correct horse";

/** A user seeded into a running test server, with an MCP access token. */
export interface McpUser {
  id: string;
  token: string;
}

/** Seed a user and drive the full OAuth flow to obtain an MCP access token. */
export async function seedMcpUser(srv: TestServer, name: string): Promise<McpUser> {
  const [row] = await srv.db
    .insert(users)
    .values({ name, passwordHash: await hashPassword(PASSWORD) })
    .returning();
  if (!row) {
    throw new Error("failed to seed user");
  }
  const token = await getAccessToken(srv.baseUrl, { name, password: PASSWORD });
  return { id: row.id, token };
}

/** Connect an MCP client to the server's `/mcp` endpoint with a Bearer token. */
export async function connectMcp(srv: TestServer, token: string): Promise<Client> {
  const client = new Client({ name: "test-client", version: "0.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(`${srv.baseUrl}/mcp`), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
  });
  await client.connect(transport as unknown as Transport);
  return client;
}

/** The text of a tool result's first content block (callTool's return is loosely typed). */
export function resultText(result: unknown): string {
  const content = (result as { content?: unknown }).content;
  const first = Array.isArray(content)
    ? (content[0] as { type?: string; text?: string } | undefined)
    : undefined;
  if (first?.type !== "text" || typeof first.text !== "string") {
    throw new Error(`expected a text result, got ${first?.type}`);
  }
  return first.text;
}
