import type { FieldId } from "./schemas";
import { getReviewStatus, type WorkspaceState } from "./workspace-state";
import { validateEvidenceReferences } from "./evidence";

export function fieldText(state: WorkspaceState, fieldId: FieldId): string {
  return state.result?.draft.sections.find((section) => section.fieldId === fieldId)?.claims
    .filter((claim) => claim.text.trim()).map((claim) => claim.text).join("\n\n") ?? "";
}

export function copyWarnings(state: WorkspaceState, fieldId: FieldId): string[] {
  const warnings: string[] = [];
  if (getReviewStatus(state) !== "complete" || state.status === "loading") warnings.push("Granskningen är inte slutförd för aktuell version.");
  if (state.result?.sourceRevision !== state.input.sourceRevision) warnings.push("Underlaget har ändrats sedan källversionen skapades.");
  const section = state.result?.draft.sections.find((section) => section.fieldId === fieldId);
  if (!section?.claims.length || section.informationGaps.length || section.claims.some((claim) => !claim.text.trim())) warnings.push("Fältet innehåller luckor som behöver bedömas.");
  if (state.review?.findings.some((finding) => finding.fieldId === fieldId)) warnings.push("Det finns granskningsfynd för fältet. Avfärdade fynd innebär inte verifiering.");
  if (section?.claims.some((claim) => claim.integrityStatus !== "valid" || !claim.evidenceRefs.length
    || validateEvidenceReferences(claim.evidenceRefs, state.result!.snapshot).issues.length)) warnings.push("Källstödet behöver kontrolleras.");
  return warnings;
}

export function createReviewReport(state: WorkspaceState, includeSources: boolean) {
  const report = {
    formatVersion: 1, fictionalData: true, createdAt: new Date().toISOString(), caseId: state.caseId,
    mode: state.result?.metadata.mode ?? null, sourceRevision: state.input.sourceRevision, draftRevision: state.draftRevision,
    reviewStatus: getReviewStatus(state), reviewError: state.reviewError, draftMetadata: state.result?.metadata ?? null,
    fields: Object.fromEntries(["3", "5", "6", "7"].map((id) => [id, fieldText(state, id as FieldId)])),
    draft: state.result?.draft ?? null, draftSourceSnapshotId: state.result?.snapshot.id ?? null,
    explicitDecision: state.input.explicitDecision, findings: state.review?.findings ?? [],
    dispositions: state.dispositions, reviewHistory: state.reviewHistory,
    sourceSnapshots: state.sourceSnapshots.map((snapshot) => includeSources ? snapshot
      : { id: snapshot.id, caseId: snapshot.caseId, sourceRevision: snapshot.sourceRevision, sourceIds: snapshot.passages.map(({ id }) => id) }),
    ...(includeSources ? { currentSourceInput: state.input } : {}),
    includesSourceText: includeSources,
  };
  return JSON.stringify(report, (key, value) => !includeSources && key === "exactQuote" ? undefined : value, 2);
}
