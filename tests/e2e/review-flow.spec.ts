import { expect, test, type Page } from "@playwright/test";

async function draft(page: Page, id = "D1") {
  await page.goto("/");
  await page.getByLabel("Välj fiktivt exempel").selectOption(id);
  await page.getByRole("button", { name: "Skapa intygsutkast", exact: true }).click();
  await expect(page.getByRole("status", { name: "Utkaststatus" })).toContainText("Utkast skapat · ej granskat");
}
async function openReview(page: Page) {
  const tab = page.getByRole("tab", { name: "Granskning", exact: true });
  if (await tab.count()) await tab.click();
}
async function review(page: Page, name = "Granska utkast") {
  await openReview(page);
  await page.getByRole("button", { name, exact: true }).click();
  await expect(page.getByRole("status", { name: "Utkaststatus" })).toContainText("kontroll genomförd");
}

test("review is explicit and a completed empty review uses limited wording", async ({ page }) => {
  let calls = 0;
  page.on("request", (request) => { if (request.url().endsWith("/api/review")) calls += 1; });
  await draft(page);
  expect(calls).toBe(0);
  await review(page);
  expect(calls).toBe(1);
  await expect(page.getByText("Inga problem identifierades av kontrollen.", { exact: true })).toBeVisible();
  await expect(page.getByText("Godkänt av FK", { exact: true })).toHaveCount(0);
  await expect(page.locator(".finding-card")).toHaveCount(0);
  await expect(page.getByLabel("Påstående 1 · Sysselsättning")).toHaveValue(/Patienten uppger/);
});

test("genuine source gaps show focused questions without invented citations or decisions", async ({ page }) => {
  await draft(page, "D2");
  await review(page);
  const finding = page.getByRole("article", { name: "Fynd: Arbetsuppgifter och krav", exact: true });
  await expect(finding).toContainText("Information saknas i underlaget");
  await expect(finding).toContainText("Vilket yrke och vilka konkreta arbetsuppgifter");
  await expect(finding.getByRole("button", { name: /Visa källa/ })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Läkarens beslut vid skapandet" })).toContainText("Ej angiven");
  await finding.getByRole("button", { name: "Komplettera underlaget" }).click();
  await expect(page.getByLabel("Läkarens bedömning", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Läkarens bedömning", { exact: true })).toHaveValue("");
});

test("omitted source-supported work detail receives an inspectable addition without automatic edits", async ({ page }, testInfo) => {
  await page.route("**/api/draft", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.draft.sections[0].claims = body.draft.sections[0].claims.filter((claim: { id: string }) => claim.id !== "d1-lifting");
    await route.fulfill({ response, json: body });
  });
  await draft(page);
  await review(page);
  const finding = page.getByRole("article", { name: "Fynd: Arbetsuppgifter och krav", exact: true });
  await expect(finding).toContainText("Finns i källan men saknas i utkastet");
  await expect(finding).toContainText("Förslag: Lägg till");
  await expect(finding).toContainText("10–15 kg");
  await expect(page.getByRole("region", { name: "Sysselsättning", exact: true }).getByRole("textbox")).toHaveCount(1);
  await finding.getByRole("button", { name: "Visa källa 2 för granskningsfynd", exact: true }).click();
  await expect(page.getByRole("article", { name: "Källa 2: Besöksunderlag", exact: true })).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath("review-evidence-desktop.png"), fullPage: true });
});

test("a reversed denial has a replacement suggestion and target navigation", async ({ page }) => {
  await draft(page, "D3");
  const edited = "Patienten har tappat känseln.";
  await page.getByLabel("Påstående 1 · Funktionsnedsättning").fill(edited);
  await review(page);
  const finding = page.getByRole("article", { name: "Fynd: Källstöd och motsägelser", exact: true }).filter({ hasText: "Förslag: Ersätt påståendet" });
  await expect(finding).toContainText("inte har tappat känseln");
  await finding.getByRole("button", { name: "Gå till berört påstående" }).click();
  await expect(page.getByLabel("Påstående 1 · Funktionsnedsättning")).toBeFocused();
  await expect(page.getByLabel("Påstående 1 · Funktionsnedsättning")).toHaveValue(edited);
});

test("review failure retains editable text and retry is a separate explicit action", async ({ page }) => {
  await draft(page);
  await page.getByLabel("Påstående 1 · Sysselsättning").fill("Min manuella text.");
  let calls = 0;
  await page.route("**/api/review", async (route) => {
    calls += 1;
    const { requestId, sourceRevision, draftRevision } = route.request().postDataJSON();
    await route.fulfill({ json: { requestId, sourceRevision, draftRevision, findings: [], completionStatus: "incomplete", metadata: null,
      error: { requestId, code: "REQUEST_TIMEOUT", message: "Granskningen tog för lång tid.", retryable: true } } });
  });
  await page.getByRole("button", { name: "Granska utkast", exact: true }).click();
  await expect(page.getByRole("alert", { name: "Granskningsfel" })).toContainText("Granskningen är ofullständig");
  await expect(page.getByLabel("Påstående 1 · Sysselsättning")).toHaveValue("Min manuella text.");
  await expect(page.getByText("Inga problem identifierades av kontrollen.", { exact: true })).toHaveCount(0);
  expect(calls).toBe(1);
  await page.unroute("**/api/review");
  await review(page, "Försök granska igen");
  await expect(page.getByRole("alert", { name: "Granskningsfel" })).toHaveCount(0);
});

test("manual correction makes the old review stale and a recheck clears resolved findings", async ({ page }) => {
  await draft(page);
  const original = await page.getByLabel("Påstående 1 · Sysselsättning").inputValue();
  await page.getByLabel("Påstående 1 · Sysselsättning").fill("Felaktig arbetsuppgift.");
  await review(page);
  await expect(page.locator(".finding-card")).toHaveCount(1);
  await page.getByLabel("Påstående 1 · Sysselsättning").fill(original);
  await expect(page.getByText("Tidigare granskning är inaktuell efter ändringar. Kör en ny granskning.", { exact: true })).toBeVisible();
  await review(page, "Granska på nytt");
  await expect(page.locator(".finding-card")).toHaveCount(0);
  await expect(page.getByText("Inga problem identifierades av kontrollen.", { exact: true })).toBeVisible();
});

test("a replacement draft keeps the prior review visible as stale until rechecked", async ({ page }) => {
  await draft(page);
  await page.getByLabel("Påstående 1 · Sysselsättning").fill("Felaktig arbetsuppgift.");
  await review(page);
  await expect(page.locator(".finding-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Ersätt med nytt utkast", exact: true }).click();
  await expect(page.getByLabel("Påstående 1 · Sysselsättning")).toHaveValue(/Patienten uppger/);
  await expect(page.getByRole("status", { name: "Utkaststatus" })).toContainText("granskning inaktuell");
  await expect(page.locator(".finding-card")).toHaveCount(1);
  await review(page, "Granska på nytt");
  await expect(page.locator(".finding-card")).toHaveCount(0);
});

test("an older uncancellable review cannot replace a manual edit or appear current", async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.fetch;
    window.fetch = (input, init) => original(input, typeof input === "string" && input === "/api/review" ? { ...init, signal: undefined } : init);
  });
  let release!: () => void;
  let began!: () => void;
  const started = new Promise<void>((resolve) => { began = resolve; });
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/review", async (route) => {
    const response = await route.fetch(); began(); await gate; await route.fulfill({ response });
  });
  await draft(page);
  await page.getByRole("button", { name: "Granska utkast", exact: true }).click();
  await started;
  await expect(page.getByRole("status", { name: "Granskningsstatus" })).toContainText("Granskar utkast…");
  await page.getByLabel("Påstående 1 · Sysselsättning").fill("Nyare manuell text.");
  const arrived = page.waitForResponse((response) => response.url().endsWith("/api/review"));
  release(); await (await arrived).finished();
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(page.getByLabel("Påstående 1 · Sysselsättning")).toHaveValue("Nyare manuell text.");
  await expect(page.getByRole("status", { name: "Utkaststatus" })).toContainText("ej granskat");
  await expect(page.getByText("Inga problem identifierades av kontrollen.", { exact: true })).toHaveCount(0);
});

test("narrow review tabs allow questions and source completion navigation", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await draft(page, "D2");
  await review(page);
  await expect(page.getByRole("tabpanel", { name: "Granskning", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("review-narrow.png"), fullPage: true });
  const finding = page.getByRole("article", { name: "Fynd: Arbetsuppgifter och krav", exact: true });
  await finding.getByRole("button", { name: "Komplettera underlaget" }).click();
  await expect(page.getByRole("tab", { name: "Underlag", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Läkarens bedömning", { exact: true })).toBeFocused();
});
