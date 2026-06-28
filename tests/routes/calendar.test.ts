import { createTestDb } from "@test/helpers/db.js";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "@/app.js";
import { users } from "@/db/schema.js";
import { hashPassword } from "@/lib/password.js";

// The rendered happy path is left for an e2e test; the calendar structure is
// covered by tests/models/calendar.test.ts. Here we only cover the auth guard.

const NAME = "admin";
const PASSWORD = "correct horse";

async function setup() {
  const db = await createTestDb();
  await db.insert(users).values({ name: NAME, passwordHash: await hashPassword(PASSWORD) });
  return createApp(db);
}

describe("calendar route", () => {
  let app: Awaited<ReturnType<typeof setup>>;

  beforeEach(async () => {
    app = await setup();
  });

  it("redirects unauthenticated requests to /login", async () => {
    const res = await app.request("/calendar");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/login");
  });
});
