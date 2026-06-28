import { html } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import type { User } from "@/db/schema.js";
import type { Calendar, CalendarDay, CalendarEvent } from "@/models/calendar.js";
import { layout } from "@/views/layout.js";

// Locale-aware labels via Intl (works server-side in Node, not browser-only).
// Pinned to en-US so output is independent of the server locale.
const headingFormat = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const weekdayFormat = new Intl.DateTimeFormat("en-US", { weekday: "short" });

const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Whether an event's inclusive range covers the given day (date granularity). */
function covers(event: CalendarEvent, date: Date): boolean {
  const t = midnight(date);
  return midnight(event.start) <= t && t <= midnight(event.end);
}

function cell(
  day: CalendarDay,
  month: number,
  events: CalendarEvent[],
): HtmlEscapedString | Promise<HtmlEscapedString> {
  // A cell is dimmed when its real date belongs to an adjacent month.
  const inMonth = day.date.getMonth() === month;
  // "today" is just an overlaid event; later kinds (meals, …) render here too.
  const isToday = events.some((e) => e.kind === "today" && covers(e, day.date));
  const classes = ["cal-cell", inMonth ? "" : "cal-cell-muted", isToday ? "cal-cell-today" : ""]
    .filter(Boolean)
    .join(" ");
  return html`<div class="${classes}"><span class="cal-date">${day.date.getDate()}</span></div>`;
}

/**
 * Month calendar page (display layer). Renders the month grid and overlays
 * `events` on top of it. Per-day content comes later — for now cells show only the
 * date, and the only event is today.
 */
export function calendarView(user: User, calendar: Calendar, events: CalendarEvent[]) {
  const heading = headingFormat.format(new Date(calendar.year, calendar.month, 1));
  // The first row of days is a full Sunday→Saturday week — label the columns from it.
  const weekdays = calendar.days.slice(0, 7);
  const body = html`<section class="calendar">
    <h1 class="page-title">${heading}</h1>
    <div class="cal-grid">
      ${weekdays.map((d) => html`<div class="cal-weekday">${weekdayFormat.format(d.date)}</div>`)}
      ${calendar.days.map((day) => cell(day, calendar.month, events))}
    </div>
  </section>`;

  return layout(heading, body, { user });
}
