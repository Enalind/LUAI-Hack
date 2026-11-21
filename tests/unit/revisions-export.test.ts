import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { developmentCases } from "../../fixtures/development/cases";
import { MockProvider } from "../../lib/server/mock-provider";
import { createSourceSnapshot } from "../../lib/server/source-snapshot";
import { validateDraftOutput } from "../../lib/server/provider-output";
import { draftResponseSchema, type Finding } from "../../lib/schemas";
import { getReviewStatus, initialWorkspaceState, workspaceReducer, type WorkspaceState } from "../../lib/workspace-state";
import { applyFindingSuggestion, refreshDraftSources } from "../../lib/revisions";
import { appendClinicianAddition } from "../../lib/clinician-additions";
import { copyWarnings, createReviewReport, fieldText } from "../../lib/export";

async function ready(index = 0) {
  const fixture = developmentCases[index];
  let state = workspaceReducer(initialWorkspaceState(), { type: "caseChanged", caseId: fixture.id, input: fixture.input });
  const context = { requestId: crypto.randomUUID(), sourceRevision: state.input.sourceRevision, draftRevision: state.draftRevision };
  state = workspaceReducer(state, { type: "requested", context });
  const snapshot = createSourceSnapshot(state.caseId, state.input);
  return workspaceReducer(state, { type: "received", result: draftResponseSchema.parse({ ...context, snapshot,
    ...validateDraftOutput(snapshot, await new MockProvider().draft(snapshot)) }) });
}
async function reviewed(state: WorkspaceState) {
  const context = { requestId: crypto.randomUUID(), sourceRevision: state.input.sourceRevision, draftRevision: state.draftRevision };
  const provider = await new MockProvider().review({ snapshot: state.result!.snapshot, draft: state.result!.draft });
  return workspaceReducer(workspaceReducer(state, { type: "reviewRequested", context }), { type: "reviewReceived", result: {
    ...context, ...provider, completionStatus: "complete", error: null,
  } });
}
function action(state: WorkspaceState, status: "accepted" | "dismissed", findingId = state.review!.findings[0].id) {
  return workspaceReducer(state, { type: "findingDisposition", findingId, status, note: "Läkarens egen notering." });
}

describe("clinician revisions and clean export", () => {
  it.each(["replace", "add", "delete"] as const)("applies %s only to its intended section, then requires a recheck", async (operation) => {
    let state = await ready();
    const original = state.result!.draft.sections[0].claims[0];
    if (operation === "replace") state = workspaceReducer(state, { type: "claimEdited", claimId: original.id, text: "Ändrad formulering." });
    if (operation === "add") state.result!.draft.sections[0].claims.shift();
    if (operation === "delete") state.result!.draft.sections[0].claims.push({ ...original, id: "manual-extra", text: "Saknar källstöd." });
    state = await reviewed(state);
    const before = structuredClone(state.result!.draft);
    const accepted = action(state, "accepted");
    expect(accepted.result!.draft.sections.slice(1)).toEqual(before.sections.slice(1));
    expect(accepted.result!.draft.explicitDecision).toEqual(before.explicitDecision);
    const texts = accepted.result!.draft.sections[0].claims.map(({ text }) => text);
    expect(texts).toContain(original.text);
    expect(texts).not.toContain(operation === "delete" ? "Saknar källstöd." : "Ändrad formulering.");
    expect(accepted.draftRevision).toBe(state.draftRevision + 1);
    expect(getReviewStatus(accepted)).toBe("stale");
    expect(accepted.dispositions[0]).toMatchObject({ status: "accepted", reviewRequestId: state.review!.requestId, draftRevision: state.draftRevision });
    expect(action(accepted, "accepted")).toBe(accepted);
    expect(getReviewStatus(await reviewed(accepted))).toBe("complete");
  });

  it("dismissal leaves text, evidence and review support unchanged, scoped to its review request", async () => {
    let state = await ready();
    state = workspaceReducer(state, { type: "claimEdited", claimId: "d1-occupation", text: "Min text." });
    state = await reviewed(state);
    const dismissed = action(state, "dismissed");
    expect(dismissed.result).toBe(state.result);
    expect(dismissed.draftRevision).toBe(state.draftRevision);
    expect(dismissed.result!.draft.sections[0].claims[0].supportStatus).toBe("needs_review");
    expect(copyWarnings(dismissed, "3").join()).toContain("Avfärdade");
    const recheck = await reviewed(dismissed);
    expect(recheck.dispositions).toHaveLength(1);
    expect(action(recheck, "dismissed").dispositions).toHaveLength(2);
  });

  it.each(["edited", "source", "pending", "incomplete"])("blocks suggestions when %s", async (kind) => {
    let state = await ready();
    state = workspaceReducer(state, { type: "claimEdited", claimId: "d1-occupation", text: "Min text." });
    state = await reviewed(state);
    if (kind === "edited") state = workspaceReducer(state, { type: "claimEdited", claimId: "d1-occupation", text: "Ny text." });
    if (kind === "source") state = workspaceReducer(state, { type: "sourceChanged", input: state.input });
    if (kind === "pending") state = workspaceReducer(state, { type: "requested", context: { requestId: crypto.randomUUID(), sourceRevision: state.input.sourceRevision, draftRevision: state.draftRevision } });
    if (kind === "incomplete") state = { ...state, reviewError: "Ofullständig kontroll." };
    expect(action(state, "accepted")).toBe(state);
    expect(action(state, "dismissed")).toBe(state);
  });

  it.each(["citation", "target", "field", "duplicate"])("revalidates unsafe %s at application time", async (fault) => {
    const state = await ready();
    const draft = state.result!.draft;
    const claim = draft.sections[0].claims[0];
    const finding: Finding = { id: "test", category: "work_tasks", actionType: "unsupported_or_conflicting", priority: "needs_review", fieldId: "3", targetClaimId: claim.id,
      explanation: "Test", evidenceRefs: claim.evidenceRefs, proposedChange: { operation: "replace", targetClaimId: claim.id, text: "Ny text.", evidenceRefs: claim.evidenceRefs }, question: null };
    if (fault === "citation") finding.proposedChange!.evidenceRefs = [{ sourceId: "foreign", exactQuote: "okänt" }];
    if (fault === "target") { finding.targetClaimId = "unknown"; finding.proposedChange!.targetClaimId = "unknown"; }
    if (fault === "field") finding.fieldId = "5";
    if (fault === "duplicate") { finding.actionType = "available_but_missing"; finding.targetClaimId = null; finding.proposedChange = { operation: "add", targetClaimId: null, text: "Ny text", evidenceRefs: claim.evidenceRefs }; }
    const before = JSON.stringify(draft);
    expect(() => applyFindingSuggestion(draft, state.result!.snapshot, finding, claim.id)).toThrow();
    expect(JSON.stringify(draft)).toBe(before);
  });

  it("refreshes sources while retaining manual text and only remaps identical passage positions", async () => {
    let state = await ready(1);
    state = workspaceReducer(state, { type: "claimEdited", claimId: "d2-neck-pain", text: "Min egen formulering." });
    const input = { ...state.input, sourceRevision: state.input.sourceRevision + 1,
      clinicianAssessmentText: appendClinicianAddition(state.input.clinicianAssessmentText, "3", "Patienten arbetar med bokföring.") };
    const snapshot = createSourceSnapshot(state.caseId, input);
    const updated = refreshDraftSources(state.result!, snapshot);
    expect(updated.draft.sections[1].claims[0]).toMatchObject({ text: "Min egen formulering.", supportStatus: "stale", integrityStatus: "unverified" });
    expect(updated.draft.sections[1].claims[0].evidenceRefs[0].sourceId).toBe(snapshot.passages.find((passage) => passage.text.includes("Jag har haft värk i nacken i två veckor."))!.id);
    expect(updated.draft.explicitDecision).toEqual(input.explicitDecision);
    const changed = createSourceSnapshot(state.caseId, { ...input, consultationText: "Ny första passage." });
    expect(refreshDraftSources(state.result!, changed).draft.sections[1].claims[0].evidenceRefs).toEqual(state.result!.draft.sections[1].claims[0].evidenceRefs);
    const output = await new MockProvider().review({ snapshot, draft: updated.draft });
    expect(output.findings.find(({ fieldId }) => fieldId === "3")).toMatchObject({ actionType: "available_but_missing", proposedChange: { operation: "add", text: "Läkarens komplettering: Patienten arbetar med bokföring." } });
  });

  it("ignores source responses after edits or a newer refresh request", async () => {
    const state = await ready();
    const context = { requestId: crypto.randomUUID(), sourceRevision: state.input.sourceRevision, draftRevision: state.draftRevision };
    const loading = workspaceReducer(state, { type: "sourcesRequested", context });
    const response = { ...context, snapshot: JSON.parse(JSON.stringify(state.result!.snapshot)) };
    const changed = workspaceReducer(loading, { type: "claimEdited", claimId: "d1-occupation", text: "Nyare text." });
    expect(workspaceReducer(changed, { type: "sourcesReceived", result: response })).toBe(changed);
    const newer = workspaceReducer(loading, { type: "sourcesRequested", context: { ...context, requestId: crypto.randomUUID() } });
    expect(workspaceReducer(newer, { type: "sourcesReceived", result: response })).toBe(newer);
    const completed = workspaceReducer(loading, { type: "sourcesReceived", result: response });
    expect(completed.sourceSnapshots).toHaveLength(2);
    expect(completed.activeSources).toBeNull();
  });

  it("copies current wording without placeholders, labels, citations or invented decisions", async () => {
    let state = await ready(1);
    expect(fieldText(state, "3")).toBe("");
    expect(copyWarnings(state, "3")).not.toEqual([]);
    state = workspaceReducer(state, { type: "claimEdited", claimId: "d2-neck-pain", text: "  Läkarens aktuella ord.\nÅäö  " });
    expect(fieldText(state, "5")).toBe(`  Läkarens aktuella ord.\nÅäö  \n\n${state.result!.draft.sections[1].claims[1].text}`);
    const report = JSON.parse(createReviewReport(state, false));
    expect(report.fields["3"]).toBe("");
    expect(report.explicitDecision).toEqual(developmentCases[1].input.explicitDecision);
    expect(report.fields["5"]).not.toMatch(/Källa|Underlag saknas|Påstående/);
    expect(report.mode).toBe("mock");
    expect(report.sourceSnapshots[0].input).toBeUndefined();
    expect(report.draft.sections[1].claims[0].evidenceRefs[0].exactQuote).toBeUndefined();
    expect(JSON.parse(createReviewReport(state, true)).sourceSnapshots[0].input).toEqual(state.input);
  });

  it("requires confirmation after stale or incomplete reviews; a clean reviewed field has no warnings", async () => {
    let state = await reviewed(await ready());
    expect(copyWarnings(state, "3")).toEqual([]);
    state = workspaceReducer(state, { type: "claimEdited", claimId: "d1-occupation", text: "Aktuell text." });
    expect(copyWarnings(state, "3").join()).toContain("aktuell version");
    expect(copyWarnings({ ...state, reviewError: "Nätverksfel." }, "3").join()).toContain("aktuell version");
  });
});
