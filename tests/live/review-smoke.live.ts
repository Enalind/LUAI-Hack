import { mkdir, writeFile } from "node:fs/promises";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { developmentCases } from "../../fixtures/development/cases";
import { getServerConfig } from "../../lib/server/config";
import { LiveProvider } from "../../lib/server/live-provider";
import { MockProvider } from "../../lib/server/mock-provider";
import { ApplicationError } from "../../lib/server/errors";
import { REVIEW_PROMPT_VERSION } from "../../lib/server/prompts";
import { createSourceSnapshot } from "../../lib/server/source-snapshot";
import { validateDraftOutput } from "../../lib/server/provider-output";

it.skipIf(!process.env.ANTHROPIC_API_KEY?.trim())("one live review of a prepared corrupted D1 draft", async () => {
  const config = getServerConfig({ ...process.env, AI_MODE: "live" });
  if (config.mode !== "live") throw new Error("Live configuration unavailable.");
  const snapshot = createSourceSnapshot("D1", developmentCases[0].input);
  const { draft } = validateDraftOutput(snapshot, await new MockProvider().draft(snapshot));
  draft.sections[0].claims = draft.sections[0].claims.filter(({ id }) => id !== "d1-lifting");
  const before = JSON.stringify(draft);
  const base = { date: new Date().toISOString(), caseId: "D1", mode: "live", configuredModel: config.model,
    promptVersion: REVIEW_PROMPT_VERSION, modelCalls: 1, liveDraftCalls: 0, retries: 0,
    clinicalReview: "NOT RUN", heldOutEvaluation: "NOT RUN" };
  let report: Record<string, unknown>;
  try {
    const result = await new LiveProvider(config, { maxRetries: 0 }).review({ snapshot, draft });
    expect(JSON.stringify(draft)).toBe(before);
    report = { ...base, status: "PASSED", metadata: result.metadata, findingCount: result.findings.length,
      categories: result.findings.map(({ category }) => category),
      expectedWorkOmissionDetected: result.findings.some(({ fieldId, actionType }) => fieldId === "3" && actionType === "available_but_missing"),
      note: "Contract/reference smoke; expected omission is a developer-authored probe, not clinical validation. No raw sources, model prose or credentials retained." };
  } catch (error) {
    report = { ...base, status: "FAILED", code: error instanceof ApplicationError ? error.code : "SMOKE_FAILED", usage: null };
  }
  await mkdir(".local", { recursive: true });
  await writeFile(".local/review-smoke-result.json", JSON.stringify(report, null, 2) + "\n");
  expect(report.status, "See sanitized .local/review-smoke-result.json").toBe("PASSED");
});
