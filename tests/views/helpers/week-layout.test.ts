import { describe, expect, it } from "vitest";
import { Calendar, type CalendarEvent } from "@/models/calendar.js";
import { layoutWeeks } from "@/views/helpers/week-layout.js";

describe("layoutWeeks", () => {
  // June 2026 (Sunday-first): week0 = May31..Jun6, week1 = Jun7..13, week2 = Jun14..20.
  const june = Calendar.create(2026, 5);
  const span = (from: number, to: number): CalendarEvent => ({
    start: new Date(2026, 5, from),
    end: new Date(2026, 5, to),
    kind: "pantry",
  });

  it("places a single-week event in just that week with the right columns", () => {
    const weeks = layoutWeeks(june, [span(9, 11)]); // Jun 9–11, all in week1 (Tue–Thu)
    expect(weeks[0]?.segments).toHaveLength(0);
    expect(weeks[1]?.segments).toEqual([
      expect.objectContaining({
        startCol: 2,
        span: 3,
        lane: 0,
        continuesBefore: false,
        continuesAfter: false,
      }),
    ]);
  });

  it("splits a cross-week event into a segment per week with open edges", () => {
    const weeks = layoutWeeks(june, [span(5, 8)]); // Jun 5–8 straddles week0/week1
    expect(weeks[0]?.segments[0]).toMatchObject({
      startCol: 5,
      span: 2,
      continuesBefore: false,
      continuesAfter: true,
    });
    expect(weeks[1]?.segments[0]).toMatchObject({
      startCol: 0,
      span: 2,
      continuesBefore: true,
      continuesAfter: false,
    });
  });

  it("stacks overlapping events onto separate lanes", () => {
    const weeks = layoutWeeks(june, [span(9, 11), span(10, 12)]);
    expect(weeks[1]?.laneCount).toBe(2);
    expect(weeks[1]?.segments.map((s) => s.lane).sort()).toEqual([0, 1]);
  });

  it("reuses one lane for non-overlapping events", () => {
    const weeks = layoutWeeks(june, [span(8, 9), span(11, 12)]);
    expect(weeks[1]?.laneCount).toBe(1);
    expect(weeks[1]?.segments.every((s) => s.lane === 0)).toBe(true);
  });
});
