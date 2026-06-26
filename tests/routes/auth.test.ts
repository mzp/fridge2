import { createTestDb } from "@test/helpers/db.js";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "@/app.js";
import { users } from "@/db/schema.js";
import { hashPassword } from "@/lib/password.js";

// The happy path (login → home → logout, rendered in a browser) is covered by
// tests/e2e/auth.spec.ts. These route tests focus on the fast negative/edge cases
// and the response details (status codes, cookie flags) that E2E can't easily see.

const NAME = "admin";
const PASSWORD = "correct horse";

async function setup() {
  const db = await createTestDb();
  await db.insert(users).values({ name: NAME, passwordHash: await hashPassword(PASSWORD) });
  return createApp(db);
}

function loginRequest(name: string, password: string) {
  return new Request("http://localhost/login", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ name, password }).toString(),
  });
}

describe("auth routes", () => {
  let app: Awaited<ReturnType<typeof setup>>;

  beforeEach(async () => {
    app = await setup();
  });

  it("serves the login page", async () => {
    const res = await app.request("/login");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('action="/login"');
  });

  it("redirects unauthenticated requests for / to /login", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/login");
  });

  it("rejects a wrong password with 401 and no session", async () => {
    const res = await app.request(loginRequest(NAME, "nope"));
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("rejects an unknown name with 401", async () => {
    const res = await app.request(loginRequest("ghost", PASSWORD));
    expect(res.status).toBe(401);
  });

  it("logs in with valid credentials and sets an httpOnly session cookie", async () => {
    const res = await app.request(loginRequest(NAME, PASSWORD));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/");
    expect(res.headers.get("set-cookie")).toMatch(/session=.+HttpOnly/i);
  });

  it("ignores a tampered session cookie", async () => {
    const res = await app.request("/", {
      headers: { cookie: "session=not-a-real-jwt" },
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/login");
  });
});
