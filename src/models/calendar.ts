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

/**
 * A single calendar cell: the actual calendar `date` it represents and whether it
 * is today. Whether the cell falls inside the displayed month is derivable from
 * `date` vs the calendar's `month` — that's the view's call. `buildCalendar`
 * leaves `isToday` false; `markToday` sets it.
 */
export interface CalendarDay {
  date: Date;
  isToday: boolean;
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
 * Build the month containing `year`/`month` (0-indexed). Days run Sunday-first and
 * are padded to a whole number of weeks; leading/trailing cells are the real dates
 * of the adjacent months. No day is today until `markToday` runs.
 */
export function buildCalendar(year: number, month: number): Calendar {
  const start = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const total = Math.ceil((start + daysInMonth) / 7) * 7;

  const days: CalendarDay[] = [];
  for (let i = 0; i < total; i++) {
    // Day-of-month arithmetic rolls negatives/overflows into the adjacent months.
    days.push({ date: new Date(year, month, 1 - start + i), isToday: false });
  }
  return { year, month, days };
}

/**
 * Map every day of a calendar, returning a new calendar. Lets callers apply a
 * per-day transform (e.g. `markToday`) without reaching into `days` themselves.
 */
export function mapDays(calendar: Calendar, fn: (day: CalendarDay) => CalendarDay): Calendar {
  return { year: calendar.year, month: calendar.month, days: calendar.days.map(fn) };
}

/** Mark a single day as today when its real date matches `today`. */
export function markToday(day: CalendarDay, today: Date): CalendarDay {
  const isToday =
    day.date.getFullYear() === today.getFullYear() &&
    day.date.getMonth() === today.getMonth() &&
    day.date.getDate() === today.getDate();
  return { ...day, isToday };
}
