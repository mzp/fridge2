import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";
import { daysRemaining, expiryStatus } from "@/models/pantry.js";

const today = Temporal.PlainDate.from("2026-06-27");

describe("daysRemaining", () => {
  it("counts whole days until expiry", () => {
    // Stocked 2026-06-20, good for 10 days → expires 2026-06-30, 3 days out.
    expect(daysRemaining("2026-06-20", 10, today)).toBe(3);
  });

  it("is 0 on the expiry day itself", () => {
    expect(daysRemaining("2026-06-20", 7, today)).toBe(0);
  });

  it("goes negative once past", () => {
    expect(daysRemaining("2026-06-20", 5, today)).toBe(-2);
  });

  it("is null when expiry isn't tracked", () => {
    expect(daysRemaining(null, 10, today)).toBeNull();
    expect(daysRemaining("2026-06-20", null, today)).toBeNull();
  });
});

describe("expiryStatus", () => {
  it("is none without a tracked expiry", () => {
    expect(expiryStatus(null, null, today)).toBe("none");
    expect(expiryStatus("2026-06-20", null, today)).toBe("none");
  });

  it("is fresh when comfortably ahead", () => {
    expect(expiryStatus("2026-06-20", 14, today)).toBe("fresh"); // 7 days out
  });

  it("is soon at the 3-day boundary", () => {
    expect(expiryStatus("2026-06-20", 10, today)).toBe("soon"); // exactly 3 days out
  });

  it("is soon on the expiry day", () => {
    expect(expiryStatus("2026-06-20", 7, today)).toBe("soon"); // 0 days out
  });

  it("is expired once past", () => {
    expect(expiryStatus("2026-06-20", 5, today)).toBe("expired"); // -2 days
  });
});
