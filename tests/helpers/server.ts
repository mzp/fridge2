import { serve } from "@hono/node-server";
import { createTestDb } from "@test/helpers/db.js";
import { createApp } from "@/app.js";
import type { Db } from "@/db/index.js";

export interface TestServer {
  db: Db;
  baseUrl: string;
  close: () => Promise<void>;
}

/** Start the app on a real HTTP port for integration tests (PGlite-backed). */
export async function startTestServer(port: number): Promise<TestServer> {
  // The OAuth issuer must match the served origin.
  process.env["PUBLIC_BASE_URL"] = `http://localhost:${port}`;
  const db = await createTestDb();
  const app = createApp(db);
  const server = await new Promise<ReturnType<typeof serve>>((resolve) => {
    const s = serve({ fetch: app.fetch, port }, () => resolve(s));
  });
  return {
    db,
    baseUrl: `http://localhost:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
