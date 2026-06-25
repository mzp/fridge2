import { Hono } from "hono";
import { html } from "hono/html";
import { type AppEnv, requireAuth } from "@/auth.js";

export function createHomeRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/", requireAuth, (c) => {
    // requireAuth guarantees a user, but narrow for the type checker.
    const user = c.var.user;
    if (!user) {
      return c.redirect("/login");
    }
    return c.html(html`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Fridge</title>
  </head>
  <body>
    <h1>Hello, ${user.name}!</h1>
    <form method="post" action="/logout">
      <button type="submit">Sign out</button>
    </form>
  </body>
</html>`);
  });

  return app;
}
