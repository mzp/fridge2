import { describe, expect, it } from "vitest";
import { buildCalendar, markToday, parseDate } from "@/models/calendar.js";

describe("buildCalendar", () => {
  it("pads to whole weeks (every week has 7 days)", () => {
    // June 2026 starts on a Monday and has 30 days.
    const cal = buildCalendar(2026, 5);
    expect(cal.weeks.every((w) => w.length === 7)).toBe(true);
    expect(cal.weeks.flat().filter((d) => d.inMonth)).toHaveLength(30);
  });

  it("places day 1 after the leading padding (June 1, 2026 is a Monday)", () => {
    const cal = buildCalendar(2026, 5);
    const flat = cal.weeks.flat();
    expect(flat[0]).toMatchObject({ inMonth: false });
    expect(flat[1]).toMatchObject({ date: 1, inMonth: true });
  });

  it("handles a leap-year February with 29 days", () => {
    const cal = buildCalendar(2024, 1);
    expect(cal.weeks.flat().filter((d) => d.inMonth)).toHaveLength(29);
  });
});

describe("parseDate", () => {
  const fallback = new Date(2026, 5, 27);

  it("parses a valid YYYY-MM-DD into a local date", () => {
    const d = parseDate("2026-06-15", fallback);
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 5, 15]);
  });

  it("falls back when the value is missing", () => {
    expect(parseDate(undefined, fallback)).toBe(fallback);
    expect(parseDate(null, fallback)).toBe(fallback);
    expect(parseDate("", fallback)).toBe(fallback);
  });

  it("falls back on malformed input", () => {
    expect(parseDate("2026/06/15", fallback)).toBe(fallback);
    expect(parseDate("June 15", fallback)).toBe(fallback);
    expect(parseDate("2026-6-5", fallback)).toBe(fallback);
  });

  it("falls back on out-of-range dates instead of rolling them over", () => {
    expect(parseDate("2026-13-01", fallback)).toBe(fallback);
    expect(parseDate("2026-02-30", fallback)).toBe(fallback);
  });
});

describe("markToday", () => {
  it("marks today only on the in-month cell of the current month", () => {
    const cal = markToday(buildCalendar(2026, 5), new Date(2026, 5, 26));
    const today = cal.weeks.flat().filter((d) => d.isToday);
    expect(today).toHaveLength(1);
    expect(today[0]).toMatchObject({ date: 26, inMonth: true });
  });

  it("marks nothing when today is in another month", () => {
    const cal = markToday(buildCalendar(2026, 4), new Date(2026, 5, 26));
    expect(cal.weeks.flat().some((d) => d.isToday)).toBe(false);
  });

  it("never marks adjacent-month padding even if the date number matches", () => {
    // July 1, 2026: June's grid has a trailing "1" from July; it must not be today.
    const cal = markToday(buildCalendar(2026, 5), new Date(2026, 6, 1));
    expect(cal.weeks.flat().some((d) => d.isToday)).toBe(false);
  });
});
