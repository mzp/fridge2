import type { Calendar, CalendarDay, CalendarEvent } from "@/models/calendar.js";

/**
 * Bar placement for the calendar view: turning a flat list of span events into
 * per-week, per-lane segments the grid can draw. This is a rendering concern (it
 * knows about weeks, columns and stacking), so it lives with the view, not the
 * date model.
 */

/** One event clipped to a single week: where its bar sits and whether it overflows. */
export interface EventSegment {
  event: CalendarEvent;
  lane: number;
  startCol: number; // 0-6
  span: number; // number of columns
  continuesBefore: boolean; // started in an earlier week
  continuesAfter: boolean; // continues into a later week
}

/** A week's 7 days plus the event-bar segments to draw over them. */
export interface WeekLayout {
  days: CalendarDay[];
  segments: EventSegment[];
  laneCount: number;
}

/** Local midnight of a date, as ms — the granularity all span math works at. */
const dayMs = (d: Date): number => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/**
 * Assign each event a lane (row) such that events overlapping in date never share
 * one, kept stable across weeks so a multi-week bar stays on the same row. Greedy
 * interval partitioning: earliest start first, reuse the lowest free lane.
 * Returns lanes parallel to `events`.
 */
function assignLanes(events: CalendarEvent[]): number[] {
  const lanes = new Array<number>(events.length).fill(0);
  const laneEnds: number[] = []; // last occupied day (ms) per lane
  const order = events
    .map((event, index) => ({ event, index }))
    .sort(
      (a, b) =>
        dayMs(a.event.start) - dayMs(b.event.start) || dayMs(a.event.end) - dayMs(b.event.end),
    );
  for (const { event, index } of order) {
    const start = dayMs(event.start);
    let lane = laneEnds.findIndex((end) => end < start);
    if (lane === -1) {
      lane = laneEnds.length;
    }
    laneEnds[lane] = dayMs(event.end);
    lanes[index] = lane;
  }
  return lanes;
}

/** Clip one event to a week's day cells, or null when it doesn't overlap. */
function clipToWeek(event: CalendarEvent, lane: number, days: CalendarDay[]): EventSegment | null {
  const cols = days.map((d) => dayMs(d.date));
  const weekStart = cols[0] ?? 0;
  const weekEnd = cols[cols.length - 1] ?? 0;
  const start = dayMs(event.start);
  const end = dayMs(event.end);
  if (start > weekEnd || end < weekStart) {
    return null;
  }
  const startCol = Math.max(
    0,
    cols.findIndex((c) => c >= start),
  );
  let endCol = cols.length - 1;
  while (endCol > 0 && (cols[endCol] ?? 0) > end) {
    endCol--;
  }
  return {
    event,
    lane,
    startCol,
    span: endCol - startCol + 1,
    continuesBefore: start < weekStart,
    continuesAfter: end > weekEnd,
  };
}

/**
 * Lay out `events` over the calendar as bar segments, one group per Sunday-first
 * week. Each event is clipped to the weeks it touches; `continuesBefore/After`
 * flag the clipped ends so the view can render open edges.
 */
export function layoutWeeks(calendar: Calendar, events: CalendarEvent[]): WeekLayout[] {
  const lanes = assignLanes(events);
  const weeks: WeekLayout[] = [];
  for (let w = 0; w < calendar.days.length; w += 7) {
    const days = calendar.days.slice(w, w + 7);
    const segments = events
      .map((event, i) => clipToWeek(event, lanes[i] ?? 0, days))
      .filter((s): s is EventSegment => s !== null);
    const laneCount = segments.reduce((max, s) => Math.max(max, s.lane + 1), 0);
    weeks.push({ days, segments, laneCount });
  }
  return weeks;
}
