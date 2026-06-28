import { expect, test } from "@playwright/test";
import { ADMIN_NAME, ADMIN_PASSWORD, resetDb } from "@test/helpers/e2e.js";
import { readLogs } from "@test/helpers/logs.js";

test.beforeEach(async () => {
  await resetDb();
});

test("unauthenticated visit redirects to the login page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/login");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page).toHaveScreenshot("login.png");
});

test("logs in, lands on the calendar, then logs out", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Name").fill(ADMIN_NAME);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  // Home (/) redirects signed-in visitors to the calendar.
  await expect(page).toHaveURL("/calendar");
  await expect(page.getByText("Sun")).toBeVisible();

  // Snapshot a fixed month (?date=) so the baseline is stable regardless of the
  // date the test runs on.
  await page.goto("/calendar?date=2026-06-15");
  await expect(page.getByRole("heading", { name: "June 2026" })).toBeVisible();
  await expect(page).toHaveScreenshot("calendar.png");

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/login");
});

test("rejects a wrong password", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Name").fill(ADMIN_NAME);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("alert")).toHaveText("Invalid name or password");
});

// Logging is plumbing: this single smoke check (the wiring works) is enough.
// Don't add a log assertion for every route.
test("the server logs requests", async ({ page }) => {
  await page.goto("/login");
  const logged = readLogs().some((e) => e.msg === "request" && e.path === "/login");
  expect(logged).toBe(true);
});
