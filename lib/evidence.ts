import type { EvidenceRef, SourceSnapshot } from "./schemas";

export type ReferenceIssue = {
  index: number;
  code: "UNKNOWN_SOURCE" | "EMPTY_QUOTE" | "QUOTE_MISMATCH";
};

/** String matching establishes reference integrity, never clinical support. */
export function validateEvidenceReferences(
  refs: readonly EvidenceRef[],
  snapshot: SourceSnapshot,
): { validRefs: EvidenceRef[]; issues: ReferenceIssue[] } {
  const passages = new Map(snapshot.passages.map((passage) => [passage.id, passage.text]));
  const validRefs: EvidenceRef[] = [];
  const issues: ReferenceIssue[] = [];
  refs.forEach((ref, index) => {
    if (!ref.exactQuote.trim()) {
      issues.push({ index, code: "EMPTY_QUOTE" });
    } else if (!passages.has(ref.sourceId)) {
      issues.push({ index, code: "UNKNOWN_SOURCE" });
    } else if (!passages.get(ref.sourceId)!.includes(ref.exactQuote)) {
      issues.push({ index, code: "QUOTE_MISMATCH" });
    } else {
      validRefs.push({ ...ref });
    }
  });
  return { validRefs, issues };
}
