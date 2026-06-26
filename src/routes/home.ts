import { Hono } from "hono";
import { type AppEnv, requireAuth } from "@/middlewares/session.js";
import { homeView } from "@/views/home.js";

export function createHomeRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/", requireAuth, (c) => {
    // requireAuth guarantees a user, but narrow for the type checker.
    const user = c.var.user;
    if (!user) {
      return c.redirect("/login");
    }
    return c.html(homeView(user));
  });

  return app;
}
