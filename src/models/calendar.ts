/**
 * Calendar model — the pure structure of a month: which dates fall on which day,
 * padded into whole Sunday-first weeks. It knows nothing about "now" or content;
 * those are overlaid as events (see `CalendarEvent`).
 *
 * Rendering (labels, markup, event placement) is the view's job; see
 * `src/views/calendar.ts`.
 */

/** A single calendar cell: the actual calendar `date` it represents. */
export interface CalendarDay {
  date: Date;
}

/**
 * The structure of one month: 0-indexed `month` and a flat, Sunday-first run of
 * days padded to whole weeks (leading/trailing cells are real dates from the
 * adjacent months). Splitting `days` into week rows is the view's job.
 */
export interface Calendar {
  year: number;
  month: number;
  days: CalendarDay[];
}

/**
 * Something laid over the date grid for an inclusive `start`..`end` range. `kind`
 * drives styling — today is just an event of kind `"today"`; meals and the like
 * will be further kinds. Single-day items have `start` equal to `end`.
 */
export interface CalendarEvent {
  start: Date;
  end: Date;
  kind: string;
}

/**
 * Build the month containing `year`/`month` (0-indexed). Days run Sunday-first and
 * are padded to a whole number of weeks; leading/trailing cells are the real dates
 * of the adjacent months.
 */
export function buildCalendar(year: number, month: number): Calendar {
  const start = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const total = Math.ceil((start + daysInMonth) / 7) * 7;

  const days: CalendarDay[] = [];
  for (let i = 0; i < total; i++) {
    // Day-of-month arithmetic rolls negatives/overflows into the adjacent months.
    days.push({ date: new Date(year, month, 1 - start + i) });
  }
  return { year, month, days };
}
