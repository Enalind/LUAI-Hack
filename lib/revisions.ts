import { draftDocumentSchema, findingSchema, type DraftDocument, type DraftResponse, type Finding, type SourceSnapshot } from "./schemas";
import { validateEvidenceReferences } from "./evidence";

/** Recheck every target and citation at the moment an action is applied. */
export function applyFindingSuggestion(draft: DraftDocument, snapshot: SourceSnapshot, raw: Finding, newClaimId: string): DraftDocument {
  const finding = findingSchema.parse(raw);
  const change = finding.proposedChange;
  if (!change || validateEvidenceReferences(finding.evidenceRefs, snapshot).issues.length
    || validateEvidenceReferences(change.evidenceRefs, snapshot).issues.length) throw new Error("Förslaget saknar giltigt källstöd.");
  const section = draft.sections.find(({ fieldId }) => fieldId === finding.fieldId);
  if (!section) throw new Error("Intygsfältet saknas.");
  if (change.operation !== "add" && !section.claims.some(({ id }) => id === change.targetClaimId)) throw new Error("Påståendet finns inte i det angivna fältet.");
  if (change.operation === "add" && draft.sections.some(({ claims }) => claims.some(({ id }) => id === newClaimId))) throw new Error("Påstående-ID finns redan.");
  const changed = draft.sections.map((item) => item !== section ? item : {
    ...item,
    claims: change.operation === "add"
      ? [...item.claims, { id: newClaimId, fieldId: item.fieldId, text: change.text, evidenceRefs: change.evidenceRefs, integrityStatus: "unverified" as const, supportStatus: "stale" as const }]
      : change.operation === "delete" ? item.claims.filter(({ id }) => id !== change.targetClaimId)
        : item.claims.map((claim) => claim.id === change.targetClaimId ? { ...claim, text: change.text, evidenceRefs: change.evidenceRefs, integrityStatus: "unverified" as const, supportStatus: "stale" as const } : claim),
  });
  return draftDocumentSchema.parse({ ...draft, sections: changed });
}

/** Keep manual text. Only retarget an unchanged passage at the same origin/position. */
export function refreshDraftSources(result: DraftResponse, snapshot: SourceSnapshot): DraftResponse {
  if (result.snapshot.caseId !== snapshot.caseId) throw new Error("Källversionen hör till ett annat fall.");
  const mapping = new Map<string, string>();
  for (const origin of ["consultation", "clinician_assessment", "clinician_decision"] as const) {
    const old = result.snapshot.passages.filter((passage) => passage.origin === origin);
    const current = snapshot.passages.filter((passage) => passage.origin === origin);
    old.forEach((passage, index) => {
      const target = origin === "clinician_decision" ? current.find((item) => item.decisionField === passage.decisionField) : current[index];
      if (target?.text === passage.text) mapping.set(passage.id, target.id);
    });
  }
  return { ...result, sourceRevision: snapshot.sourceRevision, snapshot: JSON.parse(JSON.stringify(snapshot)),
    validationFindings: [],
    draft: { ...result.draft, explicitDecision: { ...snapshot.input.explicitDecision }, sections: result.draft.sections.map((section) => ({ ...section,
      claims: section.claims.map((claim) => ({ ...claim,
        evidenceRefs: claim.evidenceRefs.map((ref) => ({ ...ref, sourceId: mapping.get(ref.sourceId) ?? ref.sourceId })),
        integrityStatus: "unverified", supportStatus: "stale",
      })),
    })) },
  };
}
