import type { DraftResponse, RequestContext, ReviewResult, SourceInput } from "./schemas";
import { validateEvidenceReferences } from "./evidence";

export type WorkspaceState = {
  caseId: string;
  input: SourceInput;
  draftRevision: number;
  result: DraftResponse | null;
  activeRequest: RequestContext | null;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  review: ReviewResult | null;
  previousReview: ReviewResult | null;
  activeReview: RequestContext | null;
  reviewError: string | null;
};

export function emptySourceInput(sourceRevision = 0): SourceInput {
  return {
    consultationText: "", clinicianAssessmentText: "", sourceRevision,
    explicitDecision: { diagnosisText: null, diagnosisCode: null, leaveExtent: null, startDate: null, endDate: null },
  };
}

export function initialWorkspaceState(): WorkspaceState {
  return { caseId: "custom", input: emptySourceInput(), draftRevision: 0, result: null, activeRequest: null, status: "idle", error: null,
    review: null, previousReview: null, activeReview: null, reviewError: null };
}

export type WorkspaceAction =
  | { type: "caseChanged"; caseId: string; input: SourceInput }
  | { type: "sourceChanged"; input: SourceInput }
  | { type: "claimEdited"; claimId: string; text: string }
  | { type: "requested"; context: RequestContext }
  | { type: "received"; result: DraftResponse }
  | { type: "failed"; context: RequestContext; message: string }
  | { type: "invalid"; message: string }
  | { type: "reviewRequested"; context: RequestContext }
  | { type: "reviewReceived"; result: ReviewResult }
  | { type: "reviewFailed"; context: RequestContext; message: string };

export function getReviewStatus(state: WorkspaceState): "idle" | "loading" | "complete" | "incomplete" | "stale" {
  if (state.activeReview) return "loading";
  if (state.reviewError) return "incomplete";
  if (!state.review) return "idle";
  if (state.review.sourceRevision !== state.input.sourceRevision || state.review.draftRevision !== state.draftRevision) return "stale";
  return state.review.completionStatus;
}

function matchesReviewRequest(state: WorkspaceState, context: RequestContext) {
  return state.activeReview?.requestId === context.requestId && context.sourceRevision === state.input.sourceRevision && context.draftRevision === state.draftRevision;
}

function matchesCurrentRequest(state: WorkspaceState, context: RequestContext) {
  return state.activeRequest?.requestId === context.requestId
    && context.sourceRevision === state.input.sourceRevision
    && context.draftRevision === state.draftRevision;
}

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case "caseChanged":
      return {
        ...initialWorkspaceState(), caseId: action.caseId,
        input: { ...structuredClone(action.input), sourceRevision: state.input.sourceRevision + 1 },
        draftRevision: state.draftRevision + 1,
      };
    case "sourceChanged":
      return {
        ...state, input: { ...action.input, sourceRevision: state.input.sourceRevision + 1 },
        activeRequest: null, status: state.result ? "ready" : "idle", error: null,
        activeReview: null, reviewError: null,
        result: state.result ? { ...state.result, draft: { ...state.result.draft, sections: state.result.draft.sections.map((section) => ({ ...section,
          claims: section.claims.map((claim) => ({ ...claim, supportStatus: "stale" })),
        })) } } : null,
      };
    case "claimEdited": {
      if (!state.result || !state.result.draft.sections.some((section) => section.claims.some((claim) => claim.id === action.claimId))) return state;
      return {
        ...state, draftRevision: state.draftRevision + 1, activeRequest: null, status: "ready", error: null, activeReview: null, reviewError: null,
        result: {
          ...state.result,
          draft: { ...state.result.draft, sections: state.result.draft.sections.map((section) => ({
            ...section, claims: section.claims.map((claim) => claim.id === action.claimId
              ? { ...claim, text: action.text, integrityStatus: "unverified", supportStatus: "stale" } : claim),
          })) },
        },
      };
    }
    case "requested":
      if (action.context.sourceRevision !== state.input.sourceRevision || action.context.draftRevision !== state.draftRevision) return state;
      return { ...state, activeRequest: action.context, status: "loading", error: null, activeReview: null, reviewError: null };
    case "received":
      if (!matchesCurrentRequest(state, action.result) || action.result.snapshot.caseId !== state.caseId) return state;
      return { ...state, result: action.result, draftRevision: state.draftRevision + 1, activeRequest: null, status: "ready", error: null,
        activeReview: null, reviewError: null };
    case "failed":
      if (!matchesCurrentRequest(state, action.context)) return state;
      return { ...state, activeRequest: null, status: "error", error: action.message };
    case "invalid":
      return { ...state, activeRequest: null, status: "error", error: action.message };
    case "reviewRequested":
      if (!state.result || state.status === "loading" || state.result.sourceRevision !== state.input.sourceRevision
        || action.context.sourceRevision !== state.input.sourceRevision || action.context.draftRevision !== state.draftRevision) return state;
      return { ...state, activeReview: action.context, reviewError: null };
    case "reviewReceived": {
      if (!matchesReviewRequest(state, action.result)) return state;
      const previousReview = action.result.completionStatus === "complete" ? null
        : state.review?.completionStatus === "complete" ? state.review : state.previousReview;
      let result = state.result;
      if (result && action.result.completionStatus === "complete") {
        const targets = new Set(action.result.findings.map(({ targetClaimId }) => targetClaimId));
        const snapshot = result.snapshot;
        result = { ...result, draft: { ...result.draft, sections: result.draft.sections.map((section) => ({ ...section,
          claims: section.claims.map((claim) => ({ ...claim,
            integrityStatus: claim.integrityStatus === "invalid" || validateEvidenceReferences(claim.evidenceRefs, snapshot).issues.length ? "invalid"
              : claim.evidenceRefs.length ? "valid" : "missing",
            supportStatus: targets.has(claim.id) ? "needs_review" : "reviewed",
          })),
        })) } };
      }
      return { ...state, result, review: action.result, previousReview, activeReview: null, reviewError: null };
    }
    case "reviewFailed":
      if (!matchesReviewRequest(state, action.context)) return state;
      return { ...state, activeReview: null, reviewError: action.message };
  }
}
