import { serve } from "@hono/node-server";
import { createApp } from "@/app.js";
import { db } from "@/db/index.js";
import { runMigrations } from "@/db/migrate.js";
import { seedAdmin } from "@/db/seed.js";
import { logger } from "@/logger.js";

try {
  // Production applies migrations and seeds the admin automatically on boot, since
  // Render has no shell or one-off jobs. In development the schema and seed are
  // managed manually (npm run db:push / db:seed / db:reset) for fast iteration.
  if (process.env["NODE_ENV"] === "production") {
    await runMigrations();
    const seeded = await seedAdmin(db);
    logger.info({ seeded }, "startup: migrations applied, admin seeded");
  }

  const port = process.env["PORT"] ? Number(process.env["PORT"]) : 3000;
  serve({ fetch: createApp(db).fetch, port }, ({ port }) => {
    logger.info({ port }, "Fridge listening");
  });
} catch (err) {
  logger.error({ err }, "startup failed");
  process.exit(1);
}
