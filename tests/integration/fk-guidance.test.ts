import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { developmentCases } from "../../fixtures/development/cases";
import { FK_GUIDANCE_VERSION, FK_RULE_IDS } from "../../lib/fk-guidance";
import { createReviewHandler } from "../../lib/server/review-service";
import { createSourceSnapshot } from "../../lib/server/source-snapshot";
import { MockProvider } from "../../lib/server/mock-provider";
import { validateDraftOutput, validateReviewOutput } from "../../lib/server/provider-output";
import { draftUserData } from "../../lib/server/prompts";
import { reviewResultSchema, type Finding, type ProviderReviewOutput } from "../../lib/schemas";

async function input() {
  const snapshot = createSourceSnapshot("D1", developmentCases[0].input);
  const { draft } = validateDraftOutput(snapshot, await new MockProvider().draft(snapshot));
  return { snapshot, draft };
}
function output(findings: Finding[] = []): ProviderReviewOutput {
  return { findings, guidelineChecks: FK_RULE_IDS.map((ruleId) => ({ ruleId,
    status: findings.some((finding) => finding.guidelineRuleIds?.includes(ruleId)) ? "not_assessable" : "no_issue_identified",
  })), metadata: { mode: "live", modelId: "test-transport", promptVersion: "test", guidanceVersion: FK_GUIDANCE_VERSION, latencyMs: 0, usage: null } };
}
const context = { requestId: "d3faee2b-b031-4c54-8bdc-d572a17d19b1", sourceRevision: 0, draftRevision: 1 };
function request(data: Awaited<ReturnType<typeof input>>) {
  return new Request("http://localhost/api/review", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...context, ...data, explicitDecision: data.draft.explicitDecision }),
  });
}

describe("FK guidance enforcement boundaries", () => {
  it("retains an independent empty-field warning even when the model checks every rule as clear", async () => {
    const data = await input();
    data.draft.sections[0].claims = [];
    const provider = new MockProvider();
    vi.spyOn(provider, "review").mockResolvedValue(output());
    const result = reviewResultSchema.parse(await (await createReviewHandler(() => provider)(request(data))).json());
    expect(result.completionStatus).toBe("complete");
    expect(result.findings).toContainEqual(expect.objectContaining({ fieldId: "3", actionType: "unclear", guidelineRuleIds: ["fk3-occupation"], proposedChange: null }));
    expect(result.guidelineChecks?.find(({ ruleId }) => ruleId === "fk3-occupation")?.status).toBe("needs_review");
  });

  it("exposes an unassessable DFA link as a concrete question without inventing patient evidence", async () => {
    const data = await input();
    const finding: Finding = { id: "dfa-question", category: "work_relationship", fieldId: "6", targetClaimId: null, targetSpan: null,
      actionType: "source_information_missing", priority: "clarification", guidelineRuleIds: ["fk-dfa"],
      explanation: "Sambandet mellan dokumenterad funktionsnedsättning och aktivitet behöver klargöras.",
      question: "Hur bedömer läkaren att funktionsnedsättningen påverkar den angivna aktiviteten?", evidenceRefs: [], proposedChange: null };
    const provider = new MockProvider();
    vi.spyOn(provider, "review").mockResolvedValue(output([finding]));
    const before = JSON.stringify(data.draft);
    const result = reviewResultSchema.parse(await (await createReviewHandler(() => provider)(request(data))).json());
    expect(result.completionStatus).toBe("complete");
    expect(result.findings[0]).toMatchObject({ guidelineRuleIds: ["fk-dfa"], evidenceRefs: [], proposedChange: null, question: finding.question });
    expect(result.guidelineChecks?.find(({ ruleId }) => ruleId === "fk-dfa")?.status).toBe("not_assessable");
    expect(JSON.stringify(data.draft)).toBe(before);
  });

  it.each(["missing", "stale"])("fails incomplete and retains code warnings for a %s guidance version", async (fault) => {
    const data = await input();
    data.draft.sections[0].claims = [];
    const raw = output();
    if (fault === "missing") delete raw.metadata.guidanceVersion;
    else raw.metadata.guidanceVersion = "stale-guidance";
    const provider = new MockProvider();
    vi.spyOn(provider, "review").mockResolvedValue(raw);
    const result = reviewResultSchema.parse(await (await createReviewHandler(() => provider)(request(data))).json());
    expect(result).toMatchObject({ completionStatus: "incomplete", metadata: null, error: { code: "INVALID_MODEL_OUTPUT" } });
    expect(result.guidelineChecks).toBeUndefined();
    expect(result.findings[0].guidelineRuleIds).toEqual(["fk3-occupation"]);
  });

  it("rejects an FK rule used as patient evidence even when its rule ID is valid", async () => {
    const data = await input();
    const prepared = await new MockProvider().review({ ...data, draft: { ...data.draft, sections: data.draft.sections.map((section) => ({ ...section, claims: section.fieldId === "3" ? [] : section.claims })) } });
    const raw = { ...prepared, findings: [prepared.findings[0]] };
    raw.findings[0].evidenceRefs = [{ sourceId: "fk3-occupation", exactQuote: "Beskriv den sysselsättning som arbetsförmågan bedöms mot." }];
    expect(() => validateReviewOutput(data.snapshot, data.draft, raw)).toThrow();
  });

  it("provides the clinician's existing diagnosis for DFA context while withholding leave decisions from drafting", async () => {
    const { snapshot } = await input();
    const data = JSON.parse(draftUserData(snapshot));
    expect(data.documentedDiagnosis).toEqual({ text: snapshot.input.explicitDecision.diagnosisText, code: snapshot.input.explicitDecision.diagnosisCode });
    expect(data.explicitDecision).toBeUndefined();
    expect(data.passages.some((passage: { origin: string }) => passage.origin === "clinician_decision")).toBe(false);
  });
});
