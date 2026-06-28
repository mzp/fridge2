import { Hono } from "hono";
import { Temporal } from "temporal-polyfill";
import type { User } from "@/db/schema.js";
import { type AppEnv, requireAuth } from "@/middlewares/session.js";
import { buildCalendar, type CalendarEvent } from "@/models/calendar.js";
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

export function createCalendarRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/calendar", requireAuth, (c) => {
    // requireAuth guarantees a user; assert it so the view gets a non-null User.
    const user = c.var.user as User;
    // Reference day: ?date=YYYY-MM-DD if given (keeps rendering deterministic for
    // tests/navigation), otherwise the current day. Three layers: build, mark, render.
    const today = parseDate(c.req.query("date"), new Date());
    const calendar = buildCalendar(today.getFullYear(), today.getMonth());
    // today is the first overlay event; meals and the like will join this list.
    const events: CalendarEvent[] = [{ start: today, end: today, kind: "today" }];
    return c.html(calendarView(user, calendar, events));
  });

  return app;
}
