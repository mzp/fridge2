import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { sign, verify } from "hono/jwt";
import type { Db } from "@/db/index.js";
import { type User, users } from "@/db/schema.js";

const SESSION_COOKIE = "session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type AppEnv = { Variables: { user: User | null } };

function sessionSecret(): string {
  const secret = process.env["SESSION_SECRET"];
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return secret;
}

/** Issue a session cookie for the given user. */
export async function setSession(c: Context, userId: string): Promise<void> {
  const token = await sign(
    { sub: userId, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE },
    sessionSecret(),
  );
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "Lax",
    secure: process.env["NODE_ENV"] === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSession(c: Context): void {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}

/**
 * Populate `c.var.user` from the session cookie (or null). Always continues; use
 * {@link requireAuth} to gate routes.
 */
export function sessionMiddleware(db: Db) {
  return createMiddleware<AppEnv>(async (c, next) => {
    c.set("user", null);
    const token = getCookie(c, SESSION_COOKIE);
    if (token) {
      try {
        const payload = await verify(token, sessionSecret(), "HS256");
        const userId = payload["sub"];
        if (typeof userId === "string") {
          const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
          if (user) {
            c.set("user", user);
          }
        }
      } catch {
        // Invalid/expired token — treat as logged out.
      }
    }
    await next();
  });
}

/** Redirect to /login when there is no authenticated user. */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.var.user) {
    return c.redirect("/login");
  }
  return next();
});
