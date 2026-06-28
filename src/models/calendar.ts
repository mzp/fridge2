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
 * One month: 0-indexed `month` and a flat, Sunday-first run of days padded to
 * whole weeks (leading/trailing cells are real dates from the adjacent months).
 * Build with `Calendar.create`; splitting `days` into week rows is the view's job.
 */
export class Calendar {
  private constructor(
    readonly year: number,
    readonly month: number,
    readonly days: CalendarDay[],
  ) {}

  /**
   * Build the month containing `year`/`month` (0-indexed). Days run Sunday-first
   * and are padded to a whole number of weeks; leading/trailing cells are the real
   * dates of the adjacent months.
   */
  static create(year: number, month: number): Calendar {
    const start = new Date(year, month, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const total = Math.ceil((start + daysInMonth) / 7) * 7;

    const days: CalendarDay[] = [];
    for (let i = 0; i < total; i++) {
      // Day-of-month arithmetic rolls negatives/overflows into the adjacent months.
      days.push({ date: new Date(year, month, 1 - start + i) });
    }
    return new Calendar(year, month, days);
  }
}

/**
 * Something laid over the date grid for an inclusive `start`..`end` range. `kind`
 * drives styling — today is just an event of kind `"today"`; meals and the like
 * will be further kinds. Single-day items have `start` equal to `end`. `label` is
 * the text shown on a span bar; `kind` also picks the bar's colour (one per kind).
 *
 * Placing events into week rows and lanes is a rendering concern — see
 * `src/views/helpers/week-layout.ts`.
 */
export interface CalendarEvent {
  start: Date;
  end: Date;
  kind: string;
  label?: string;
}
