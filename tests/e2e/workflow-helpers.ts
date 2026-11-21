import { type Page } from "@playwright/test";

export async function openPanel(page: Page, name: string) {
  await page.getByRole("link", { name, exact: true }).click();
}
export async function selectCase(page: Page, id: string) {
  await openPanel(page, "Underlag");
  const examples = page.locator(".example-picker");
  const toggle = examples.getByRole("button", { name: "Prova med ett fiktivt exempel", exact: true });
  if (await toggle.getAttribute("aria-expanded") !== "true") await toggle.click();
  await page.getByLabel("Välj fiktivt exempel").selectOption(id);
}

export async function showClaimSources(page: Page, label: string) {
  const text = page.getByLabel(label, { exact: true });
  await text.scrollIntoViewIfNeeded();
  await text.press("Alt+ArrowDown");
}
