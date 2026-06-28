import { createTestDb } from "@test/helpers/db.js";
import { describe, expect, it } from "vitest";
import { type PantryItem as PantryItemRow, pantryItems, users } from "@/db/schema.js";
import { PantryItem } from "@/models/pantry.js";

/** A pantry row with overridable fields, for the pure (non-DB) cases. */
const row = (over: Partial<PantryItemRow>): PantryItemRow => ({
  id: "00000000-0000-0000-0000-000000000001",
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
