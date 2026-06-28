import { expect, test } from "@playwright/test";
import { ADMIN_NAME, ADMIN_PASSWORD, resetDb } from "@test/helpers/e2e.js";

test.beforeEach(async ({ page }) => {
  await resetDb();
  await page.goto("/login");
  await page.getByLabel("Name").fill(ADMIN_NAME);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
});

test("creates, edits, and deletes a pantry item", async ({ page }) => {
  await page.getByRole("link", { name: "Pantry" }).click();
  await expect(page).toHaveURL("/pantry");
  await expect(page.getByRole("heading", { name: "Pantry" })).toBeVisible();
  await expect(page).toHaveScreenshot("pantry.png");

  await page.getByRole("link", { name: "Add item" }).click();
  await expect(page.getByRole("heading", { name: "Add pantry item" })).toBeVisible();
  await expect(page).toHaveScreenshot("pantry-add.png");
  await page.getByLabel("Name").fill("rice");
  await page.getByLabel("Stock date").fill("2026-06-20");
  await page.getByLabel("Best-before days").fill("30");
  await page.getByRole("button", { name: "Add item" }).click();
  await expect(page.getByRole("heading", { name: "rice" })).toBeVisible();
  await expect(page.getByText("2026-07-20")).toBeVisible();

  const item = page.getByRole("article").filter({ hasText: "rice" });
  await item.getByRole("link", { name: "Edit" }).click();
  await expect(page.getByRole("heading", { name: "Edit pantry item" })).toBeVisible();
  await expect(page).toHaveScreenshot("pantry-edit.png");
  await page.getByLabel("Name").fill("brown rice");
  await page.getByLabel("Status").selectOption("consumed");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { name: "brown rice" })).toBeVisible();
  const updatedItem = page.getByRole("article").filter({ hasText: "brown rice" });
  await expect(updatedItem.getByText("Consumed")).toBeVisible();

  await updatedItem.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("heading", { name: "brown rice" })).toHaveCount(0);
});
