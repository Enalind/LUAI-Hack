import { expect, test } from "@playwright/test";

test("mock dashboard starts on material collection and exposes separate workflow pages", async ({ page, request }) => {
  expect((await request.get("/api/health")).ok()).toBeTruthy();
  await page.goto("/");
  await expect(page.getByText("Prototyp – endast fiktiva patientfall")).toBeVisible();
  await expect(page.getByText("Mock-läge · ingen modellanslutning")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Referensmaterial", exact: true })).toBeVisible();
  await expect(page.locator("#panel-draft")).toBeHidden();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Till innehållet" })).toBeFocused();
  await page.getByRole("link", { name: "Intygsutkast", exact: true }).click();
  await expect(page).toHaveURL(/\/utkast$/);
  await expect(page.getByText("Ditt utkast får plats här.")).toBeVisible();
  await page.getByRole("link", { name: "Granskning", exact: true }).click();
  await expect(page).toHaveURL(/\/granskning$/);
  await expect(page.getByRole("button", { name: "Granska utkast", exact: true })).toBeDisabled();
});

test("shell remains readable on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
