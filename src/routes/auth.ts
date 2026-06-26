import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { type AppEnv, clearSession, setSession } from "@/auth.js";
import type { Db } from "@/db/index.js";
import { users } from "@/db/schema.js";
import { verifyPassword } from "@/lib/password.js";
import { loginView } from "@/views/login.js";

export function createAuthRoutes(db: Db) {
  const app = new Hono<AppEnv>();

  app.get("/login", (c) => {
    if (c.var.user) {
      return c.redirect("/");
    }
    return c.html(loginView());
  });

  app.post("/login", async (c) => {
    const body = await c.req.parseBody();
    const name = String(body["name"] ?? "");
    const password = String(body["password"] ?? "");

    const user = await db.query.users.findFirst({ where: eq(users.name, name) });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return c.html(loginView("Invalid name or password"), 401);
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
