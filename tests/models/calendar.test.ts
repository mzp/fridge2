import { describe, expect, it } from "vitest";
import { buildCalendar } from "@/models/calendar.js";

// Displayed-month membership lives with the dates: a day is "in month" when its
// real date's month matches the calendar's. The view derives styling from that
// (and from overlaid events); here we assert against the dates directly.
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
