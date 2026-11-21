import { mkdir, writeFile } from "node:fs/promises";
import nextEnv from "@next/env";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { developmentCases } from "../../fixtures/development/cases";
import { getServerConfig } from "../../lib/server/config";
import { LiveProvider } from "../../lib/server/live-provider";
import { ApplicationError } from "../../lib/server/errors";
import { DRAFT_PROMPT_VERSION } from "../../lib/server/prompts";
import { createSourceSnapshot } from "../../lib/server/source-snapshot";
import { validateDraftOutput } from "../../lib/server/provider-output";

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
  try {
    const fixture = developmentCases[0];
    const snapshot = createSourceSnapshot(fixture.id, fixture.input);
    const output = await new LiveProvider(config, { maxRetries: 0 }).draft(snapshot);
    const validated = validateDraftOutput(snapshot, output);
    expect(validated.validationFindings).toEqual([]);
    expect(validated.draft.explicitDecision).toEqual(fixture.input.explicitDecision);
    await saveReport({ ...base, status: "PASSED", metadata: output.metadata,
      claims: output.sections.flatMap(({ claims }) => claims).length,
      references: output.sections.flatMap(({ claims }) => claims.flatMap(({ evidenceRefs }) => evidenceRefs)).length,
      decisionInvariant: "PASSED", note: "Contract/reference smoke only; semantic and clinical quality have not been validated." });
  } catch (error) {
    const code = error instanceof ApplicationError ? error.code : "SMOKE_FAILED";
    await saveReport({ ...base, status: "FAILED", code, latencyMs: Date.now() - started, usage: null,
      note: "Failure usage is unknown; null does not mean no billed tokens." });
    throw new Error(`Live smoke failed (${code}). See the sanitized local report.`);
  }
});
