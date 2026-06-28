import { writeFileSync } from "node:fs";
import { serve } from "@hono/node-server";
import { Client } from "pg";
import { createApp } from "@/app.js";
import { db } from "@/db/index.js";
import { runMigrations } from "@/db/migrate.js";
import { seedAdmin } from "@/db/seed.js";
import { seedPantry } from "@/db/seed-dev.js";
import { TEST_LOG_FILE } from "@/logger.js";

// E2E web server. Ensures the test database exists, applies migrations, seeds the
// admin, then serves the app. Driven by Playwright's `webServer` (see
// playwright.config.ts) inside the Dockerized run.

/** Create the target database if it doesn't exist yet. */
async function ensureDatabase(): Promise<void> {
  const url = new URL(process.env["DATABASE_URL"] ?? "");
  const dbName = url.pathname.slice(1);
  if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
    throw new Error(`unsafe database name: ${dbName}`);
  }

  // Connect to the always-present "postgres" maintenance DB to create ours.
  url.pathname = "/postgres";
  const admin = new Client({ connectionString: url.toString() });
  await admin.connect();
  const { rowCount } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
  if (rowCount === 0) {
    await admin.query(`CREATE DATABASE "${dbName}"`);
  }
  await admin.end();
}

// Fresh log per e2e run, so the specs can assert on this run's entries.
writeFileSync(TEST_LOG_FILE, "");

await ensureDatabase();
await runMigrations();
await seedAdmin(db);
await seedPantry(db);

const port = process.env["PORT"] ? Number(process.env["PORT"]) : 3001;
serve({ fetch: createApp(db).fetch, port }, ({ port }) => {
  // biome-ignore lint/suspicious/noConsole: e2e startup banner
  console.log(`E2E server on http://localhost:${port}`);
});
