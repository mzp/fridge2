import { serve } from "@hono/node-server";
import { createApp } from "@/app.js";
import { db } from "@/db/index.js";
import { runMigrations } from "@/db/migrate.js";
import { seedAdmin } from "@/db/seed.js";

// Production applies migrations and seeds the admin automatically on boot, since
// Render has no shell or one-off jobs. In development the schema and seed are
// managed manually (npm run db:push / db:seed / db:reset) for fast iteration.
if (process.env["NODE_ENV"] === "production") {
  await runMigrations();
  const seeded = await seedAdmin(db);
  // biome-ignore lint/suspicious/noConsole: startup banner
  console.log(seeded ? `Seeded admin user "${seeded}"` : "No admin seeded (SEED_ADMIN_* unset)");
}

const port = process.env["PORT"] ? Number(process.env["PORT"]) : 3000;

serve({ fetch: createApp(db).fetch, port }, ({ port }) => {
  // biome-ignore lint/suspicious/noConsole: startup banner
  console.log(`Fridge listening on http://localhost:${port}`);
});
