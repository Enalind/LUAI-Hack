import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { developmentCases } from "../../fixtures/development/cases";
import { MockProvider } from "../../lib/server/mock-provider";
import { createSourceSnapshot } from "../../lib/server/source-snapshot";
import { validateDraftOutput } from "../../lib/server/provider-output";
import { draftResponseSchema, type ReviewResult } from "../../lib/schemas";
import { getReviewStatus, initialWorkspaceState, workspaceReducer } from "../../lib/workspace-state";

const requestId = "d3faee2b-b031-4c54-8bdc-d572a17d19b1";
const newerId = "64eb1ae8-b16a-45fa-987f-44a9da34aa82";
async function ready() {
  const fixture = developmentCases[1];
  let state = workspaceReducer(initialWorkspaceState(), { type: "caseChanged", caseId: fixture.id, input: fixture.input });
  const draftContext = { requestId, sourceRevision: state.input.sourceRevision, draftRevision: state.draftRevision };
  state = workspaceReducer(state, { type: "requested", context: draftContext });
  const snapshot = createSourceSnapshot(fixture.id, state.input);
  const draft = validateDraftOutput(snapshot, await new MockProvider().draft(snapshot));
  state = workspaceReducer(state, { type: "received", result: draftResponseSchema.parse({ ...draftContext, snapshot, ...draft }) });
  const context = { ...draftContext, draftRevision: state.draftRevision };
  const provider = await new MockProvider().review({ snapshot, draft: draft.draft });
  const result: ReviewResult = { ...context, findings: provider.findings, completionStatus: "complete", metadata: provider.metadata, error: null };
  state = workspaceReducer(state, { type: "reviewRequested", context });
  return { state, context, result };
}

describe("revision-scoped review state", () => {
  it("stores a complete review without changing text or revision numbers", async () => {
    const { state, result } = await ready();
    const complete = workspaceReducer(state, { type: "reviewReceived", result });
    expect(getReviewStatus(complete)).toBe("complete");
    expect(complete.draftRevision).toBe(state.draftRevision);
    expect(complete.result!.draft.sections[1].claims[0].text).toBe(state.result!.draft.sections[1].claims[0].text);
  });

  it.each(["claim", "source", "case"])("ignores review responses arriving after %s edits", async (edit) => {
    const { state, context, result } = await ready();
    const changed = edit === "claim" ? workspaceReducer(state, { type: "claimEdited", claimId: "d2-neck-pain", text: "Egen aktuell text." })
      : edit === "source" ? workspaceReducer(state, { type: "sourceChanged", input: { ...state.input, clinicianAssessmentText: "Kompletterad bedömning." } })
      : workspaceReducer(state, { type: "caseChanged", caseId: "D1", input: developmentCases[0].input });
    expect(workspaceReducer(changed, { type: "reviewReceived", result })).toBe(changed);
    expect(workspaceReducer(changed, { type: "reviewFailed", context, message: "Gammalt fel" })).toBe(changed);
  });

  it("preserves earlier findings visibly stale until a complete recheck succeeds", async () => {
    const { state, context, result } = await ready();
    let current = workspaceReducer(state, { type: "reviewReceived", result });
    current = workspaceReducer(current, { type: "claimEdited", claimId: "d2-neck-pain", text: "Ändrad text." });
    expect(getReviewStatus(current)).toBe("stale");
    expect(current.review).toBe(result);
    const newer = { ...context, requestId: newerId, draftRevision: current.draftRevision };
    current = workspaceReducer(current, { type: "reviewRequested", context: newer });
    current = workspaceReducer(current, { type: "reviewReceived", result: { ...result, ...newer, completionStatus: "incomplete", metadata: null,
      findings: [], error: { requestId: newerId, code: "REQUEST_TIMEOUT", message: "Tidsgräns.", retryable: true } } });
    expect(getReviewStatus(current)).toBe("incomplete");
    expect(current.previousReview).toBe(result);
    current = workspaceReducer(current, { type: "reviewRequested", context: newer });
    current = workspaceReducer(current, { type: "reviewReceived", result: { ...result, ...newer } });
    expect(current.previousReview).toBeNull();
    expect(getReviewStatus(current)).toBe("complete");
  });

  it("allows only the newest review request and preserves the draft after network failure", async () => {
    const { state, context, result } = await ready();
    const newer = { ...context, requestId: newerId };
    const loading = workspaceReducer(state, { type: "reviewRequested", context: newer });
    expect(workspaceReducer(loading, { type: "reviewReceived", result })).toBe(loading);
    const failed = workspaceReducer(loading, { type: "reviewFailed", context: newer, message: "Nätverksfel." });
    expect(failed.result).toBe(loading.result);
    expect(getReviewStatus(failed)).toBe("incomplete");
  });

  it("retains the old review as stale when a replacement draft arrives", async () => {
    const { state, result } = await ready();
    let current = workspaceReducer(state, { type: "reviewReceived", result });
    const context = { requestId: newerId, sourceRevision: current.input.sourceRevision, draftRevision: current.draftRevision };
    current = workspaceReducer(current, { type: "requested", context });
    current = workspaceReducer(current, { type: "received", result: { ...current.result!, ...context } });
    expect(current.review).toBe(result);
    expect(getReviewStatus(current)).toBe("stale");
  });
});
