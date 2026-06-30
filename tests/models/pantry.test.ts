import { createTestDb } from "@test/helpers/db.js";
import { describe, expect, it } from "vitest";
import { type PantryItem as PantryItemRow, pantryItems, users } from "@/db/schema.js";
import { PantryItem } from "@/models/pantry.js";

/** A pantry row with overridable fields, for the pure (non-DB) cases. */
const row = (over: Partial<PantryItemRow>): PantryItemRow => ({
  id: 1,
  userId: "00000000-0000-0000-0000-000000000002",
  name: "milk",
  stockDate: null,
  bestBeforeDays: null,
  status: "in_stock",
  createdAt: new Date(2026, 5, 15),
  ...over,
});

describe("PantryItem.expiryDate", () => {
  it("is the stock date plus best-before days", () => {
    const item = new PantryItem(row({ stockDate: "2026-06-15", bestBeforeDays: 5 }));
    expect(item.expiryDate()?.toString()).toBe("2026-06-20");
  });

  it("is null when stock date or best-before days is missing", () => {
    expect(new PantryItem(row({ stockDate: null, bestBeforeDays: 5 })).expiryDate()).toBeNull();
    expect(new PantryItem(row({ stockDate: "2026-06-15" })).expiryDate()).toBeNull();
  });
});

describe("PantryItem.toCalendarEvent", () => {
  it("spans stock date to expiry as a pantry-kind event", () => {
    const item = new PantryItem(row({ name: "milk", stockDate: "2026-06-15", bestBeforeDays: 5 }));
    expect(item.toCalendarEvent()).toEqual({
      start: new Date(2026, 5, 15),
      end: new Date(2026, 5, 20),
      kind: "pantry",
      label: "milk",
      href: "/pantry/1",
    });
  });

  it("is null without a tracked shelf life", () => {
    expect(
      new PantryItem(row({ stockDate: null, bestBeforeDays: 5 })).toCalendarEvent(),
    ).toBeNull();
    expect(new PantryItem(row({ stockDate: "2026-06-15" })).toCalendarEvent()).toBeNull();
  });
});

describe("PantryItem.available", () => {
  it("returns only the given user's in-stock items", async () => {
    const db = await createTestDb();
    const [u1] = await db.insert(users).values({ name: "u1", passwordHash: "x" }).returning();
    const [u2] = await db.insert(users).values({ name: "u2", passwordHash: "x" }).returning();
    if (!u1 || !u2) {
      throw new Error("failed to seed users");
    }
    await db.insert(pantryItems).values([
      { userId: u1.id, name: "milk", status: "in_stock" },
      { userId: u1.id, name: "finished", status: "consumed" },
      { userId: u2.id, name: "other user's", status: "in_stock" },
    ]);

    const items = await PantryItem.available(db, u1.id);
    expect(items.map((i) => i.row.name)).toEqual(["milk"]);
  });
});

describe("PantryItem persistence", () => {
  it("assigns sequential integer IDs", async () => {
    const db = await createTestDb();
    const [user] = await db.insert(users).values({ name: "owner", passwordHash: "x" }).returning();
    if (!user) {
      throw new Error("failed to seed user");
    }

    const first = await PantryItem.create(db, user.id, {
      name: "rice",
      stockDate: null,
      bestBeforeDays: null,
      status: "in_stock",
    });
    const second = await PantryItem.create(db, user.id, {
      name: "beans",
      stockDate: null,
      bestBeforeDays: null,
      status: "in_stock",
    });

    expect(first.row.id).toBe(1);
    expect(second.row.id).toBe(2);
  });

  it("creates, reads, updates, lists, and deletes an owner's item", async () => {
    const db = await createTestDb();
    const [user] = await db.insert(users).values({ name: "owner", passwordHash: "x" }).returning();
    if (!user) {
      throw new Error("failed to seed user");
    }

    const created = await PantryItem.create(db, user.id, {
      name: "rice",
      stockDate: "2026-06-20",
      bestBeforeDays: 30,
      status: "in_stock",
    });
    expect((await PantryItem.find(db, user.id, created.row.id))?.row.name).toBe("rice");
    expect((await PantryItem.all(db, user.id)).map((item) => item.row.name)).toEqual(["rice"]);

    const updated = await PantryItem.update(db, user.id, created.row.id, {
      name: "brown rice",
      stockDate: null,
      bestBeforeDays: null,
      status: "in_stock",
    });
    expect(updated?.row).toMatchObject({
      name: "brown rice",
      stockDate: null,
      bestBeforeDays: null,
      status: "in_stock",
    });
    expect(await PantryItem.consume(db, user.id, created.row.id)).toBe(true);
    expect((await PantryItem.find(db, user.id, created.row.id))?.row).toMatchObject({
      status: "consumed",
    });

    expect(await PantryItem.delete(db, user.id, created.row.id)).toBe(true);
    expect(await PantryItem.find(db, user.id, created.row.id)).toBeNull();
    expect(await PantryItem.delete(db, user.id, created.row.id)).toBe(false);
  });

  it("does not find, update, or delete another user's item", async () => {
    const db = await createTestDb();
    const [owner] = await db.insert(users).values({ name: "owner", passwordHash: "x" }).returning();
    const [other] = await db.insert(users).values({ name: "other", passwordHash: "x" }).returning();
    if (!owner || !other) {
      throw new Error("failed to seed users");
    }
    const item = await PantryItem.create(db, owner.id, {
      name: "milk",
      stockDate: null,
      bestBeforeDays: null,
      status: "in_stock",
    });
    const replacement = {
      name: "stolen",
      stockDate: null,
      bestBeforeDays: null,
      status: "consumed" as const,
    };

    expect(await PantryItem.find(db, other.id, item.row.id)).toBeNull();
    expect(await PantryItem.update(db, other.id, item.row.id, replacement)).toBeNull();
    expect(await PantryItem.delete(db, other.id, item.row.id)).toBe(false);
    expect(await PantryItem.consume(db, other.id, item.row.id)).toBe(false);
    expect((await PantryItem.find(db, owner.id, item.row.id))?.row.name).toBe("milk");
  });
});
