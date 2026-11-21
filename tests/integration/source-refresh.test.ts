import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("../../lib/server/provider-factory", () => ({ getCertificateProvider: vi.fn(() => { throw new Error("A source refresh must not select a model."); }) }));
import { POST } from "../../app/api/sources/route";
import { getCertificateProvider } from "../../lib/server/provider-factory";
import { developmentCases } from "../../fixtures/development/cases";
import { sourceSnapshotResponseSchema, apiErrorSchema, reviewResultSchema } from "../../lib/schemas";
import { createSourceSnapshot, validateSourceSnapshot } from "../../lib/server/source-snapshot";
import { validateDraftOutput } from "../../lib/server/provider-output";
import { MockProvider } from "../../lib/server/mock-provider";
import { createReviewHandler } from "../../lib/server/review-service";
import { appendClinicianAddition } from "../../lib/clinician-additions";
import { refreshDraftSources } from "../../lib/revisions";

function request(body: unknown, path = "sources") {
  return new Request(`http://localhost/api/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
function input() {
  return { requestId: crypto.randomUUID(), sourceRevision: 1, draftRevision: 3, caseId: "D2", input: { ...structuredClone(developmentCases[1].input), sourceRevision: 1 } };
}
describe("source refresh without draft generation", () => {
  it("creates a new immutable snapshot with no provider calls", async () => {
    const body = input();
    body.input.clinicianAssessmentText = appendClinicianAddition("", "3", "Arbetar med bokföring.");
    const response = await POST(request(body));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const result = sourceSnapshotResponseSchema.parse(await response.json());
    expect(result.requestId).toBe(body.requestId);
    expect(validateSourceSnapshot(result.snapshot).input).toEqual(body.input);
    expect(getCertificateProvider).not.toHaveBeenCalled();
  });

  it.each(["blank", "revision", "oversize", "decision"])("rejects invalid %s input before provider selection", async (fault) => {
    const body = input();
    if (fault === "blank") { body.input.consultationText = "   "; body.input.referenceMaterials = []; }
    if (fault === "revision") body.sourceRevision = 99;
    if (fault === "oversize") body.input.clinicianAssessmentText = "x".repeat(30001);
    if (fault === "decision") Object.assign(body.input.explicitDecision, { leaveExtent: 80 });
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(apiErrorSchema.parse(await response.json()).code).toBe("INVALID_INPUT");
    expect(getCertificateProvider).not.toHaveBeenCalled();
  });

  it("rechecks an existing manual draft and proposes clinician additions with exact evidence", async () => {
    const original = createSourceSnapshot("D2", developmentCases[1].input);
    const output = validateDraftOutput(original, await new MockProvider().draft(original));
    const body = input();
    body.input.clinicianAssessmentText = appendClinicianAddition("", "3", "Arbetar med bokföring.\nArbetar med bokföring.");
    const { snapshot } = sourceSnapshotResponseSchema.parse(await (await POST(request(body))).json());
    const existing = { ...body, snapshot: JSON.parse(JSON.stringify(original)), ...output, validationFindings: output.validationFindings };
    existing.draft.sections[1].claims[0].text = "Min egen formulering om nackvärk.";
    const updated = refreshDraftSources(existing, snapshot);
    const result = reviewResultSchema.parse(await (await createReviewHandler(() => new MockProvider())(request({
      requestId: body.requestId, sourceRevision: 1, draftRevision: 3, snapshot, draft: updated.draft, explicitDecision: body.input.explicitDecision,
    }, "review"))).json());
    expect(result.completionStatus).toBe("complete");
    const additions = result.findings.filter(({ fieldId }) => fieldId === "3");
    expect(additions.every(({ actionType }) => actionType === "available_but_missing")).toBe(true);
    expect(new Set(additions.map(({ proposedChange }) => proposedChange?.evidenceRefs[0].sourceId)).size).toBe(2);
    expect(updated.draft.sections[1].claims[0].text).toBe("Min egen formulering om nackvärk.");
    expect(updated.draft.explicitDecision).toEqual(developmentCases[1].input.explicitDecision);
    expect(getCertificateProvider).not.toHaveBeenCalled();
  });
});
