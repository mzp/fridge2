import { Hono } from "hono";
import { type AppEnv, requireAuth } from "@/middlewares/session.js";

export function createHomeRoutes() {
  const app = new Hono<AppEnv>();

  // Calendar is the home screen for now. requireAuth sends anonymous visitors to
  // /login; signed-in visitors land on the calendar.
  app.get("/", requireAuth, (c) => c.redirect("/calendar"));

  return app;
}
