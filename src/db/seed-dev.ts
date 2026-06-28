import { eq } from "drizzle-orm";
import { Temporal } from "temporal-polyfill";
import type { Db } from "@/db/index.js";
import { pantryItems, users } from "@/db/schema.js";

/**
 * Dev/test-only seed data. Unlike `seedAdmin` (which also runs in production to
 * bootstrap the account), nothing here is ever seeded in prod — it is wired into
 * the dev CLI, the e2e startup, and the test reset endpoint only.
 */

/**
 * Reference day the seed dates hang off. Under test it is pinned to 2026-06-15 so
 * the e2e calendar screenshot (which renders ?date=2026-06-15) is deterministic;
 * otherwise it tracks today so dev data lands in the current month.
 */
function seedBaseDate(): Temporal.PlainDate {
  return process.env["NODE_ENV"] === "test"
    ? Temporal.PlainDate.from("2026-06-15")
    : Temporal.Now.plainDateISO();
}

/**
 * Seed sample pantry items for the admin user. Replaces the admin's pantry on each
 * run so the state is deterministic, and dates hang off a base day (see
 * `seedBaseDate`) so the freshness mix (fresh / soon / expired / none) stays
 * representative.
 *
 * Returns the number of items seeded, or 0 when there is no admin to attach to.
 */
export async function seedPantry(db: Db): Promise<number> {
  const name = process.env["SEED_ADMIN_NAME"];
  if (!name) {
    return 0;
  }
  const admin = await db.query.users.findFirst({ where: eq(users.name, name) });
  if (!admin) {
    return 0;
  }

  const base = seedBaseDate();
  const dateOffset = (days: number) => base.add({ days }).toString();
  const items = [
    { name: "milk", stockDate: dateOffset(0), bestBeforeDays: 5, status: "in_stock" }, // fresh
    { name: "eggs", stockDate: dateOffset(-3), bestBeforeDays: 5, status: "in_stock" }, // soon
    { name: "yogurt", stockDate: dateOffset(-10), bestBeforeDays: 7, status: "in_stock" }, // expired
    { name: "salt", stockDate: null, bestBeforeDays: null, status: "in_stock" }, // none
    // Consumed: has a shelf life that would otherwise draw a bar, but must be
    // filtered out of the calendar (only in-stock items show).
    { name: "old milk", stockDate: dateOffset(-2), bestBeforeDays: 6, status: "consumed" },
  ];

  await db.delete(pantryItems).where(eq(pantryItems.userId, admin.id));
  await db.insert(pantryItems).values(items.map((item) => ({ ...item, userId: admin.id })));
  return items.length;
}
