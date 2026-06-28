import { Temporal } from "temporal-polyfill";

/**
 * Pantry model — pure expiry logic, no DB access (that lives in routes/MCP tools).
 * An item's freshness derives from its `stockDate` plus `bestBeforeDays`; an item
 * missing either has no tracked expiry.
 */

export type ExpiryStatus = "none" | "expired" | "soon" | "fresh";
export type PantryStatus = "in_stock" | "consumed";

/** Within this many days of expiry an item counts as expiring "soon". */
const EXPIRES_SOON_DAYS = 3;

/** The day an item goes off, or null when expiry isn't tracked. */
export function expiryDate(
  stockDate: string | null,
  bestBeforeDays: number | null,
): Temporal.PlainDate | null {
  if (stockDate == null || bestBeforeDays == null) {
    return null;
  }
  return Temporal.PlainDate.from(stockDate).add({ days: bestBeforeDays });
}

/** Whole days from `today` until expiry (negative once past), or null if untracked. */
export function daysRemaining(
  stockDate: string | null,
  bestBeforeDays: number | null,
  today: Temporal.PlainDate,
): number | null {
  const expiry = expiryDate(stockDate, bestBeforeDays);
  if (expiry == null) {
    return null;
  }
  return today.until(expiry).days;
}

/** Freshness bucket for an item relative to `today`. */
export function expiryStatus(
  stockDate: string | null,
  bestBeforeDays: number | null,
  today: Temporal.PlainDate,
): ExpiryStatus {
  const days = daysRemaining(stockDate, bestBeforeDays, today);
  if (days == null) {
    return "none";
  }
  if (days < 0) {
    return "expired";
  }
  if (days <= EXPIRES_SOON_DAYS) {
    return "soon";
  }
  return "fresh";
}
