import { createTestDb } from "@test/helpers/db.js";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "@/app.js";
import type { Db } from "@/db/index.js";
import { pantryItems, users } from "@/db/schema.js";
import { hashPassword } from "@/lib/password.js";

const NAME = "admin";
const PASSWORD = "correct horse";

async function setup() {
  const db = await createTestDb();
  const [user] = await db
    .insert(users)
    .values({ name: NAME, passwordHash: await hashPassword(PASSWORD) })
    .returning();
  if (!user) {
    throw new Error("failed to seed user");
  }
  const app = createApp(db);
  const login = await app.request("/login", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ name: NAME, password: PASSWORD }).toString(),
  });
  const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
  return { app, cookie, db, user };
}

function form(data: Record<string, string>): RequestInit {
  return {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(data).toString(),
  };
}

function authenticatedForm(cookie: string, data: Record<string, string>): RequestInit {
  return {
    ...form(data),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie,
    },
  };
}

async function itemId(db: Db, name: string): Promise<string> {
  const item = await db.query.pantryItems.findFirst({ where: eq(pantryItems.name, name) });
  if (!item) {
    throw new Error(`missing pantry item: ${name}`);
  }
  return item.id;
}

describe("pantry routes", () => {
  let context: Awaited<ReturnType<typeof setup>>;

  beforeEach(async () => {
    context = await setup();
  });

  it("redirects unauthenticated requests to /login", async () => {
    const res = await context.app.request("/pantry");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/login");
  });

  it("rejects invalid input and preserves the submitted value", async () => {
    const res = await context.app.request(
      "/pantry",
      authenticatedForm(context.cookie, {
        name: "milk",
        stockDate: "not-a-date",
        bestBeforeDays: "5",
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.text();
    expect(body).toContain("Stock date must be a valid date.");
    expect(body).toContain('value="milk"');
  });

  it("returns 404 instead of exposing another user's item", async () => {
    const [other] = await context.db
      .insert(users)
      .values({ name: "other", passwordHash: "x" })
      .returning();
    if (!other) {
      throw new Error("failed to seed other user");
    }
    const [item] = await context.db
      .insert(pantryItems)
      .values({ userId: other.id, name: "private" })
      .returning();
    if (!item) {
      throw new Error("failed to seed pantry item");
    }

    const edit = await context.app.request(`/pantry/${item.id}/edit`, {
      headers: { cookie: context.cookie },
    });
    const show = await context.app.request(`/pantry/${item.id}`, {
      headers: { cookie: context.cookie },
    });
    const remove = await context.app.request(`/pantry/${item.id}/delete`, {
      method: "POST",
      headers: { cookie: context.cookie },
    });
    const consume = await context.app.request(`/pantry/${item.id}/consume`, {
      method: "POST",
      headers: { cookie: context.cookie },
    });
    expect(edit.status).toBe(404);
    expect(show.status).toBe(404);
    expect(remove.status).toBe(404);
    expect(consume.status).toBe(404);
  });

  it("creates, displays, updates, and deletes an item", async () => {
    const create = await context.app.request(
      "/pantry",
      authenticatedForm(context.cookie, {
        name: "rice",
        stockDate: "2026-06-20",
        bestBeforeDays: "30",
        status: "in_stock",
      }),
    );
    expect(create.status).toBe(303);
    expect(create.headers.get("location")).toBe("/pantry");

    const id = await itemId(context.db, "rice");
    const list = await context.app.request("/pantry", {
      headers: { cookie: context.cookie },
    });
    expect(await list.text()).toContain("2026-07-20");
    const show = await context.app.request(`/pantry/${id}`, {
      headers: { cookie: context.cookie },
    });
    expect(show.status).toBe(200);
    expect(await show.text()).toContain("rice");
    const fromCalendar = await context.app.request(
      `/pantry/${id}?return=${encodeURIComponent("/calendar?date=2026-06-15")}`,
      { headers: { cookie: context.cookie } },
    );
    const fromCalendarBody = await fromCalendar.text();
    expect(fromCalendarBody).toContain("Back to calendar");
    expect(fromCalendarBody).toContain('href="/calendar?date=2026-06-15"');

    const update = await context.app.request(
      `/pantry/${id}`,
      authenticatedForm(context.cookie, {
        name: "brown rice",
        stockDate: "",
        bestBeforeDays: "",
        status: "consumed",
      }),
    );
    expect(update.status).toBe(303);
    expect(
      await context.db.query.pantryItems.findFirst({ where: eq(pantryItems.id, id) }),
    ).toMatchObject({ name: "brown rice", status: "consumed" });

    const remove = await context.app.request(`/pantry/${id}/delete`, {
      method: "POST",
      headers: { cookie: context.cookie },
    });
    expect(remove.status).toBe(303);
    expect(await context.db.query.pantryItems.findFirst({ where: eq(pantryItems.id, id) })).toBe(
      undefined,
    );
  });

  it("marks an owned item as consumed", async () => {
    const [item] = await context.db
      .insert(pantryItems)
      .values({ userId: context.user.id, name: "milk" })
      .returning();
    if (!item) {
      throw new Error("failed to seed pantry item");
    }

    const consume = await context.app.request(`/pantry/${item.id}/consume`, {
      method: "POST",
      headers: { cookie: context.cookie },
    });
    expect(consume.status).toBe(303);
    expect(consume.headers.get("location")).toBe("/pantry");
    expect(
      await context.db.query.pantryItems.findFirst({ where: eq(pantryItems.id, item.id) }),
    ).toMatchObject({ status: "consumed" });
  });
});
