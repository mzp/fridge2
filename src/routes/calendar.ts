import { Hono } from "hono";
import type { User } from "@/db/schema.js";
import { type AppEnv, requireAuth } from "@/middlewares/session.js";
import { buildCalendar, markToday } from "@/models/calendar.js";
import { calendarView } from "@/views/calendar.js";

export function createCalendarRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/calendar", requireAuth, (c) => {
    // requireAuth guarantees a user; assert it so the view gets a non-null User.
    const user = c.var.user as User;
    // Three layers: build the month, mark today, render it.
    const today = new Date();
    const calendar = markToday(buildCalendar(today.getFullYear(), today.getMonth()), today);
    return c.html(calendarView(user, calendar));
  });

  return app;
}
