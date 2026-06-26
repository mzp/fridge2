import { Hono } from "hono";
import { type AppEnv, sessionMiddleware } from "@/auth.js";
import type { Db } from "@/db/index.js";
import { users } from "@/db/schema.js";
import { seedAdmin } from "@/db/seed.js";
import { createAuthRoutes } from "@/routes/auth.js";
import { createHomeRoutes } from "@/routes/home.js";

export function createApp(db: Db) {
  const app = new Hono<AppEnv>();

  app.get("/health", (c) => c.json({ status: "ok" }));

  app.use("*", sessionMiddleware(db));
  app.route("/", createAuthRoutes(db));
  app.route("/", createHomeRoutes());

  // Test-only: clear app data and re-seed the admin, for E2E isolation between
  // tests. Gated to NODE_ENV=test so it never exists in production.
  if (process.env["NODE_ENV"] === "test") {
    app.post("/__test__/reset", async (c) => {
      await db.delete(users);
      await seedAdmin(db);
      return c.body(null, 204);
    });
  }

  return app;
}
