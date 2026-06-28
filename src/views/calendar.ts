import { html } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import type { User } from "@/db/schema.js";
import type { Calendar, CalendarDay } from "@/models/calendar.js";
import { layout } from "@/views/layout.js";

// Locale-aware labels via Intl (works server-side in Node, not browser-only).
// Pinned to en-US so output is independent of the server locale.
const headingFormat = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const weekdayFormat = new Intl.DateTimeFormat("en-US", { weekday: "short" });

function cell(day: CalendarDay, month: number): HtmlEscapedString | Promise<HtmlEscapedString> {
  // A cell is dimmed when its real date belongs to an adjacent month.
  const inMonth = day.date.getMonth() === month;
  const classes = ["cal-cell", inMonth ? "" : "cal-cell-muted", day.isToday ? "cal-cell-today" : ""]
    .filter(Boolean)
    .join(" ");
  return html`<div class="${classes}"><span class="cal-date">${day.date.getDate()}</span></div>`;
}

/**
 * Month calendar page (display layer). Renders an already-built, today-marked
 * calendar as a 7-column grid. Content for each day comes later — for now cells
 * show only the date.
 */
export function calendarView(user: User, calendar: Calendar) {
  const heading = headingFormat.format(new Date(calendar.year, calendar.month, 1));
  // The first row of days is a full Sunday→Saturday week — label the columns from it.
  const weekdays = calendar.days.slice(0, 7);
  const body = html`<section class="calendar">
    <h1 class="page-title">${heading}</h1>
    <div class="cal-grid">
      ${weekdays.map((d) => html`<div class="cal-weekday">${weekdayFormat.format(d.date)}</div>`)}
      ${calendar.days.map((day) => cell(day, calendar.month))}
    </div>
  </section>`;

  return layout(heading, body, { user });
}
