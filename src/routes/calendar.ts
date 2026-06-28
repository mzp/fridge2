/// <reference lib="esnext.temporal" />
import { Hono } from "hono";
import type { User } from "@/db/schema.js";
import { type AppEnv, requireAuth } from "@/middlewares/session.js";
import { buildCalendar, mapDays, markToday } from "@/models/calendar.js";
import { calendarView } from "@/views/calendar.js";

/**
 * Parse an ISO date (`YYYY-MM-DD`) into a local Date, or return `fallback` when it
 * is missing or invalid — the reference day for the calendar (`?date=` override,
 * else today).
 *
 * Uses Temporal (native in Node ≥ 23): `PlainDate.from` enforces the ISO format
 * and `overflow: "reject"` throws on out-of-range dates (e.g. 2026-02-30) rather
 * than silently rolling them over the way `new Date()` would.
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
    const month = buildCalendar(today.getFullYear(), today.getMonth());
    const calendar = mapDays(month, (day) => markToday(day, today));
    return c.html(calendarView(user, calendar));
  });

  return app;
}
