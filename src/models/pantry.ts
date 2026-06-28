import { and, eq } from "drizzle-orm";
import { Temporal } from "temporal-polyfill";
import type { Db } from "@/db/index.js";
import { type PantryItem as PantryItemRow, pantryItems } from "@/db/schema.js";
import type { CalendarEvent } from "@/models/calendar.js";

export type PantryStatus = "in_stock" | "consumed";

const toLocalDate = (date: Temporal.PlainDate): Date =>
  new Date(date.year, date.month - 1, date.day);

/**
 * Pantry domain model. Wraps a `pantry_items` row and owns its data access (the
 * queries) and its projection onto the calendar — so routes/MCP tools ask the
 * model rather than hand-rolling SQL or conversions.
 */
export class PantryItem {
  constructor(readonly row: PantryItemRow) {}

  /** The in-stock pantry items belonging to a user. */
  static async available(db: Db, userId: string): Promise<PantryItem[]> {
    const rows = await db
      .select()
      .from(pantryItems)
      .where(and(eq(pantryItems.userId, userId), eq(pantryItems.status, "in_stock")));
    return rows.map((row) => new PantryItem(row));
  }

  /** The day this item goes off, or null when expiry isn't tracked. */
  expiryDate(): Temporal.PlainDate | null {
    const { stockDate, bestBeforeDays } = this.row;
    if (stockDate == null || bestBeforeDays == null) {
      return null;
    }
    return Temporal.PlainDate.from(stockDate).add({ days: bestBeforeDays });
  }

  /**
   * The item as a calendar span bar (stock date → expiry), or null when it has no
   * tracked shelf life to draw.
   */
  toCalendarEvent(): CalendarEvent | null {
    const expiry = this.expiryDate();
    if (this.row.stockDate == null || expiry == null) {
      return null;
    }
    return {
      start: toLocalDate(Temporal.PlainDate.from(this.row.stockDate)),
      end: toLocalDate(expiry),
      kind: "pantry",
      label: this.row.name,
    };
  }
}
