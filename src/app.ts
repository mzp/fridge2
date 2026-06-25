import { Hono } from "hono";
import { type AppEnv, sessionMiddleware } from "@/auth.js";
import type { Db } from "@/db/index.js";
import { createAuthRoutes } from "@/routes/auth.js";
import { createHomeRoutes } from "@/routes/home.js";

export function createApp(db: Db) {
  const app = new Hono<AppEnv>();

  app.get("/health", (c) => c.json({ status: "ok" }));

  app.use("*", sessionMiddleware(db));
  app.route("/", createAuthRoutes(db));
  app.route("/", createHomeRoutes());

  return app;
}
