import "server-only";
import {
  draftDocumentSchema, providerDraftOutputSchema, providerReviewOutputSchema,
  type DraftDocument, type Finding, type SourceSnapshot,
} from "../schemas";
import { validateEvidenceReferences } from "../evidence";
import { ApplicationError } from "./errors";
import { validateSourceSnapshot } from "./source-snapshot";

function invalidOutput(): never {
  throw new ApplicationError("INVALID_MODEL_OUTPUT", "Modellsvaret kunde inte valideras. Försök igen eller kontrollera underlaget.", 502);
}

export function validateDraftOutput(snapshotValue: SourceSnapshot, raw: unknown) {
  const snapshot = validateSourceSnapshot(snapshotValue);
  const result = providerDraftOutputSchema.safeParse(raw);
  if (!result.success) invalidOutput();
  const validationFindings: Finding[] = [];
  const sections = result.data.sections.map((section) => ({
    ...section,
    claims: section.claims.map((claim, claimIndex) => {
      const { validRefs, issues } = validateEvidenceReferences(claim.evidenceRefs, snapshot);
      const missing = claim.evidenceRefs.length === 0;
      if (missing || issues.length) {
        validationFindings.push({
          id: `integrity-${section.fieldId}-${claimIndex + 1}`, category: "support_and_contradictions",
          actionType: "unsupported_or_conflicting", priority: "needs_review",
          targetClaimId: claim.id, fieldId: claim.fieldId,
          explanation: missing ? "Påståendet saknar källhänvisning." : "En källhänvisning har okänt ID eller ett citat som inte stämmer med källan.",
          evidenceRefs: [], proposedChange: null, question: null,
        });
      }
      return {
        ...claim, evidenceRefs: validRefs,
        integrityStatus: missing ? "missing" as const : issues.length ? "invalid" as const : "valid" as const,
        supportStatus: missing || issues.length ? "needs_review" as const : "unreviewed" as const,
      };
    }),
  }));
  const draft = draftDocumentSchema.parse({
    sections,
    // Copy exclusively from the clinician's immutable source, including null/empty values.
    explicitDecision: { ...snapshot.input.explicitDecision },
  });
  return { draft, validationFindings, metadata: result.data.metadata };
}

/** Reject unsafe targets or proposed references instead of allowing an applicable edit. */
export function validateReviewOutput(snapshotValue: SourceSnapshot, draftValue: DraftDocument, raw: unknown) {
  const snapshot = validateSourceSnapshot(snapshotValue);
  const draft = draftDocumentSchema.parse(draftValue);
  const result = providerReviewOutputSchema.safeParse(raw);
  if (!result.success) invalidOutput();
  const claims = new Map(draft.sections.flatMap((section) => section.claims.map((claim) => [claim.id, claim] as const)));
  for (const finding of result.data.findings) {
    if (finding.targetClaimId !== null && claims.get(finding.targetClaimId)?.fieldId !== finding.fieldId) invalidOutput();
    if (validateEvidenceReferences(finding.evidenceRefs, snapshot).issues.length) invalidOutput();
    const change = finding.proposedChange;
    if (change && validateEvidenceReferences(change.evidenceRefs, snapshot).issues.length) invalidOutput();
  }
  return result.data;
}
