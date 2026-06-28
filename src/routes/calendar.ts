import { Hono } from "hono";
import type { User } from "@/db/schema.js";
import { type AppEnv, requireAuth } from "@/middlewares/session.js";
import { buildCalendar, markToday, parseDate } from "@/models/calendar.js";
import { calendarView } from "@/views/calendar.js";

export function createCalendarRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/calendar", requireAuth, (c) => {
    // requireAuth guarantees a user; assert it so the view gets a non-null User.
    const user = c.var.user as User;
    // Reference day: ?date=YYYY-MM-DD if given (keeps rendering deterministic for
    // tests/navigation), otherwise the current day. Three layers: build, mark, render.
    const today = parseDate(c.req.query("date"), new Date());
    const calendar = markToday(buildCalendar(today.getFullYear(), today.getMonth()), today);
    return c.html(calendarView(user, calendar));
  });

  return app;
}
