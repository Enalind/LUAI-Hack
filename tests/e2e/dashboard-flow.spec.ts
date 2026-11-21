import { expect, test } from "@playwright/test";
import { openPanel, selectCase, showClaimSources } from "./workflow-helpers";
import { FK_GUIDANCE_SOURCE, FK_GUIDANCE_VERSION, FK_RULE_IDS } from "../../lib/fk-guidance";

test("typed reference material can be added, edited, revisited and removed", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Lägg till underlag", exact: true })).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath("dashboard.png"), fullPage: true });
  await page.getByRole("button", { name: "Lägg till underlag", exact: true }).click();
  await page.getByRole("button", { name: /Journalanteckning Tidigare/ }).click();
  const content = page.getByLabel("Innehåll · Journalanteckning", { exact: true });
  await content.fill("Fiktiv journalanteckning från ett tidigare besök.");
  await page.getByLabel("Titel", { exact: true }).fill("Journal från november");
  await page.getByRole("button", { name: "Lägg till underlag", exact: true }).click();
  await page.getByRole("button", { name: /Provsvar \/ undersökning Laboratorieresultat/ }).click();
  await page.getByLabel("Innehåll · Provsvar / undersökning", { exact: true }).fill("Fiktivt provsvar.");
  await expect(page.locator(".material-document")).toHaveCount(2);
  await openPanel(page, "Intygsutkast");
  await openPanel(page, "Underlag");
  await expect(content).toHaveValue("Fiktiv journalanteckning från ett tidigare besök.");
  await expect(page.getByLabel("Titel", { exact: true }).first()).toHaveValue("Journal från november");
  await page.getByRole("button", { name: "Ta bort Provsvar / undersökning", exact: true }).click();
  await expect(page.locator(".material-document")).toHaveCount(1);
});

for (const method of ["keyboard", "click"] as const) test(`diagnosis ${method} selection autofills both fields and passes through the real code`, async ({ page }) => {
  await page.goto("/"); await selectCase(page, "D1");
  const search = page.getByRole("combobox", { name: "Sök diagnos eller ICD-10-SE-kod" });
  await search.fill("F43.8A");
  await expect(page.getByRole("option", { name: /F43.8A Utmattningssyndrom/ })).toBeVisible();
  if (method === "keyboard") { await search.press("ArrowDown"); await search.press("Enter"); }
  else {
    await page.getByRole("option", { name: /F43.8A Utmattningssyndrom/ }).hover();
    await page.mouse.down();
    await expect(search).toBeFocused();
    await page.mouse.up();
  }
  await expect(page.getByLabel("Diagnoskod", { exact: true })).toHaveValue("F43.8A");
  await expect(page.getByLabel("Diagnos", { exact: true })).toHaveValue("Utmattningssyndrom");
  await expect(page.getByText(/Verifierad i ICD-10-SE 2026/)).toBeVisible();
  const completed = page.waitForResponse((response) => response.url().endsWith("/api/draft"));
  await page.getByRole("button", { name: "Skapa intygsutkast", exact: true }).click();
  expect((await (await completed).json()).draft.explicitDecision.diagnosisCode).toBe("F43.8A");
});

for (const narrow of [false, true]) test(`hover citations and review highlights preserve edits (${narrow ? "mobile" : "desktop"})`, async ({ page }, testInfo) => {
  if (narrow) await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/"); await selectCase(page, "D3");
  await page.getByRole("button", { name: "Skapa intygsutkast", exact: true }).click();
  await expect(page).toHaveURL(/\/utkast$/);
  const claimText = page.getByLabel("Påstående 1 · Funktionsnedsättning", { exact: true });
  await expect(page.locator(".source-chip")).toHaveCount(0);
  const phrase = page.locator(".source-text-highlight").filter({ hasText: "inte har tappat känseln" });
  await expect(phrase).toHaveText("inte har tappat känseln");
  await phrase.hover({ force: true });
  const preview = page.getByRole("dialog", { name: "för påstående 1 i Funktionsnedsättning", exact: true });
  await expect(preview).toContainText("inte tappat känseln");
  await page.screenshot({ path: testInfo.outputPath("citation-preview.png"), fullPage: false });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await claimText.press("Escape"); await expect(preview).toHaveCount(0);
  await showClaimSources(page, "Påstående 1 · Funktionsnedsättning");
  await expect(preview.getByRole("button", { name: /Visa källa/ })).toBeFocused();
  await preview.press("Escape");
  const claim = page.getByLabel("Påstående 1 · Funktionsnedsättning");
  await claim.fill("Patienten har tappat känseln.");
  await expect(page.locator(".claim-card").filter({ has: claim }).locator(".source-text-highlight")).toHaveCount(0);
  await openPanel(page, "Underlag"); await openPanel(page, "Intygsutkast");
  await expect(claim).toHaveValue("Patienten har tappat känseln.");
  await page.screenshot({ path: testInfo.outputPath("draft.png"), fullPage: true });
  await page.getByRole("button", { name: "Granska utkast", exact: true }).click();
  await expect(page).toHaveURL(/\/granskning$/);
  await expect(page.locator("mark.review-text-highlight.conflict-highlight")).toHaveCount(1);
  await expect(page.locator(".field-attention")).not.toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("review.png"), fullPage: true });
  await expect(page.locator(".inline-finding")).toHaveCount(0);
  const problem = page.locator("mark.review-text-highlight.conflict-highlight");
  await expect(problem).toHaveText("har tappat känseln.");
  await problem.hover({ force: true });
  const explanation = page.getByRole("dialog", { name: "för påstående 1 i Funktionsnedsättning", exact: true });
  await expect(explanation).toContainText("Formuleringen avviker");
  await expect(explanation.getByRole("link", { name: /FK: Läkarens bedömningsunderlag/ })).toHaveAttribute("href", /^https:\/\/www\.forsakringskassan\.se\/halso-och-sjukvarden\/sjukdom-och-skada\/intyg-for-sjukpenning#:~:text=/);
  await expect(explanation).toContainText("Patientens berättelse och läkarens professionella bedömning");
  await page.screenshot({ path: testInfo.outputPath("fk-guidance-hover.png"), fullPage: false });
  await explanation.getByRole("button", { name: "Visa granskningsfynd", exact: true }).click();
  await expect(page.getByRole("article", { name: "Fynd: Källstöd och motsägelser", exact: true }).filter({ hasText: "Förslag: Ersätt påståendet" })).toBeFocused();
  await claim.fill("Patienten uppger att hen inte har tappat känseln.");
  await expect(page.locator(".review-text-highlight")).toHaveCount(0);
  await expect(page.getByRole("status", { name: "Utkaststatus" })).toContainText("granskning inaktuell");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("each highlighted phrase opens only its own supporting references", async ({ page }) => {
  await page.goto("/"); await selectCase(page, "D1");
  await page.getByRole("button", { name: "Skapa intygsutkast", exact: true }).click();
  const text = page.getByLabel("Påstående 2 · Sysselsättning", { exact: true });
  const card = page.locator(".claim-card").filter({ has: text });
  const weight = card.locator("mark").filter({ hasText: "lyft av lådor på 10–15 kg" });
  await expect(weight).toBeVisible();
  await weight.hover({ force: true });
  const popup = page.getByRole("dialog", { name: "för påstående 2 i Sysselsättning", exact: true });
  await expect(popup.locator(".reference-passage")).toHaveCount(1);
  await expect(popup).toContainText("Jag lyfter lådor på 10–15 kg");
  await text.hover({ position: { x: 10, y: 12 } });
  await expect(popup).toHaveCount(0);
  await card.locator("mark").filter({ hasText: "etikettering och inventering" }).hover({ force: true });
  await expect(popup.locator(".reference-passage")).toHaveCount(1);
  await expect(popup).toContainText("Det finns etikettering vid ett högt bord");
});

test("review gaps highlight the field heading and explain themselves on hover", async ({ page }) => {
  await page.goto("/"); await selectCase(page, "D2");
  await page.getByRole("button", { name: "Skapa intygsutkast", exact: true }).click();
  await page.getByRole("button", { name: "Granska utkast", exact: true }).click();
  const heading = page.getByRole("heading", { name: "Sysselsättning", exact: true }).locator("mark");
  await heading.hover();
  const popup = page.getByRole("dialog", { name: "för fält 3", exact: true });
  await expect(popup).toContainText("Vilket yrke och vilka konkreta arbetsuppgifter");
  await expect(popup.getByRole("link", { name: /FK: Sysselsättning och bedömningsgrund/ })).toHaveAttribute("target", "_blank");
  await expect(popup).toContainText("Beskriv den sysselsättning");
  await expect(popup.locator(".reference-passage")).toHaveCount(0);
  await expect(page.locator(".inline-finding")).toHaveCount(0);
});

test("a versioned review-contract response shows the guidance scope", async ({ page }) => {
  await page.route("**/api/review", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.metadata = { ...body.metadata, guidanceVersion: FK_GUIDANCE_VERSION };
    body.guidelineChecks = FK_RULE_IDS.map((ruleId) => ({ ruleId, status: "no_issue_identified" }));
    await route.fulfill({ response, json: body });
  });
  await page.goto("/"); await selectCase(page, "D1");
  await page.getByRole("button", { name: "Skapa intygsutkast", exact: true }).click();
  await page.getByRole("button", { name: "Granska utkast", exact: true }).click();
  const scope = page.locator(".guidance-version");
  await expect(scope).toHaveAttribute("data-guidance-version", FK_GUIDANCE_VERSION);
  await expect(scope).toContainText("7 vägledningsområden genomgångna");
  await expect(scope.getByRole("link")).toHaveAttribute("href", FK_GUIDANCE_SOURCE);
  await expect(scope).toContainText("inte en fullständig intygsprövning");
});

test.describe("touch reference access", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test("tapping a diagnosis result autofills diagnosis and code", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Lägg till underlag", exact: true })).toBeEnabled();
    await page.getByRole("combobox", { name: "Sök diagnos eller ICD-10-SE-kod" }).fill("M54.5");
    await page.getByRole("option", { name: "M54.5 Lumbago", exact: true }).tap();
    await expect(page.getByLabel("Diagnos", { exact: true })).toHaveValue("Lumbago");
    await expect(page.getByLabel("Diagnoskod", { exact: true })).toHaveValue("M54.5");
    await expect(page.getByRole("listbox", { name: "Diagnoskoder" })).toHaveCount(0);
  });
  test("tapping text opens its sources without adding citation rows", async ({ page }) => {
    await page.goto("/"); await selectCase(page, "D3");
    await page.getByRole("button", { name: "Skapa intygsutkast", exact: true }).click();
    const text = page.getByLabel("Påstående 1 · Funktionsnedsättning", { exact: true });
    await text.tap();
    const preview = page.getByRole("dialog", { name: "för påstående 1 i Funktionsnedsättning", exact: true });
    await expect(preview).toContainText("Jag har inte tappat känseln.");
    await expect(page.locator(".source-chip")).toHaveCount(0);
    await preview.getByRole("button", { name: /Visa källa/ }).tap();
    await expect(page).toHaveURL(/\/underlag$/);
    await expect(page.locator(".selected-source")).toContainText("Jag har inte tappat känseln.");
  });
});
