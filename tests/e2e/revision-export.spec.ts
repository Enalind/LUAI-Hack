import { openPanel, selectCase, showClaimSources } from "./workflow-helpers";
import { expect, test, type Page } from "@playwright/test";


async function draft(page: Page, id = "D1") {
  await page.goto("/");
  await selectCase(page, id);
  await page.getByRole("button", { name: "Skapa intygsutkast", exact: true }).click();
  await expect(page.getByRole("status", { name: "Utkaststatus" })).toContainText("Utkast skapat");
}
async function review(page: Page) {
  await openPanel(page, "Granskning");
  await page.getByRole("button", { name: /^(Granska utkast|Granska på nytt|Försök granska igen)$/ }).click();
  await expect(page.getByRole("status", { name: "Utkaststatus" })).toContainText("kontroll genomförd");
}
async function stubClipboard(page: Page, fail = false) {
  await page.addInitScript((fail) => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
      writeText: async (text: string) => { if (fail) throw new Error("Unavailable"); Reflect.set(window, "copiedText", text); },
    } });
  }, fail);
}
async function report(page: Page) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Ladda ner granskningsrapport" }).click();
  const stream = await (await pending).createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

for (const narrow of [false, true]) test(`accept addition → recheck → clean field copy (${narrow ? "narrow keyboard" : "desktop"})`, async ({ page }, testInfo) => {
  if (narrow) await page.setViewportSize({ width: 375, height: 812 });
  const keyErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error" && message.text().includes("same key")) keyErrors.push(message.text()); });
  await stubClipboard(page);
  await page.route("**/api/draft", async (route) => {
    const response = await route.fetch(); const body = await response.json();
    body.draft.sections[0].claims = body.draft.sections[0].claims.filter((claim: { id: string }) => claim.id !== "d1-lifting");
    await route.fulfill({ response, json: body });
  });
  await draft(page);
  await showClaimSources(page, "Påstående 1 · Sysselsättning");
  await page.getByRole("dialog").getByRole("button", { name: /Visa källa.*för påstående 1 i Sysselsättning/ }).first().click();
  await expect(page.locator(".selected-source")).toBeFocused();
  await review(page);
  const accept = page.getByRole("button", { name: "Acceptera förslag", exact: true });
  await accept.focus(); await accept.press("Enter");
  await expect(page.getByRole("status", { name: "Utkaststatus" })).toContainText("granskning inaktuell");
  await expect(accept).toBeDisabled();
  await expect(page.getByText("Accepterat för denna version", { exact: true })).toBeVisible();
  await review(page);
  await expect(page.locator(".finding-card")).toHaveCount(0);
  await openPanel(page, "Intygsutkast");
  const field = page.getByRole("region", { name: "Sysselsättning", exact: true });
  const texts = await field.getByRole("textbox").evaluateAll((nodes) => nodes.map((node) => (node as HTMLTextAreaElement).value));
  await page.getByRole("button", { name: "Kopiera fält 3", exact: true }).click();
  await expect(page.getByText("Fält 3 kopierat.", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => Reflect.get(window, "copiedText"))).toBe(texts.join("\n\n"));
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(keyErrors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("cp5-complete.png"), fullPage: true });
});

test("clinician supplement → source refresh preserves manual draft → accept and recheck", async ({ page }) => {
  let drafts = 0, sources = 0, reviews = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/draft")) drafts++;
    if (request.url().endsWith("/api/sources")) sources++;
    if (request.url().endsWith("/api/review")) reviews++;
  });
  await draft(page, "D2"); await review(page);
  await expect(page.getByRole("region", { name: "Läkarens beslut i källversionen" })).toContainText("Ej angiven");
  const manual = "Läkarens egen formulering om patientens nackvärk.";
  await page.getByLabel("Påstående 1 · Funktionsnedsättning").fill(manual);
  await openPanel(page, "Underlag");
  await page.getByLabel("Läkarens komplettering", { exact: true }).fill("Patienten arbetar med bokföring vid dator.");
  await page.getByRole("button", { name: "Lägg till i underlaget", exact: true }).click();
  await review(page);
  expect(drafts).toBe(1); expect(sources).toBe(1); expect(reviews).toBe(2);
  await expect(page.getByLabel("Påstående 1 · Funktionsnedsättning")).toHaveValue(manual);
  const finding = page.getByRole("article", { name: "Fynd: Arbetsuppgifter och krav", exact: true });
  await expect(finding).toContainText("Finns i källan men saknas i utkastet");
  await finding.getByRole("button", { name: "Acceptera förslag" }).click();
  await expect(page.getByLabel("Påstående 1 · Sysselsättning")).toHaveValue("Läkarens komplettering: Patienten arbetar med bokföring vid dator.");
  await review(page);
  await expect(page.getByRole("article", { name: "Fynd: Arbetsuppgifter och krav", exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Påstående 1 · Funktionsnedsättning")).toHaveValue(manual);
  const data = await report(page);
  expect(data.explicitDecision).toEqual({ diagnosisText: "Cervikalgi", diagnosisCode: "M54.2", leaveExtent: null, startDate: null, endDate: null });
  expect(data.dispositions[0].status).toBe("accepted");
  expect(data.sourceSnapshots).toHaveLength(2);
});

test("dismissal retains the problem text and copy still needs confirmation", async ({ page }) => {
  await stubClipboard(page); await draft(page);
  const text = "Läkarens aktuella egna formulering.";
  await page.getByLabel("Påstående 1 · Sysselsättning").fill(text); await review(page);
  await page.getByLabel("Egen anteckning (valfritt)").fill("Behåller formuleringen efter genomgång.");
  await page.getByRole("button", { name: "Avfärda fynd", exact: true }).click();
  await expect(page.getByText(/Avfärdat för denna version – innebär inte verifiering/)).toBeVisible();
  await expect(page.getByLabel("Påstående 1 · Sysselsättning")).toHaveValue(text);
  await expect(page.locator(".claim-status").first()).toContainText("berörs av ett granskningsfynd");
  await page.getByRole("button", { name: "Kopiera fält 3", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Bekräfta kopiering av fält 3" });
  await expect(dialog).toContainText("Avfärdade fynd innebär inte verifiering");
  expect(await page.evaluate(() => Reflect.get(window, "copiedText"))).toBeUndefined();
  await dialog.getByRole("button", { name: "Kopiera ändå", exact: true }).click();
  expect(await page.evaluate(() => Reflect.get(window, "copiedText"))).toContain(text);
  const data = await report(page);
  expect(data.dispositions[0]).toMatchObject({ status: "dismissed", clinicianNote: "Behåller formuleringen efter genomgång." });
  expect(data.reviewHistory[0].metadata.mode).toBe("mock");
  expect(JSON.stringify(data)).not.toContain('"exactQuote"');
  await page.getByLabel("Inkludera fiktivt källunderlag och källcitat i rapporten").check();
  const withSources = await report(page);
  expect(withSources.includesSourceText).toBe(true);
  expect(withSources.currentSourceInput.consultationText).toBeTruthy();
  expect(withSources.draft.sections[0].claims[0].evidenceRefs[0].exactQuote).toBeTruthy();
});

test("stale copy confirmation is invalidated by edits and clipboard failure offers current selectable text", async ({ page }) => {
  await stubClipboard(page, true); await draft(page);
  await page.getByRole("button", { name: "Kopiera fält 3", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("aktuell version");
  await page.getByLabel("Påstående 1 · Sysselsättning").fill("Senaste manuella texten.");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Kopiera fält 3", exact: true }).click();
  await page.getByRole("button", { name: "Kopiera ändå", exact: true }).click();
  const fallback = page.getByRole("textbox", { name: "Text att kopiera från fält 3", exact: true });
  await expect(fallback).toHaveValue(/Senaste manuella texten/);
  await fallback.focus();
  expect(await fallback.evaluate((node: HTMLTextAreaElement) => node.selectionEnd - node.selectionStart)).toBe((await fallback.inputValue()).length);
});

test("an incomplete review requires explicit copy confirmation and exports current edited text", async ({ page }) => {
  await stubClipboard(page); await draft(page);
  await page.getByLabel("Påstående 1 · Sysselsättning").fill("Aktuell egen text.");
  await page.route("**/api/review", async (route) => {
    const { requestId, sourceRevision, draftRevision } = route.request().postDataJSON();
    await route.fulfill({ json: { requestId, sourceRevision, draftRevision, completionStatus: "incomplete", metadata: null, findings: [],
      error: { requestId, code: "REQUEST_TIMEOUT", message: "Tidsgräns.", retryable: true } } });
  });
  await openPanel(page, "Granskning");
  await page.getByRole("button", { name: "Granska utkast", exact: true }).click();
  await expect(page.getByRole("alert", { name: "Granskningsfel" })).toBeVisible();
  await page.getByRole("button", { name: "Kopiera fält 3", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Granskningen är inte slutförd");
  await page.getByRole("button", { name: "Kopiera ändå", exact: true }).click();
  expect(await page.evaluate(() => Reflect.get(window, "copiedText"))).toContain("Aktuell egen text.");
  const data = await report(page);
  expect(data.reviewStatus).toBe("incomplete");
  expect(data.fields["3"]).toContain("Aktuell egen text.");
});

test("a late uncancellable source refresh cannot start review after a manual edit", async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.fetch;
    window.fetch = (input, init) => original(input, input === "/api/sources" ? { ...init, signal: undefined } : init);
  });
  let release!: () => void, began!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const started = new Promise<void>((resolve) => { began = resolve; });
  let reviews = 0;
  page.on("request", (request) => { if (request.url().endsWith("/api/review")) reviews++; });
  await page.route("**/api/sources", async (route) => { const response = await route.fetch(); began(); await gate; await route.fulfill({ response }); });
  await draft(page, "D2");
  await openPanel(page, "Underlag");
  await page.getByLabel("Läkarens komplettering", { exact: true }).fill("Arbetar vid dator.");
  await page.getByRole("button", { name: "Lägg till i underlaget", exact: true }).click();
  await openPanel(page, "Granskning");
  await page.getByRole("button", { name: "Granska utkast", exact: true }).click(); await started;
  await page.getByLabel("Påstående 1 · Funktionsnedsättning").fill("Nyare manuell text.");
  const arrived = page.waitForResponse((response) => response.url().endsWith("/api/sources"));
  release(); await (await arrived).finished();
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  expect(reviews).toBe(0);
  await expect(page.getByLabel("Påstående 1 · Funktionsnedsättning")).toHaveValue("Nyare manuell text.");
  await expect(page.getByRole("status", { name: "Utkaststatus" })).toContainText("ej granskat");
});
