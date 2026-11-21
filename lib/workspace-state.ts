import type { DraftResponse, RequestContext, SourceInput } from "./schemas";

export type WorkspaceState = {
  caseId: string;
  input: SourceInput;
  draftRevision: number;
  result: DraftResponse | null;
  activeRequest: RequestContext | null;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
};

export function emptySourceInput(sourceRevision = 0): SourceInput {
  return {
    consultationText: "", clinicianAssessmentText: "", sourceRevision,
    explicitDecision: { diagnosisText: null, diagnosisCode: null, leaveExtent: null, startDate: null, endDate: null },
  };
}

export function initialWorkspaceState(): WorkspaceState {
  return { caseId: "custom", input: emptySourceInput(), draftRevision: 0, result: null, activeRequest: null, status: "idle", error: null };
}

export type WorkspaceAction =
  | { type: "caseChanged"; caseId: string; input: SourceInput }
  | { type: "sourceChanged"; input: SourceInput }
  | { type: "claimEdited"; claimId: string; text: string }
  | { type: "requested"; context: RequestContext }
  | { type: "received"; result: DraftResponse }
  | { type: "failed"; context: RequestContext; message: string }
  | { type: "invalid"; message: string };

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
      };
    case "claimEdited": {
      if (!state.result || !state.result.draft.sections.some((section) => section.claims.some((claim) => claim.id === action.claimId))) return state;
      return {
        ...state, draftRevision: state.draftRevision + 1, activeRequest: null, status: "ready", error: null,
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
      return { ...state, activeRequest: action.context, status: "loading", error: null };
    case "received":
      if (!matchesCurrentRequest(state, action.result) || action.result.snapshot.caseId !== state.caseId) return state;
      return { ...state, result: action.result, draftRevision: state.draftRevision + 1, activeRequest: null, status: "ready", error: null };
    case "failed":
      if (!matchesCurrentRequest(state, action.context)) return state;
      return { ...state, activeRequest: null, status: "error", error: action.message };
    case "invalid":
      return { ...state, activeRequest: null, status: "error", error: action.message };
  }
}
