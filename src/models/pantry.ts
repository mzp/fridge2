import { and, asc, desc, eq } from "drizzle-orm";
import { Temporal } from "temporal-polyfill";
import type { Db } from "@/db/index.js";
import { type NewPantryItem, type PantryItem as PantryItemRow, pantryItems } from "@/db/schema.js";
import type { CalendarEvent } from "@/models/calendar.js";

export type PantryStatus = "in_stock" | "consumed";
export type PantryItemInput = Pick<
  NewPantryItem,
  "name" | "stockDate" | "bestBeforeDays" | "status"
>;
type PantryItemFormTextField = Exclude<keyof PantryItemInput, "status">;
export type PantryItemFormValues = Record<PantryItemFormTextField, string> & {
  status: PantryStatus;
};

const toLocalDate = (date: Temporal.PlainDate): Date =>
  new Date(date.year, date.month - 1, date.day);

/**
 * Pantry domain model. Wraps a `pantry_items` row and owns its data access (the
 * queries) and its projection onto the calendar — so routes/MCP tools ask the
 * model rather than hand-rolling SQL or conversions.
 */
export class PantryItem {
  constructor(readonly row: PantryItemRow) {}

  /** All pantry items belonging to a user, newest first. */
  static async all(db: Db, userId: string): Promise<PantryItem[]> {
    const rows = await db
      .select()
      .from(pantryItems)
      .where(eq(pantryItems.userId, userId))
      .orderBy(desc(pantryItems.createdAt), asc(pantryItems.name));
    return rows.map((row) => new PantryItem(row));
  }

  /** The in-stock pantry items belonging to a user. */
  static async available(db: Db, userId: string): Promise<PantryItem[]> {
    const rows = await db
      .select()
      .from(pantryItems)
      .where(and(eq(pantryItems.userId, userId), eq(pantryItems.status, "in_stock")));
    return rows.map((row) => new PantryItem(row));
  }

  /** Find an item only when it belongs to the given user. */
  static async find(db: Db, userId: string, id: number): Promise<PantryItem | null> {
    const [row] = await db
      .select()
      .from(pantryItems)
      .where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId)))
      .limit(1);
    return row ? new PantryItem(row) : null;
  }

  static async create(db: Db, userId: string, input: PantryItemInput): Promise<PantryItem> {
    const [row] = await db
      .insert(pantryItems)
      .values({ ...input, userId })
      .returning();
    if (!row) {
      throw new Error("failed to create pantry item");
    }
    return new PantryItem(row);
  }

  /** Update an item scoped to its owner. Returns null when it was not found. */
  static async update(
    db: Db,
    userId: string,
    id: number,
    input: PantryItemInput,
  ): Promise<PantryItem | null> {
    const [row] = await db
      .update(pantryItems)
      .set(input)
      .where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId)))
      .returning();
    return row ? new PantryItem(row) : null;
  }

  /** Delete an item scoped to its owner. */
  static async delete(db: Db, userId: string, id: number): Promise<boolean> {
    const rows = await db
      .delete(pantryItems)
      .where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId)))
      .returning({ id: pantryItems.id });
    return rows.length > 0;
  }

  /** Mark an item as consumed, scoped to its owner. */
  static async consume(db: Db, userId: string, id: number): Promise<boolean> {
    const rows = await db
      .update(pantryItems)
      .set({ status: "consumed" })
      .where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId)))
      .returning({ id: pantryItems.id });
    return rows.length > 0;
  }

  /**
   * A plain JSON view of the item with its computed expiry date — what MCP tools
   * (and any future API) hand back, so callers don't reach into the raw row.
   */
  toSummary() {
    return {
      id: this.row.id,
      name: this.row.name,
      stockDate: this.row.stockDate,
      bestBeforeDays: this.row.bestBeforeDays,
      status: this.row.status as PantryStatus,
      expiryDate: this.expiryDate()?.toString() ?? null,
    };
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
      href: `/pantry/${this.row.id}`,
    };
  }
}
