import { validateEvidenceReferences } from "./evidence";
import type { DraftDocument, FieldId, Finding, SourceSnapshot } from "./schemas";
import type { FkRuleId } from "./fk-guidance";

const emptyFieldRules: Record<FieldId, FkRuleId[]> = {
  "3": ["fk3-occupation"], "5": ["fk5-function", "fk5-basis"],
  "6": ["fk6-activity", "fk6-work"], "7": ["fk7-treatment"],
};

const emptyQuestions: Record<FieldId, string> = {
  "3": "Vilken sysselsättning bedöms arbetsförmågan mot, och finns konkreta arbetsuppgifter om patienten arbetar?",
  "5": "Finns funktionsnedsättning och bedömningsgrund dokumenterade, eller behöver de kompletteras?",
  "6": "Finns läkarens bedömda begränsningar i relation till arbete eller annan sysselsättning dokumenterade, eller behöver de kompletteras?",
  "7": "Finns pågående eller planerad behandling dokumenterad, eller behöver den kompletteras?",
};
const categories: Record<FieldId, Finding["category"]> = {
  "3": "work_tasks", "5": "assessment_basis", "6": "work_relationship", "7": "support_and_contradictions",
};

/** Code checks reference integrity and empty fields; it does not infer clinical gaps. */
export function deterministicReview(snapshot: SourceSnapshot, draft: DraftDocument): Finding[] {
  const findings: Finding[] = [];
  for (const section of draft.sections) {
    if (!section.claims.length) findings.push({
      id: `code-empty-${section.fieldId}`, category: categories[section.fieldId], actionType: "unclear", priority: "clarification",
      fieldId: section.fieldId, targetClaimId: null, evidenceRefs: [], proposedChange: null,
      guidelineRuleIds: emptyFieldRules[section.fieldId],
      explanation: "Intygsfältet saknar text. En tom sektion avgör inte om information finns i källan eller saknas helt.", question: emptyQuestions[section.fieldId],
    });
    section.claims.forEach((claim, index) => {
      const missing = claim.evidenceRefs.length === 0;
      const invalid = validateEvidenceReferences(claim.evidenceRefs, snapshot).issues.length > 0 || claim.integrityStatus === "invalid";
      if (missing || invalid) findings.push({
        id: `code-integrity-${section.fieldId}-${index + 1}`, category: "support_and_contradictions", actionType: "unsupported_or_conflicting", priority: "needs_review",
        targetClaimId: claim.id, fieldId: section.fieldId, evidenceRefs: [], proposedChange: null, question: null,
        explanation: missing ? "Påståendet saknar källhänvisning." : "Påståendet har en ogiltig källhänvisning. ID och exakt citat måste stämma med denna källversion.",
      });
    });
  }
  return findings;
}

function fingerprint(finding: Finding): string {
  const normalized = (value: string | null) => value?.trim().replace(/\s+/g, " ") ?? null;
  const refs = (items: Finding["evidenceRefs"]) => items.map((ref) => JSON.stringify(ref)).sort();
  return JSON.stringify({ ...finding, id: undefined,
    explanation: normalized(finding.explanation), question: normalized(finding.question), evidenceRefs: refs(finding.evidenceRefs),
    proposedChange: finding.proposedChange ? { ...finding.proposedChange, text: normalized(finding.proposedChange.text), evidenceRefs: refs(finding.proposedChange.evidenceRefs) } : null,
  });
}

/** Exact duplicates collapse; distinct explanations, actions and evidence remain. */
export function mergeReviewFindings(code: Finding[], model: Finding[], requestId: string): Finding[] {
  const specificFields = new Set(model.map(({ fieldId }) => fieldId));
  const seen = new Set<string>();
  const merged = [...code.filter((finding) => !finding.id.startsWith("code-empty-") || !specificFields.has(finding.fieldId)), ...model]
    .filter((finding) => { const key = fingerprint(finding); if (seen.has(key)) return false; seen.add(key); return true; });
  // Server-owned, request-scoped IDs prevent model IDs colliding with code findings.
  return merged.map((finding, index) => ({ ...finding, id: `r-${requestId}-${index + 1}` }));
}
