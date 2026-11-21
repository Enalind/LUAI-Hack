import { mkdir, writeFile } from "node:fs/promises";
import nextEnv from "@next/env";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { developmentCases } from "../../fixtures/development/cases";
import { getServerConfig } from "../../lib/server/config";
import { LiveProvider } from "../../lib/server/live-provider";
import { ApplicationError } from "../../lib/server/errors";
import { DRAFT_PROMPT_VERSION } from "../../lib/server/prompts";
import { liveDraftContentSchema, assembleDraftContent } from "../../lib/server/draft-content";
import { createSourceSnapshot } from "../../lib/server/source-snapshot";
import { validateDraftOutput } from "../../lib/server/provider-output";
import { validateEvidenceReferences } from "../../lib/evidence";
import { resolveTextSpan, validEvidenceSpans } from "../../lib/text-annotations";

nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const hasKey = Boolean(process.env.ANTHROPIC_API_KEY?.trim());

async function saveReport(report: Record<string, unknown>) {
  await mkdir(".local", { recursive: true });
  await writeFile(".local/live-smoke-result.json", JSON.stringify(report, null, 2) + "\n");
  console.info("Sanitized smoke report: .local/live-smoke-result.json (no source text, model prose or credentials).");
}

it.skipIf(!hasKey)("live draft smoke with fictional development case D1", async () => {
  // The command itself opts into a live call, independently of the app's mock default.
  const config = getServerConfig({ ...process.env, AI_MODE: "live" });
  if (config.mode !== "live") throw new Error("Live smoke configuration unavailable.");
  const started = Date.now();
  const base = { date: new Date().toISOString(), caseId: "D1", mode: "live", configuredModel: config.model,
    promptVersion: DRAFT_PROMPT_VERSION, clinicalReview: "NOT RUN", heldOutEvaluation: "NOT RUN" };
  const diagnostics: Record<string, unknown>[] = [];
  const snapshot = createSourceSnapshot("D1", developmentCases[0].input);
  const diagnosticFetch: typeof fetch = async (url, init) => {
    const response = await fetch(url, init);
    if (response.ok) {
      const body = await response.clone().json();
      const text = (body.content ?? []).filter((part: { type: string }) => part.type === "text").map((part: { text: string }) => part.text).join("");
      let outputShape: unknown = null;
      let alignment: unknown = null;
      try {
        const parsed = liveDraftContentSchema.safeParse(JSON.parse(text));
        outputShape = parsed.success ? "valid" : parsed.error.issues.map((issue) => ({ code: issue.code, path: issue.path }));
        if (parsed.success) alignment = assembleDraftContent(parsed.data).sections.flatMap((section, fieldIndex) => section.claims.flatMap((claim, claimIndex) => {
          const issues = validateEvidenceReferences(claim.evidenceRefs, snapshot).issues;
          const spans = validEvidenceSpans(claim.text, claim.evidenceRefs.length, claim.evidenceSpans);
          return !issues.length && spans ? [] : [{ fieldIndex, claimIndex, sourceIssues: issues,
            spanIssues: claim.evidenceSpans.flatMap((span, spanIndex) => !resolveTextSpan(claim.text, span) ? [{ spanIndex, code: "TEXT_OR_OCCURRENCE" }] : span.referenceIndices.some((i) => i >= claim.evidenceRefs.length) ? [{ spanIndex, code: "REFERENCE_INDEX" }] : []),
            referenceCount: claim.evidenceRefs.length, anchoredReferenceCount: new Set(claim.evidenceSpans.flatMap((span) => span.referenceIndices)).size,
          }];
        }));
      } catch { outputShape = text ? "invalid_json" : "no_text"; }
      diagnostics.push({ stopReason: body.stop_reason, contentTypes: (body.content ?? []).map((part: { type: string }) => part.type),
        textCharacters: text.length, inputTokens: body.usage?.input_tokens, outputTokens: body.usage?.output_tokens, outputShape, alignment });
    }
    return response;
  };
  try {
    const fixture = developmentCases[0];
    const output = await new LiveProvider(config, { maxRetries: 0, fetch: diagnosticFetch }).draft(snapshot);
    const validated = validateDraftOutput(snapshot, output);
    expect(validated.validationFindings).toEqual([]);
    expect(validated.draft.explicitDecision).toEqual(fixture.input.explicitDecision);
    await saveReport({ ...base, status: "PASSED", metadata: output.metadata, diagnostics,
      claims: output.sections.flatMap(({ claims }) => claims).length,
      references: output.sections.flatMap(({ claims }) => claims.flatMap(({ evidenceRefs }) => evidenceRefs)).length,
      phraseSpans: output.sections.flatMap(({ claims }) => claims.flatMap((claim) => claim.evidenceSpans ?? [])).length,
      decisionInvariant: "PASSED", note: "Contract/reference smoke only; semantic and clinical quality have not been validated." });
  } catch (error) {
    const code = error instanceof ApplicationError ? error.code : "SMOKE_FAILED";
    await saveReport({ ...base, status: "FAILED", code, latencyMs: Date.now() - started, usage: null, diagnostics,
      note: "Failure usage is unknown; null does not mean no billed tokens." });
    throw new Error(`Live smoke failed (${code}). See the sanitized local report.`);
  }
});
