import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { Db } from "@/db/index.js";
import { users } from "@/db/schema.js";
import { verifyPassword } from "@/lib/password.js";
import { type AppEnv, clearSession, setSession } from "@/middlewares/session.js";
import { loginView } from "@/views/login.js";

/** Only allow same-origin relative paths as post-login redirect targets. */
function safeReturn(value: string | undefined): string | undefined {
  if (value?.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return undefined;
}

export function createAuthRoutes(db: Db) {
  const app = new Hono<AppEnv>();

  app.get("/login", (c) => {
    const returnTo = safeReturn(c.req.query("return"));
    if (c.var.user) {
      return c.redirect(returnTo ?? "/");
    }
    return c.html(loginView(returnTo ? { returnTo } : {}));
  });

  app.post("/login", async (c) => {
    const body = await c.req.parseBody();
    const name = String(body["name"] ?? "");
    const password = String(body["password"] ?? "");
    const returnTo = safeReturn(typeof body["return"] === "string" ? body["return"] : undefined);

    const user = await db.query.users.findFirst({ where: eq(users.name, name) });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return c.html(
        loginView(
          returnTo
            ? { error: "Invalid name or password", returnTo }
            : { error: "Invalid name or password" },
        ),
        401,
      );
    }

    await setSession(c, user.id);
    return c.redirect(returnTo ?? "/");
  });

  app.post("/logout", (c) => {
    clearSession(c);
    return c.redirect("/login");
  });

  return app;
}
