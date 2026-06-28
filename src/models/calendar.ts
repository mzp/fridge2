/**
 * Calendar model. Two layers live here:
 *
 *   1. `buildCalendar` — the pure structure of a month (which dates fall on which
 *      day, padded into whole Sunday-first weeks). It knows nothing about "now".
 *   2. `markToday` — processing that annotates that structure with which cell, if
 *      any, is today.
 *
 * Rendering (labels, markup) is the view's job; see `src/views/calendar.ts`.
 */

/** A single calendar cell: its day-of-month and whether it falls in the shown month. */
export interface CalendarDay {
  date: number;
  inMonth: boolean;
}

/** The structure of one month: 0-indexed `month`, padded into whole weeks. */
export interface Calendar {
  year: number;
  month: number;
  weeks: CalendarDay[][];
}

/** A `CalendarDay` annotated with whether it is today. */
export interface MarkedDay extends CalendarDay {
  isToday: boolean;
}

/** A `Calendar` whose days carry the today annotation. */
export interface MarkedCalendar {
  year: number;
  month: number;
  weeks: MarkedDay[][];
}

/**
 * Build the month containing `year`/`month` (0-indexed). Every week holds 7 days,
 * Sunday-first; leading/trailing cells belong to the adjacent months
 * (`inMonth: false`).
 */
export function buildCalendar(year: number, month: number): Calendar {
  const start = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const cells: CalendarDay[] = [];
  // Leading days from the previous month.
  for (let i = start - 1; i >= 0; i--) {
    cells.push({ date: daysInPrev - i, inMonth: false });
  }
  // Days of this month.
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: d, inMonth: true });
  }
  // Trailing days to fill the final week.
  for (let d = 1; cells.length % 7 !== 0; d++) {
    cells.push({ date: d, inMonth: false });
  }

  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return { year, month, weeks };
}

/**
 * Annotate a calendar with today: a cell is today only when `today` falls in the
 * calendar's own month (in-month cells, never the adjacent-month padding).
 */
export function markToday(calendar: Calendar, today: Date): MarkedCalendar {
  const isCurrentMonth =
    today.getFullYear() === calendar.year && today.getMonth() === calendar.month;
  const date = today.getDate();
  return {
    year: calendar.year,
    month: calendar.month,
    weeks: calendar.weeks.map((week) =>
      week.map((day) => ({ ...day, isToday: isCurrentMonth && day.inMonth && day.date === date })),
    ),
  };
}
