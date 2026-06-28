import { Hono } from "hono";
import { Temporal } from "temporal-polyfill";
import type { Db } from "@/db/index.js";
import type { User } from "@/db/schema.js";
import { type AppEnv, requireAuth } from "@/middlewares/session.js";
import { Calendar, type CalendarEvent } from "@/models/calendar.js";
import { PantryItem } from "@/models/pantry.js";
import { calendarView } from "@/views/calendar.js";

/**
 * Parse an ISO date (`YYYY-MM-DD`) into a local Date, or return `fallback` when it
 * is missing or invalid — the reference day for the calendar (`?date=` override,
 * else today).
 *
 * Uses Temporal via temporal-polyfill (native Temporal only landed in Node 26, but
 * the e2e image and prod may run older Node): `PlainDate.from` enforces the ISO
 * format and `overflow: "reject"` throws on out-of-range dates (e.g. 2026-02-30)
 * rather than silently rolling them over the way `new Date()` would.
 */
function parseDate(value: string | null | undefined, fallback: Date): Date {
  if (!value) {
    return fallback;
  }
  try {
    const date = Temporal.PlainDate.from(value, { overflow: "reject" });
    return new Date(date.year, date.month - 1, date.day);
  } catch {
    return fallback;
  }
}

export function createCalendarRoutes(db: Db) {
  const app = new Hono<AppEnv>();

  app.get("/calendar", requireAuth, async (c) => {
    // requireAuth guarantees a user; assert it so the view gets a non-null User.
    const user = c.var.user as User;
    // Reference day: ?date=YYYY-MM-DD if given (keeps rendering deterministic for
    // tests), otherwise the current day.
    const today = parseDate(c.req.query("date"), new Date());
    const calendar = Calendar.create(today.getFullYear(), today.getMonth());

    // Pantry items with a tracked shelf life become span bars (stock → expiry). All
    // pantry bars share one colour (keyed by kind); other kinds (meals, …) get theirs.
    const items = await PantryItem.available(db, user.id);
    const pantryEvents = items
      .map((item) => item.toCalendarEvent())
      .filter((event): event is CalendarEvent => event !== null);

    // today renders as a cell highlight; pantry spans render as bars.
    const events: CalendarEvent[] = [{ start: today, end: today, kind: "today" }, ...pantryEvents];
    return c.html(calendarView(user, calendar, events));
  });

  return app;
}
