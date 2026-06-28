import { html } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import type { User } from "@/db/schema.js";
import type { MarkedCalendar, MarkedDay } from "@/models/calendar.js";
import { layout } from "@/views/layout.js";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function cell(day: MarkedDay): HtmlEscapedString | Promise<HtmlEscapedString> {
  const classes = [
    "cal-cell",
    day.inMonth ? "" : "cal-cell-muted",
    day.isToday ? "cal-cell-today" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return html`<div class="${classes}"><span class="cal-date">${day.date}</span></div>`;
}

/**
 * Month calendar page (display layer). Renders an already-built, today-marked
 * calendar as a 7-column grid. Content for each day comes later — for now cells
 * show only the date.
 */
export function calendarView(user: User, calendar: MarkedCalendar) {
  const heading = `${MONTHS[calendar.month]} ${calendar.year}`;
  const body = html`<section class="calendar">
    <h1 class="page-title">${heading}</h1>
    <div class="cal-grid">
      ${WEEKDAYS.map((w) => html`<div class="cal-weekday">${w}</div>`)}
      ${calendar.weeks.flat().map(cell)}
    </div>
  </section>`;

  return layout(heading, body, { user });
}
