import type { DraftClaim, EvidenceRef, Finding } from "./schemas";

export type TextSpan = { text: string; occurrence: number };
export type EvidenceSpan = TextSpan & { referenceIndices: number[] };
export type TextRange = { start: number; end: number };

/** Resolve exact, one-based occurrences. No fuzzy or normalized matching. */
export function resolveTextSpan(text: string, span: TextSpan): TextRange | null {
  if (!span.text || !Number.isInteger(span.occurrence) || span.occurrence < 1) return null;
  let start = -span.text.length;
  for (let i = 0; i < span.occurrence; i++) {
    start = text.indexOf(span.text, start + span.text.length);
    if (start < 0) return null;
  }
  return { start, end: start + span.text.length };
}

export function validEvidenceSpans(text: string, refCount: number, spans: readonly EvidenceSpan[]): boolean {
  return (!spans.length || new Set(spans.flatMap((span) => span.referenceIndices)).size === refCount)
    && spans.every((span) => resolveTextSpan(text, span) !== null && span.referenceIndices.length > 0
    && new Set(span.referenceIndices).size === span.referenceIndices.length
    && span.referenceIndices.every((index) => Number.isInteger(index) && index >= 0 && index < refCount));
}

/** Prepared mock review only: locate changed words, including a deletion's context. */
export function changedTextSpan(actual: string, expected: string): TextSpan | null {
  if (actual === expected) return null;
  const words = [...actual.matchAll(/\S+/gu)];
  const original = [...expected.matchAll(/\S+/gu)];
  if (!words.length) return null;
  let left = 0, right = words.length, oldRight = original.length;
  while (left < right && left < oldRight && words[left][0] === original[left][0]) left++;
  while (right > left && oldRight > left && words[right - 1][0] === original[oldRight - 1][0]) { right--; oldRight--; }
  if (right === left) { left = Math.min(left, words.length - 1); right = Math.min(words.length, left + 3); }
  const start = words[left]?.index ?? 0;
  const end = words[right - 1].index + words[right - 1][0].length;
  const text = actual.slice(start, end);
  let occurrence = 1, previous = -text.length;
  while ((previous = actual.indexOf(text, previous + text.length)) < start && previous >= 0) occurrence++;
  return { text, occurrence };
}

export type HighlightSegment = TextRange & { text: string; references: EvidenceRef[]; findings: Finding[] };

/** Split intersecting annotations without dropping, duplicating or changing text. */
export function highlightSegments(claim: Pick<DraftClaim, "text" | "evidenceRefs" | "evidenceSpans">, findings: readonly Finding[] = []): HighlightSegment[] {
  const annotations = [
    ...(claim.evidenceSpans ?? []).flatMap((span) => {
      const range = resolveTextSpan(claim.text, span);
      const refs = span.referenceIndices.flatMap((index) => claim.evidenceRefs[index] ? [claim.evidenceRefs[index]] : []);
      return range && refs.length ? [{ ...range, references: refs, findings: [] as Finding[] }] : [];
    }),
    ...findings.flatMap((finding) => {
      const range = finding.targetSpan && resolveTextSpan(claim.text, finding.targetSpan);
      return range ? [{ ...range, references: [] as EvidenceRef[], findings: [finding] }] : [];
    }),
  ];
  const edges = [...new Set([0, claim.text.length, ...annotations.flatMap(({ start, end }) => [start, end])])].sort((a, b) => a - b);
  return edges.slice(0, -1).map((start, index) => {
    const end = edges[index + 1];
    const intersecting = annotations.filter((item) => item.start <= start && item.end >= end);
    const refs = intersecting.flatMap((item) => item.references);
    return { start, end, text: claim.text.slice(start, end),
      references: refs.filter((ref, i) => refs.findIndex((other) => other.sourceId === ref.sourceId && other.exactQuote === ref.exactQuote) === i),
      findings: [...new Map(intersecting.flatMap((item) => item.findings).map((finding) => [finding.id, finding])).values()],
    };
  });
}
