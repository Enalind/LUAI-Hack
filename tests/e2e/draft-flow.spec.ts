import { openPanel, selectCase, showClaimSources } from "./workflow-helpers";
import { expect, test, type Page } from "@playwright/test";
import D1 from "../../fixtures/development/D1.json" with { type: "json" };
import D2 from "../../fixtures/development/D2.json" with { type: "json" };

async function loadAndGenerate(page: Page, id = "D1") {
  await page.goto("/");
  await selectCase(page, id);
  await page.getByRole("button", { name: "Skapa intygsutkast", exact: true }).click();
  await expect(page.getByRole("status", { name: "Utkaststatus" })).toContainText("Utkast skapat · ej granskat");
}

test("every hover reference in the longer examples opens its exact snapshot passage", async ({ page }) => {
  for (const id of ["D1", "D2", "D3"]) {
    const completed = page.waitForResponse((response) => response.url().endsWith("/api/draft") && response.request().method() === "POST");
    await loadAndGenerate(page, id);
    const result = await (await completed).json();
    const fields = { "3": "Sysselsättning", "5": "Funktionsnedsättning", "6": "Aktivitetsbegränsning", "7": "Medicinsk behandling" };
    await expect(page.locator(".source-chip")).toHaveCount(0);
    for (const section of result.draft.sections) for (const [index, claim] of section.claims.entries()) {
      const label = `Påstående ${index + 1} · ${fields[section.fieldId as keyof typeof fields]}`;
      for (const [refIndex, ref] of claim.evidenceRefs.entries()) {
        await showClaimSources(page, label);
        await page.getByRole("dialog").getByRole("button", { name: /Visa källa/ }).nth(refIndex).click();
        const passage = page.locator(`[id="${ref.sourceId}"]`);
        await expect(passage).toBeFocused();
        await expect(passage).toHaveClass(/selected-source/);
        await expect(passage.locator("p")).toContainText(ref.exactQuote);
        await openPanel(page, "Intygsutkast");
      }
    }
  }
});

test("warehouse draft has separate decisions, editable claims and source navigation", async ({ page }, testInfo) => {
  await loadAndGenerate(page);
  await expect(page.getByLabel("Påstående 2 · Sysselsättning")).toHaveValue(/10–15 kg/);
  const decisions = page.getByRole("region", { name: "Läkarens beslut i källversionen" });
  await expect(decisions).toContainText("Ländryggssmärta, preliminär bedömning");
  await expect(decisions).toContainText("50 %");
  await expect(decisions).toContainText("2026-12-05");
  await expect(page.getByLabel("Påstående 1 · Aktivitetsbegränsning")).toHaveValue(/^Läkaren bedömer/);
  await showClaimSources(page, "Påstående 2 · Sysselsättning");
  await page.getByRole("dialog").getByRole("button", { name: /Visa källa.*för påstående 2 i Sysselsättning/ }).first().click();
  const source = page.locator(".selected-source");
  await expect(source).toBeVisible();
  await expect(source).toBeFocused();
  await expect(source).toContainText("Jag lyfter lådor på 10–15 kg");
  await expect(source).toContainText("Vald källa");
  await page.screenshot({ path: testInfo.outputPath("desktop-evidence.png"), fullPage: true });
  await openPanel(page, "Intygsutkast");
  await page.getByLabel("Påstående 2 · Sysselsättning").fill("Patienten beskriver ändrade arbetsuppgifter.");
  await expect(page.locator(".stale-claim")).toHaveCount(1);
  await showClaimSources(page, "Påstående 2 · Sysselsättning");
  await expect(page.getByRole("dialog")).toContainText("Tidigare källstöd");
  await expect(page.getByRole("dialog").getByRole("button", { name: /Visa tidigare källa/ }).first()).toBeVisible();
});

test("missing work and assessment information stays missing with explicit questions", async ({ page }) => {
  await loadAndGenerate(page, "D2");
  const work = page.getByRole("region", { name: "Sysselsättning", exact: true });
  await expect(work.getByRole("textbox")).toHaveCount(0);
  await expect(work).toContainText("Underlag saknas");
  await expect(work).toContainText("Vilket yrke och vilka konkreta arbetsuppgifter har patienten?");
  const limitations = page.getByRole("region", { name: "Aktivitetsbegränsning", exact: true });
  await expect(limitations.getByRole("textbox")).toHaveCount(0);
  await expect(limitations).toContainText("Vilka begränsningar bedömer läkaren");
  const decisions = page.getByRole("region", { name: "Läkarens beslut i källversionen" });
  await expect(decisions.getByText("Ej angiven", { exact: true })).toHaveCount(1);
  await expect(decisions.getByText("Ej angivet", { exact: true })).toHaveCount(2);
  await expect(page.getByLabel("Påstående 1 · Funktionsnedsättning")).toHaveValue(/^Patienten uppger nackvärk/);
});

test("denial is preserved and an unanswered question is not an examination finding", async ({ page }) => {
  await loadAndGenerate(page, "D3");
  await expect(page.getByLabel("Påstående 1 · Funktionsnedsättning")).toHaveValue("Patienten uppger att hen inte har tappat känseln.");
  const impairment = page.getByRole("region", { name: "Funktionsnedsättning", exact: true });
  await expect(impairment.getByRole("textbox")).toHaveCount(2);
  await expect(impairment).toContainText("Vad svarade patienten på frågan om svaghet");
});

test("clinician-entered wording and partial leave decisions are passed through unchanged", async ({ page }) => {
  await page.goto("/");
  await selectCase(page, "D1");
  const diagnosis = "  Möjligen ländryggssmärta?\nEj säker.  ";
  await page.getByLabel("Diagnos", { exact: true }).fill(diagnosis);
  await page.getByLabel("Sjukskrivningsgrad", { exact: true }).selectOption("75");
  await page.getByLabel("Från och med", { exact: true }).fill("");
  const returned = page.waitForResponse((response) => response.url().endsWith("/api/draft"));
  await page.getByRole("button", { name: "Skapa intygsutkast", exact: true }).click();
  const body = await (await returned).json();
  expect(body.draft.explicitDecision).toEqual({ diagnosisText: diagnosis, diagnosisCode: "M54.5", leaveExtent: 75, startDate: null, endDate: "2026-12-05" });
  const decisions = page.getByRole("region", { name: "Läkarens beslut i källversionen" });
  await expect(decisions).toContainText("75 %");
  await expect(decisions).toContainText("Ej säker.");
  await expect(decisions).toContainText("Ej angivet");
});

test("switching cases clears all prior generated text and manual edits", async ({ page }) => {
  await loadAndGenerate(page);
  await page.getByLabel("Påstående 1 · Sysselsättning").fill("Egen formulering som hör till lagerfallet.");
  await selectCase(page, "D2");
  await expect(page.getByRole("status", { name: "Utkaststatus" })).toContainText("Inget utkast skapat");
  await expect(page.locator(".claim-card")).toHaveCount(0);
  await expect(page.locator(".source-passage")).toHaveCount(0);
  await expect(page.getByLabel("Diagnos", { exact: true })).toHaveValue("Cervikalgi");
  await expect(page.getByLabel("Besöksunderlag", { exact: true })).toHaveValue(D2.consultationText);
  await page.getByRole("button", { name: "Skapa intygsutkast", exact: true }).click();
  await expect(page.getByLabel("Påstående 1 · Funktionsnedsättning")).toHaveValue(/^Patienten uppger nackvärk/);
  await expect(page.getByLabel("Påstående 1 · Sysselsättning")).toHaveCount(0);
});

test("loading and safe failure retain inputs, and retry works", async ({ page }) => {
  let release!: () => void;
  const wait = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/draft", async (route) => {
    await wait;
    await route.fulfill({ status: 503, json: { code: "PROVIDER_UNAVAILABLE", requestId: route.request().postDataJSON().requestId, message: "Tjänsten är tillfälligt otillgänglig.", retryable: true } });
  });
  await page.goto("/");
  await selectCase(page, "D1");
  await page.getByRole("button", { name: "Skapa intygsutkast", exact: true }).click();
  await expect(page.getByRole("status", { name: "Utkaststatus" })).toContainText("Skapar utkast…");
  await openPanel(page, "Underlag");
  await expect(page.getByRole("button", { name: "Skapar utkast…", exact: true })).toBeDisabled();
  release();
  await expect(page.getByRole("alert", { name: "Utkastfel" })).toContainText("Tjänsten är tillfälligt otillgänglig.");
  await expect(page.getByLabel("Besöksunderlag", { exact: true })).toHaveValue(D1.consultationText);
  await page.unroute("**/api/draft");
  await page.getByRole("button", { name: "Skapa intygsutkast", exact: true }).click();
  await expect(page.getByLabel("Påstående 1 · Sysselsättning")).toHaveValue(/lager/);
  await expect(page.getByRole("alert", { name: "Utkastfel" })).toHaveCount(0);
});

test("regeneration failure retains user-edited claims and changed sources", async ({ page }) => {
  await loadAndGenerate(page);
  await page.getByLabel("Påstående 1 · Sysselsättning").fill("Min aktuella intygstext.");
  await openPanel(page, "Underlag");
  await page.getByLabel("Läkarens bedömning", { exact: true }).fill("Läkaren har lagt till nya uppgifter.");
  await expect(page.getByRole("note")).toContainText("Underlaget har ändrats");
  await openPanel(page, "Underlag");
  await page.getByRole("button", { name: "Ersätt med nytt utkast", exact: true }).click();
  await expect(page.getByRole("alert", { name: "Utkastfel" })).toContainText("Mock-läget saknar ett förberett svar");
  await expect(page.getByLabel("Påstående 1 · Sysselsättning")).toHaveValue("Min aktuella intygstext.");
  await openPanel(page, "Underlag");
  await expect(page.getByLabel("Läkarens bedömning", { exact: true })).toHaveValue("Läkaren har lagt till nya uppgifter.");
});

test("empty input fails visibly before any draft request", async ({ page }) => {
  let calls = 0;
  page.on("request", (request) => { if (request.url().endsWith("/api/draft")) calls += 1; });
  await page.goto("/");
  await page.getByRole("button", { name: "Skapa intygsutkast", exact: true }).click();
  await expect(page.getByRole("alert", { name: "Utkastfel" })).toContainText("Ange besöksunderlag eller läkarens bedömning");
  expect(calls).toBe(0);
});

test("narrow tabs and keyboard navigation support drafting and evidence inspection", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await loadAndGenerate(page);
  await expect(page.getByRole("link", { name: "Intygsutkast", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.locator("#panel-source")).toBeHidden();
  await showClaimSources(page, "Påstående 2 · Sysselsättning");
  await page.getByRole("dialog").getByRole("button", { name: /Visa källa.*för påstående 2 i Sysselsättning/ }).first().click();
  await expect(page.getByRole("link", { name: "Underlag", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".selected-source")).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("narrow-evidence.png"), fullPage: true });
  await page.getByRole("link", { name: "Underlag", exact: true }).focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("link", { name: "Intygsutkast", exact: true })).toBeFocused();
  await expect(page.getByLabel("Påstående 2 · Sysselsättning")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
