import { serve } from "@hono/node-server";
import { createApp } from "@/app.js";
import { db } from "@/db/index.js";
import { runMigrations } from "@/db/migrate.js";

await runMigrations();

const port = process.env["PORT"] ? Number(process.env["PORT"]) : 3000;

serve({ fetch: createApp(db).fetch, port }, ({ port }) => {
  // biome-ignore lint/suspicious/noConsole: startup banner
  console.log(`Fridge listening on http://localhost:${port}`);
});
