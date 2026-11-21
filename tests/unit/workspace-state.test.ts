import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { developmentCases } from "../../fixtures/development/cases";
import { MockProvider } from "../../lib/server/mock-provider";
import { createSourceSnapshot } from "../../lib/server/source-snapshot";
import { validateDraftOutput } from "../../lib/server/provider-output";
import { initialWorkspaceState, workspaceReducer, type WorkspaceState } from "../../lib/workspace-state";
import { draftResponseSchema } from "../../lib/schemas";

const requestId = "d3faee2b-b031-4c54-8bdc-d572a17d19b1";
const newerRequestId = "64eb1ae8-b16a-45fa-987f-44a9da34aa82";

async function pending() {
  const fixture = developmentCases[0];
  let state = workspaceReducer(initialWorkspaceState(), { type: "caseChanged", caseId: fixture.id, input: fixture.input });
  const context = { requestId, sourceRevision: state.input.sourceRevision, draftRevision: state.draftRevision };
  state = workspaceReducer(state, { type: "requested", context });
  const snapshot = createSourceSnapshot(state.caseId, state.input);
  const output = validateDraftOutput(snapshot, await new MockProvider().draft(snapshot));
  const result = draftResponseSchema.parse({ ...context, snapshot, ...output });
  return { state, context, result };
}
async function ready() {
  const data = await pending();
  return { ...data, state: workspaceReducer(data.state, { type: "received", result: data.result }) };
}

describe("draft workspace state", () => {
  it("clears the previous draft and all decision values when switching cases", async () => {
    const { state } = await ready();
    const next = workspaceReducer(state, { type: "caseChanged", caseId: "D2", input: developmentCases[1].input });
    expect(next.result).toBeNull();
    expect(next.error).toBeNull();
    expect(next.input.explicitDecision).toEqual(developmentCases[1].input.explicitDecision);
    expect(next.input.sourceRevision).toBeGreaterThan(state.input.sourceRevision);
  });

  it("ignores a draft that finishes after switching to a different case", async () => {
    const { state, result } = await pending();
    const changed = workspaceReducer(state, { type: "caseChanged", caseId: "D2", input: developmentCases[1].input });
    expect(workspaceReducer(changed, { type: "received", result })).toBe(changed);
  });

  it("ignores stale success and failure responses after editing sources", async () => {
    const { state, context, result } = await pending();
    const changed = workspaceReducer(state, { type: "sourceChanged", input: { ...state.input, clinicianAssessmentText: "Ny bedömning." } });
    expect(workspaceReducer(changed, { type: "received", result })).toBe(changed);
    expect(workspaceReducer(changed, { type: "failed", context, message: "Gammalt fel" })).toBe(changed);
  });

  it("preserves manual edits and marks prior evidence unverified when an older draft is pending", async () => {
    const { state: original } = await ready();
    const context = { requestId: newerRequestId, sourceRevision: original.input.sourceRevision, draftRevision: original.draftRevision };
    const loading = workspaceReducer(original, { type: "requested", context });
    const claim = original.result!.draft.sections[0].claims[0];
    const edited = workspaceReducer(loading, { type: "claimEdited", claimId: claim.id, text: "Läkarens egen ändrade formulering." });
    expect(edited.result!.draft.sections[0].claims[0]).toMatchObject({ text: "Läkarens egen ändrade formulering.", supportStatus: "stale", integrityStatus: "unverified", evidenceRefs: claim.evidenceRefs });
    const older = { ...original.result!, ...context };
    expect(workspaceReducer(edited, { type: "received", result: older })).toBe(edited);
    expect(original.result!.draft.sections[0].claims[0].text).not.toBe("Läkarens egen ändrade formulering.");
  });

  it("accepts only the latest request, even when the revision numbers match", async () => {
    const { state, context, result } = await pending();
    const newer = workspaceReducer(state, { type: "requested", context: { ...context, requestId: newerRequestId } });
    expect(workspaceReducer(newer, { type: "received", result })).toBe(newer);
    const complete = workspaceReducer(newer, { type: "received", result: { ...result, requestId: newerRequestId } });
    expect(complete.status).toBe("ready");
    expect(workspaceReducer(complete, { type: "received", result: { ...result, requestId: newerRequestId } })).toBe(complete);
  });

  it("retains draft text when regeneration fails", async () => {
    const { state: original } = await ready();
    const context = { requestId: newerRequestId, sourceRevision: original.input.sourceRevision, draftRevision: original.draftRevision };
    const loading = workspaceReducer(original, { type: "requested", context });
    const failed = workspaceReducer(loading, { type: "failed", context, message: "Kunde inte skapa utkast." });
    expect(failed.result).toBe(original.result);
    expect(failed.status).toBe("error");
    expect(failed.error).toBe("Kunde inte skapa utkast.");
  });

  it("rejects wrong-case responses and obsolete request contexts", async () => {
    const { state, result } = await pending();
    expect(workspaceReducer(state, { type: "received", result: { ...result, snapshot: { ...result.snapshot, caseId: "D2" } } })).toBe(state);
    expect(workspaceReducer(state, { type: "requested", context: { requestId, sourceRevision: 99, draftRevision: 99 } })).toBe(state);
    const withUnknownClaim: WorkspaceState = workspaceReducer(state, { type: "claimEdited", claimId: "not-in-the-draft", text: "Text" });
    expect(withUnknownClaim).toBe(state);
  });
});
