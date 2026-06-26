import { expect, test } from "@playwright/test";
import { ADMIN_NAME, ADMIN_PASSWORD, resetDb } from "@test/helpers/e2e.js";

test.beforeEach(async () => {
  await resetDb();
});

test("unauthenticated visit redirects to the login page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/login");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page).toHaveScreenshot("login.png");
});

test("logs in, shows the home page, then logs out", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Name").fill(ADMIN_NAME);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: `Hello, ${ADMIN_NAME}!` })).toBeVisible();
  await expect(page).toHaveScreenshot("home.png");

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
