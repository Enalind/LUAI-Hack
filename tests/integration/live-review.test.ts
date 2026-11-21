import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { developmentCases } from "../../fixtures/development/cases";
import { LiveProvider } from "../../lib/server/live-provider";
import { MockProvider } from "../../lib/server/mock-provider";
import { createSourceSnapshot } from "../../lib/server/source-snapshot";
import { validateDraftOutput } from "../../lib/server/provider-output";
import { REVIEW_PROMPT_VERSION } from "../../lib/server/prompts";
import { FK_GUIDANCE_VERSION, FK_RULE_IDS } from "../../lib/fk-guidance";
import type { Finding } from "../../lib/schemas";

const config = { mode: "live" as const, model: "claude-sonnet-5-5", apiKey: "test-only-secret" };
async function input() {
  const snapshot = createSourceSnapshot("D1", developmentCases[0].input);
  const { draft } = validateDraftOutput(snapshot, await new MockProvider().draft(snapshot));
  return { snapshot, draft };
}
function reviewContent(findings: Finding[] = []) {
  return { findings, guidelineChecks: FK_RULE_IDS.map((ruleId) => ({ ruleId,
    status: findings.some((finding) => finding.guidelineRuleIds?.includes(ruleId)) ? "needs_review" as const : "no_issue_identified" as const,
  })) };
}
function response(value: unknown, reason = "end_turn") {
  return Response.json({ id: "msg_review", type: "message", role: "assistant", model: config.model,
    content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value) }], stop_reason: reason, stop_sequence: null,
    usage: { input_tokens: 100, output_tokens: 20 },
  });
}
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("live review transport", () => {
  it("accepts a complete empty review with separate prompt/model metadata", async () => {
    const data = await input();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => response(reviewContent()));
    const result = await new LiveProvider(config, { fetch: fetcher }).review(data);
    expect(result).toMatchObject({ findings: [], metadata: { mode: "live", modelId: config.model, promptVersion: REVIEW_PROMPT_VERSION, guidanceVersion: FK_GUIDANCE_VERSION, usage: { inputTokens: 100, outputTokens: 20, totalTokens: 120 } } });
    const sent = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
    expect(sent.tools ?? []).toEqual([]);
    expect(sent.output_config?.effort).toBe("medium"); // Review retains a larger reasoning budget than drafting.
    expect(sent.messages).toHaveLength(1);
    expect(JSON.stringify(sent)).toContain(data.draft.sections[0].claims[0].id);
    expect(JSON.stringify(sent)).not.toContain(config.apiKey);
    for (const id of FK_RULE_IDS) expect(JSON.stringify(sent.system)).toContain(`[${id}]`);
    expect(result.guidelineChecks).toHaveLength(FK_RULE_IDS.length);
  });

  it("validates a source-linked proposal using actual SDK structured parsing", async () => {
    const data = await input();
    data.draft.sections[0].claims.shift();
    const prepared = await new MockProvider().review(data);
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => response(reviewContent(prepared.findings)));
    const result = await new LiveProvider(config, { fetch: fetcher }).review(data);
    expect(result.findings[0]).toMatchObject({ category: "work_tasks", proposedChange: { operation: "add" } });
  });

  it.each(["missing", "unknown-text", "occurrence"])('rejects a %s review target span', async (fault) => {
    const data = await input();
    data.draft.sections[0].claims[0].text = "Patienten arbetar med något annat.";
    const prepared = await new MockProvider().review(data);
    const finding = prepared.findings.find((item) => item.targetClaimId !== null)!;
    if (fault === "missing") delete finding.targetSpan;
    if (fault === "unknown-text") finding.targetSpan = { text: "Text som inte finns i utkastet", occurrence: 1 };
    if (fault === "occurrence") finding.targetSpan = { text: "Patienten", occurrence: 2 };
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => response(reviewContent(prepared.findings)));
    await expect(new LiveProvider(config, { fetch: fetcher }).review(data)).rejects.toMatchObject({ code: "INVALID_MODEL_OUTPUT" });
  });

  it.each(["unknown-target", "invalid-quote", "invalid-proposal"])("rejects %s model review output", async (fault) => {
    const data = await input();
    data.draft.sections[0].claims.shift();
    const prepared = await new MockProvider().review(data);
    const finding = prepared.findings[0];
    if (fault === "unknown-target") {
      finding.actionType = "unsupported_or_conflicting"; finding.targetClaimId = "unknown";
      finding.proposedChange = { operation: "delete", targetClaimId: "unknown", text: null, evidenceRefs: [] };
    } else if (fault === "invalid-quote") finding.evidenceRefs[0].exactQuote = "Okänt citat.";
    else finding.proposedChange!.evidenceRefs[0].sourceId = "foreign-source";
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => response(reviewContent(prepared.findings)));
    await expect(new LiveProvider(config, { fetch: fetcher }).review(data)).rejects.toMatchObject({ code: "INVALID_MODEL_OUTPUT" });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it.each(["missing-checks", "duplicate-rule", "unlinked-problem", "hidden-problem", "wrong-field", "unknown-rule", "missing-rule", "unanswerable-without-question"])("rejects inconsistent FK coverage: %s", async (fault) => {
    const data = await input();
    data.draft.sections[0].claims.shift();
    const prepared = await new MockProvider().review(data);
    const raw = reviewContent(prepared.findings);
    if (fault === "missing-checks") delete (raw as Partial<typeof raw>).guidelineChecks;
    if (fault === "duplicate-rule") raw.guidelineChecks[1].ruleId = raw.guidelineChecks[0].ruleId;
    if (fault === "unlinked-problem") raw.guidelineChecks[1].status = "needs_review";
    if (fault === "hidden-problem") raw.guidelineChecks[0].status = "no_issue_identified";
    if (fault === "wrong-field") raw.findings[0].guidelineRuleIds = ["fk7-treatment"];
    if (fault === "unknown-rule") (raw.findings[0].guidelineRuleIds as string[]) = ["invented-rule"];
    if (fault === "missing-rule") delete raw.findings[0].guidelineRuleIds;
    if (fault === "unanswerable-without-question") (raw.guidelineChecks[0] as { status: string }).status = "not_assessable";
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => response(raw));
    await expect(new LiveProvider(config, { fetch: fetcher }).review(data)).rejects.toMatchObject({ code: "INVALID_MODEL_OUTPUT" });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it.each(["refusal", "max_tokens"])("does not parse %s as an empty completed review", async (reason) => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => response({ findings: [] }, reason));
    await expect(new LiveProvider(config, { fetch: fetcher }).review(await input())).rejects.toMatchObject({ code: "GENERATION_FAILED" });
  });

  it.each(["no JSON", '{"findings":', '{"findings":{},"approved":true}'])("rejects invalid structured review output", async (text) => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => response(text));
    await expect(new LiveProvider(config, { fetch: fetcher }).review(await input())).rejects.toMatchObject({ code: "INVALID_MODEL_OUTPUT" });
  });

  it.each([429, 503])("uses no automatic retries on review HTTP %i", async (status) => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ type: "error", error: { type: "test_error", message: "test-only-secret RAW" } }, { status, headers: { "Retry-After": "0" } }));
    await expect(new LiveProvider(config, { fetch: fetcher, maxRetries: 1 }).review(await input())).rejects.toMatchObject({ code: status === 429 ? "PROVIDER_RATE_LIMITED" : "PROVIDER_UNAVAILABLE" });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("honors review timeouts and does not call a model for decision mismatches", async () => {
    const data = await input();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(() => new Promise<Response>(() => {}));
    vi.useFakeTimers();
    const checked = expect(new LiveProvider(config, { fetch: fetcher, timeoutMs: 50 }).review(data)).rejects.toMatchObject({ code: "REQUEST_TIMEOUT" });
    await vi.advanceTimersByTimeAsync(50); await checked;
    fetcher.mockClear();
    data.draft.explicitDecision.leaveExtent = 100;
    await expect(new LiveProvider(config, { fetch: fetcher }).review(data)).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
