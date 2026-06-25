import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { html } from "hono/html";
import { type AppEnv, clearSession, setSession } from "@/auth.js";
import type { Db } from "@/db/index.js";
import { users } from "@/db/schema.js";
import { verifyPassword } from "@/lib/password.js";

function loginPage(error?: string) {
  return html`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sign in · Fridge</title>
  </head>
  <body>
    <h1>Fridge</h1>
    <form method="post" action="/login">
      ${error ? html`<p role="alert">${error}</p>` : ""}
      <label>Name <input type="text" name="name" autocomplete="username" required /></label>
      <label>Password
        <input type="password" name="password" autocomplete="current-password" required />
      </label>
      <button type="submit">Sign in</button>
    </form>
  </body>
</html>`;
}

export function createAuthRoutes(db: Db) {
  const app = new Hono<AppEnv>();

  app.get("/login", (c) => {
    if (c.var.user) {
      return c.redirect("/");
    }
    return c.html(loginPage());
  });

  app.post("/login", async (c) => {
    const body = await c.req.parseBody();
    const name = String(body["name"] ?? "");
    const password = String(body["password"] ?? "");

    const user = await db.query.users.findFirst({ where: eq(users.name, name) });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return c.html(loginPage("Invalid name or password"), 401);
    }

    await setSession(c, user.id);
    return c.redirect("/");
  });

  app.post("/logout", (c) => {
    clearSession(c);
    return c.redirect("/login");
  });

  return app;
}
