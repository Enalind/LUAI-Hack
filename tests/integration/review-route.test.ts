import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { developmentCases } from "../../fixtures/development/cases";
import { developmentAnswerKeys } from "../../fixtures/development/answer-keys";
import { POST } from "../../app/api/review/route";
import { createReviewHandler } from "../../lib/server/review-service";
import { MockProvider } from "../../lib/server/mock-provider";
import { createSourceSnapshot } from "../../lib/server/source-snapshot";
import { validateDraftOutput } from "../../lib/server/provider-output";
import { apiErrorSchema, reviewResultSchema, type ReviewRequest } from "../../lib/schemas";
import { ApplicationError } from "../../lib/server/errors";

const context = { requestId: "d3faee2b-b031-4c54-8bdc-d572a17d19b1", sourceRevision: 0, draftRevision: 1 };
async function input(index = 0): Promise<ReviewRequest> {
  const fixture = developmentCases[index];
  const snapshot = createSourceSnapshot(fixture.id, fixture.input);
  const { draft } = validateDraftOutput(snapshot, await new MockProvider().draft(snapshot));
  return { ...context, snapshot: JSON.parse(JSON.stringify(snapshot)), draft, explicitDecision: draft.explicitDecision };
}
function request(body: unknown) {
  return new Request("http://localhost/api/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("POST /api/review", () => {
  it.each([0, 1, 2])("returns a revision-matched complete review for fictional case %i with no live calls", async (index) => {
    vi.stubEnv("AI_MODE", "mock"); vi.stubEnv("ANTHROPIC_API_KEY", "");
    const body = await input(index);
    const response = await POST(request(body));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const result = reviewResultSchema.parse(await response.json());
    expect(result).toMatchObject({ ...context, completionStatus: "complete", metadata: { mode: "mock" }, error: null });
    expect(body.draft.explicitDecision).toEqual(developmentCases[index].input.explicitDecision);
    if (index === 0) expect(result.findings).toEqual([]);
  });

  it("separates omitted work details from genuinely missing source information", async () => {
    const omitted = await input(0);
    omitted.draft.sections[0].claims = [];
    const handler = createReviewHandler(() => new MockProvider());
    const recoverable = reviewResultSchema.parse(await (await handler(request(omitted))).json());
    expect(recoverable.findings.filter(({ fieldId }) => fieldId === "3").every(({ actionType, proposedChange }) => actionType === "available_but_missing" && proposedChange?.operation === "add")).toBe(true);
    const absent = reviewResultSchema.parse(await (await handler(request(await input(1)))).json());
    for (const expected of developmentAnswerKeys.D2.expectedFindings) {
      const finding = absent.findings.find(({ category, actionType }) => category === expected.category && actionType === expected.actionType);
      expect(finding).toMatchObject({ proposedChange: null, evidenceRefs: [], question: expect.any(String) });
    }
  });

  it("flags reversed negation and a question used as an examination finding", async () => {
    const body = await input(2);
    body.draft.sections[1].claims[0].text = "Patienten har tappat känseln.";
    const passage = body.snapshot.passages[1];
    body.draft.sections[1].claims.push({ id: "question-as-finding", fieldId: "5", text: "Undersökningen visar svaghet.", evidenceRefs: [{ sourceId: passage.id, exactQuote: passage.text }], integrityStatus: "valid", supportStatus: "unreviewed" });
    const result = reviewResultSchema.parse(await (await createReviewHandler(() => new MockProvider())(request(body))).json());
    expect(result.findings.find(({ targetClaimId }) => targetClaimId === "question-as-finding")?.proposedChange?.operation).toBe("delete");
    expect(result.findings.find(({ targetClaimId }) => targetClaimId === "d3-sensation")?.proposedChange).toMatchObject({ operation: "replace", text: expect.stringContaining("inte har tappat") });
  });

  it("retains integrity findings when the model reports no issues", async () => {
    const body = await input();
    body.draft.sections[0].claims[0].evidenceRefs[0].sourceId = "foreign-source";
    const provider = new MockProvider();
    vi.spyOn(provider, "review").mockResolvedValue({ findings: [], metadata: (await provider.draft(createSourceSnapshot("D1", developmentCases[0].input))).metadata });
    const result = reviewResultSchema.parse(await (await createReviewHandler(() => provider)(request(body))).json());
    expect(result.completionStatus).toBe("complete");
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({ actionType: "unsupported_or_conflicting", targetClaimId: "d1-occupation", proposedChange: null, evidenceRefs: [] });
  });

  it.each(["snapshot-text", "snapshot-id", "source-revision", "decision", "draft-decision", "duplicate-claim", "missing-field"])("rejects invalid %s before provider selection", async (fault) => {
    const body = await input();
    if (fault === "snapshot-text") body.snapshot.passages[0].text = "Ändrat underlag.";
    if (fault === "snapshot-id") body.snapshot.id = "invented-snapshot";
    if (fault === "source-revision") body.sourceRevision = 99;
    if (fault === "decision") body.explicitDecision = { ...body.explicitDecision, leaveExtent: 100 };
    if (fault === "draft-decision") body.draft.explicitDecision = { ...body.draft.explicitDecision, diagnosisCode: "invented" };
    if (fault === "duplicate-claim") body.draft.sections[0].claims.push(structuredClone(body.draft.sections[0].claims[0]));
    if (fault === "missing-field") body.draft.sections.pop();
    const factory = vi.fn(() => new MockProvider());
    const response = await createReviewHandler(factory)(request(body));
    expect(response.status).toBe(400);
    expect(apiErrorSchema.parse(await response.json()).code).toBe("INVALID_INPUT");
    expect(factory).not.toHaveBeenCalled();
  });

  it.each(["target", "wrong-field", "citation", "proposal-citation"])("rejects unsafe model %s as an incomplete review", async (fault) => {
    const body = await input();
    body.draft.sections[0].claims.shift();
    const provider = new MockProvider();
    const raw = await provider.review(body);
    const finding = raw.findings[0];
    if (fault === "target" || fault === "wrong-field") {
      finding.actionType = "unsupported_or_conflicting";
      finding.targetClaimId = fault === "target" ? "unknown-claim" : body.draft.sections[1].claims[0].id;
      finding.proposedChange = { operation: "delete", targetClaimId: finding.targetClaimId, text: null, evidenceRefs: [] };
    }
    if (fault === "citation") finding.evidenceRefs[0].sourceId = "foreign-source";
    if (fault === "proposal-citation") finding.proposedChange!.evidenceRefs[0].exactQuote = "Citat som saknas.";
    vi.spyOn(provider, "review").mockResolvedValue(raw);
    const result = reviewResultSchema.parse(await (await createReviewHandler(() => provider)(request(body))).json());
    expect(result).toMatchObject({ completionStatus: "incomplete", metadata: null, error: { code: "INVALID_MODEL_OUTPUT" } });
    expect(result.findings.some(({ proposedChange }) => proposedChange !== null)).toBe(false);
  });

  it.each(["timeout", "refusal", "unknown"])("preserves code findings and input on provider %s failure", async (fault) => {
    const body = await input();
    body.draft.sections[0].claims[0].evidenceRefs = [];
    const before = JSON.stringify(body.draft);
    const provider = new MockProvider();
    vi.spyOn(provider, "review").mockRejectedValue(fault === "unknown" ? new Error("test-only-secret RAW BODY")
      : new ApplicationError(fault === "timeout" ? "REQUEST_TIMEOUT" : "GENERATION_FAILED", "Granskningen kunde inte slutföras.", 502, true));
    const result = reviewResultSchema.parse(await (await createReviewHandler(() => provider)(request(body))).json());
    expect(result.completionStatus).toBe("incomplete");
    expect(result.findings).toHaveLength(1);
    expect(JSON.stringify(body.draft)).toBe(before);
    expect(JSON.stringify(result)).not.toMatch(/test-only-secret|RAW BODY/);
  });

  it("supports all 400 possible integrity findings without losing code errors", async () => {
    const body = await input();
    body.draft.sections.forEach((section) => {
      section.claims = Array.from({ length: 100 }, (_, index) => ({ id: `manual-${section.fieldId}-${index}`, fieldId: section.fieldId, text: "Manuellt påstående.", evidenceRefs: [], integrityStatus: "unverified", supportStatus: "unreviewed" }));
    });
    const provider = new MockProvider();
    vi.spyOn(provider, "review").mockResolvedValue({ findings: [], metadata: (await provider.draft(createSourceSnapshot("D1", developmentCases[0].input))).metadata });
    const result = reviewResultSchema.parse(await (await createReviewHandler(() => provider)(request(body))).json());
    expect(result.findings).toHaveLength(400);
    expect(new Set(result.findings.map(({ id }) => id)).size).toBe(400);
  });
});
