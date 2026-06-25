import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password.js";

describe("password hashing", () => {
  it("verifies a correct password", async () => {
    const stored = await hashPassword("hunter2");
    expect(await verifyPassword("hunter2", stored)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const stored = await hashPassword("hunter2");
    expect(await verifyPassword("wrong", stored)).toBe(false);
  });

  it("uses a random salt, so the same password hashes differently", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  it("rejects malformed stored values", async () => {
    expect(await verifyPassword("x", "garbage")).toBe(false);
    expect(await verifyPassword("x", "")).toBe(false);
  });
});
