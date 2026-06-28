import { html } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import type { User } from "@/db/schema.js";
import type { Calendar, CalendarDay, CalendarEvent } from "@/models/calendar.js";
import { type EventSegment, layoutWeeks, type WeekLayout } from "@/views/helpers/week-layout.js";
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
  // "today" is an overlaid event rendered as a cell highlight (not a bar).
  const isToday = events.some((e) => e.kind === "today" && covers(e, day.date));
  const classes = [
    "calendar-cell",
    inMonth ? "" : "calendar-cell-muted",
    isToday ? "calendar-cell-today" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return html`<div class="${classes}"><span class="calendar-date">${day.date.getDate()}</span></div>`;
}

/** A single event bar segment, positioned within its week's 7-column grid. */
function bar(segment: EventSegment): HtmlEscapedString | Promise<HtmlEscapedString> {
  const classes = [
    "calendar-bar",
    `calendar-bar-${segment.event.kind}`, // colour is per kind: one for pantry, others later
    segment.continuesBefore ? "calendar-bar-open-l" : "",
    segment.continuesAfter ? "calendar-bar-open-r" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const style = `grid-column:${segment.startCol + 1}/span ${segment.span};grid-row:${segment.lane + 1}`;
  if (segment.event.href) {
    return html`<a
      class="${classes} calendar-bar-link"
      style="${style}"
      href="${segment.event.href}"
    >${segment.event.label ?? ""}</a>`;
  }
  return html`<div class="${classes}" style="${style}">${segment.event.label ?? ""}</div>`;
}

/** One week: the day cells, with the event bars overlaid on top. */
function weekRow(
  week: WeekLayout,
  month: number,
  events: CalendarEvent[],
): HtmlEscapedString | Promise<HtmlEscapedString> {
  return html`<div class="calendar-week">
    <div class="calendar-week-days">${week.days.map((d) => cell(d, month, events))}</div>
    <div class="calendar-week-bars">${week.segments.map(bar)}</div>
  </div>`;
}

/**
 * Month calendar page (display layer). Renders the month as Sunday-first week rows
 * with overlaid event bars. `today` is drawn as a cell highlight; spanning events
 * (e.g. pantry shelf life) become bars via `layoutWeeks`.
 */
export function calendarView(user: User, calendar: Calendar, events: CalendarEvent[]) {
  const heading = headingFormat.format(new Date(calendar.year, calendar.month, 1));
  // The first row of days is a full Sunday→Saturday week — label the columns from it.
  const weekdays = calendar.days.slice(0, 7);
  // Bars are everything except the today highlight.
  const weeks = layoutWeeks(
    calendar,
    events.filter((e) => e.kind !== "today"),
  );
  const body = html`<section class="calendar">
    <h1 class="page-title">${heading}</h1>
    <div class="calendar-grid">
      <div class="calendar-weekdays">
        ${weekdays.map((d) => html`<div class="calendar-weekday">${weekdayFormat.format(d.date)}</div>`)}
      </div>
      ${weeks.map((w) => weekRow(w, calendar.month, events))}
    </div>
  </section>`;

  return layout(heading, body, { user });
}
