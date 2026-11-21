import { expect, test } from "@playwright/test";

test("mock shell renders without a provider key", async ({ page, request }) => {
  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();
  expect(await health.json()).toEqual({ status: "ok", mode: "mock", checkpoint: "CP4" });
  await page.goto("/");
  await expect(page.getByText("Prototyp – endast fiktiva patientfall")).toBeVisible();
  await expect(page.getByText("Mock-läge · ingen modellanslutning")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Intygsutkast", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Granskning", exact: true })).toBeVisible();
  await expect(page.getByText("Underlag saknas", { exact: true })).toHaveCount(4);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Till innehållet" })).toBeFocused();
});

test("shell remains readable on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
