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
import { liveReviewContentSchema } from "../../lib/server/prompts";
import { validateEvidenceReferences } from "../../lib/evidence";
import { resolveTextSpan } from "../../lib/text-annotations";
import { FK_GUIDANCE_VERSION, FK_RULE_IDS } from "../../lib/fk-guidance";

it.skipIf(!process.env.ANTHROPIC_API_KEY?.trim())("one live review of a prepared corrupted D1 draft", async () => {
  const config = getServerConfig({ ...process.env, AI_MODE: "live" });
  if (config.mode !== "live") throw new Error("Live configuration unavailable.");
  const snapshot = createSourceSnapshot("D1", developmentCases[0].input);
  const { draft } = validateDraftOutput(snapshot, await new MockProvider().draft(snapshot));
  draft.sections[0].claims = draft.sections[0].claims.filter(({ id }) => id !== "d1-lifting");
  const before = JSON.stringify(draft);
  const base = { date: new Date().toISOString(), caseId: "D1", mode: "live", configuredModel: config.model,
    promptVersion: REVIEW_PROMPT_VERSION, guidanceVersion: FK_GUIDANCE_VERSION, reviewEffort: "medium", modelCalls: 1, liveDraftCalls: 0, retries: 0,
    clinicalReview: "NOT RUN", heldOutEvaluation: "NOT RUN" };
  let report: Record<string, unknown>;
  const diagnostics: Record<string, unknown>[] = [];
  const diagnosticFetch: typeof fetch = async (url, init) => {
    const response = await fetch(url, init);
    if (response.ok) {
      const body = await response.clone().json();
      const text = (body.content ?? []).filter((part: { type: string }) => part.type === "text").map((part: { text: string }) => part.text).join("");
      let outputShape: unknown = null, alignment: unknown = null;
      try {
        const parsed = liveReviewContentSchema.safeParse(JSON.parse(text));
        outputShape = parsed.success ? "valid" : parsed.error.issues.map((issue) => ({ code: issue.code, path: issue.path }));
        if (parsed.success) alignment = parsed.data.findings.flatMap((finding, findingIndex) => {
          const claim = draft.sections.flatMap((section) => section.claims).find((item) => item.id === finding.targetClaimId);
          const sourceIssues = validateEvidenceReferences([...finding.evidenceRefs, ...(finding.proposedChange?.evidenceRefs ?? [])], snapshot).issues;
          const target = finding.targetClaimId === null ? finding.targetSpan === null : claim && finding.targetSpan && resolveTextSpan(claim.text, finding.targetSpan);
          return !sourceIssues.length && target ? [] : [{ findingIndex, sourceIssues, validTarget: Boolean(target) }];
        });
      } catch { outputShape = text ? "invalid_json" : "no_text"; }
      diagnostics.push({ stopReason: body.stop_reason, textCharacters: text.length, inputTokens: body.usage?.input_tokens, outputTokens: body.usage?.output_tokens, outputShape, alignment });
    }
    return response;
  };
  try {
    const result = await new LiveProvider(config, { maxRetries: 0, fetch: diagnosticFetch }).review({ snapshot, draft });
    expect(JSON.stringify(draft)).toBe(before);
    expect(result.guidelineChecks).toHaveLength(FK_RULE_IDS.length);
    expect(result.findings.some(({ fieldId, actionType }) => fieldId === "3" && actionType === "available_but_missing")).toBe(true);
    report = { ...base, status: "PASSED", metadata: result.metadata, findingCount: result.findings.length, diagnostics,
      guidelineChecks: result.guidelineChecks,
      linkedGuidelineFindings: result.findings.filter((finding) => finding.guidelineRuleIds?.length).length,
      phraseTargets: result.findings.filter((finding) => finding.targetSpan).length,
      categories: result.findings.map(({ category }) => category),
      expectedWorkOmissionDetected: result.findings.some(({ fieldId, actionType }) => fieldId === "3" && actionType === "available_but_missing"),
      note: "Contract/reference smoke; expected omission is a developer-authored probe, not clinical validation. No raw sources, model prose or credentials retained." };
  } catch (error) {
    report = { ...base, status: "FAILED", code: error instanceof ApplicationError ? error.code : "SMOKE_FAILED", usage: null, diagnostics };
  }
  await mkdir(".local", { recursive: true });
  await writeFile(".local/review-smoke-result.json", JSON.stringify(report, null, 2) + "\n");
  expect(report.status, "See sanitized .local/review-smoke-result.json").toBe("PASSED");
});
