import { describe, expect, it } from "vitest";
import { buildCalendar, type CalendarDay, mapDays, markToday } from "@/models/calendar.js";

// The displayed-month membership now lives with the dates: a day is "in month"
// when its real date's month matches the calendar's. The view derives styling
// from that; here we assert against the dates directly.
const inMonth = (cal: ReturnType<typeof buildCalendar>) =>
  cal.days.filter((d) => d.date.getMonth() === cal.month);

describe("buildCalendar", () => {
  it("pads to a whole number of weeks (length divisible by 7)", () => {
    // June 2026 starts on a Monday and has 30 days.
    const cal = buildCalendar(2026, 5);
    expect(cal.days.length % 7).toBe(0);
    expect(inMonth(cal)).toHaveLength(30);
  });

  it("places day 1 after the leading padding (June 1, 2026 is a Monday)", () => {
    const cal = buildCalendar(2026, 5);
    expect(cal.days[0]?.date.getMonth()).toBe(4); // trailing May
    expect(cal.days[1]?.date).toEqual(new Date(2026, 5, 1));
  });

  it("handles a leap-year February with 29 days", () => {
    const cal = buildCalendar(2024, 1);
    expect(inMonth(cal)).toHaveLength(29);
  });
});

describe("markToday", () => {
  const day = (date: Date): CalendarDay => ({ date, isToday: false });

  it("marks a day whose date is today", () => {
    expect(markToday(day(new Date(2026, 5, 26)), new Date(2026, 5, 26)).isToday).toBe(true);
  });

  it("leaves a day with a different date unmarked", () => {
    expect(markToday(day(new Date(2026, 5, 26)), new Date(2026, 5, 27)).isToday).toBe(false);
  });

  it("compares the whole date, not just the day-of-month", () => {
    expect(markToday(day(new Date(2026, 4, 26)), new Date(2026, 5, 26)).isToday).toBe(false);
  });
});

describe("mapDays", () => {
  const markAll = (cal: ReturnType<typeof buildCalendar>, today: Date) =>
    mapDays(cal, (d) => markToday(d, today));

  it("marks exactly the current day when today is in the grid", () => {
    const cal = markAll(buildCalendar(2026, 5), new Date(2026, 5, 26));
    const today = cal.days.filter((d) => d.isToday);
    expect(today).toHaveLength(1);
    expect(today[0]?.date).toEqual(new Date(2026, 5, 26));
  });

  it("marks nothing when today never appears in the grid", () => {
    // May 2026's grid never reaches June 26.
    const cal = markAll(buildCalendar(2026, 4), new Date(2026, 5, 26));
    expect(cal.days.some((d) => d.isToday)).toBe(false);
  });
});
