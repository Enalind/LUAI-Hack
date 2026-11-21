import { describe, expect, it } from "vitest";
import { changedTextSpan, highlightSegments, resolveTextSpan, validEvidenceSpans } from "../../lib/text-annotations";
import type { Finding } from "../../lib/schemas";

describe("exact phrase annotations", () => {
  it("resolves repeated phrases and Unicode without normalizing or guessing", () => {
    const text = "Återbesök 🩺 om en vecka; ny kontakt om en vecka.";
    const span = { text: "om en vecka", occurrence: 2 };
    expect(resolveTextSpan(text, span)).toEqual({ start: text.lastIndexOf(span.text), end: text.lastIndexOf(span.text) + span.text.length });
    expect(resolveTextSpan(text, { ...span, occurrence: 3 })).toBeNull();
    expect(resolveTextSpan(text, { text: "OM EN VECKA", occurrence: 1 })).toBeNull();
    expect(resolveTextSpan(text, { text: "", occurrence: 1 })).toBeNull();
  });
  it("rejects nonexistent phrases, unbound references and duplicate/out-of-range indexes", () => {
    const span = { text: "10–15 kg", occurrence: 1, referenceIndices: [0] };
    expect(validEvidenceSpans("Lyfter 10–15 kg dagligen.", 1, [span])).toBe(true);
    expect(validEvidenceSpans("Lyfter 10–15 kg dagligen.", 2, [span])).toBe(false);
    expect(validEvidenceSpans("Lyfter 10–15 kg dagligen.", 1, [{ ...span, referenceIndices: [0, 0] }])).toBe(false);
    expect(validEvidenceSpans("Lyfter 10–15 kg dagligen.", 1, [{ ...span, referenceIndices: [1] }])).toBe(false);
    expect(validEvidenceSpans("Lyfter 10–15 kg dagligen.", 1, [{ ...span, text: "15–20 kg" }])).toBe(false);
  });
  it("composes overlapping source/review ranges without changing the document", () => {
    const claim = { text: "Patienten lyfter 10–15 kg dagligen.", evidenceRefs: [{ sourceId: "a", exactQuote: "källa A" }, { sourceId: "b", exactQuote: "källa B" }],
      evidenceSpans: [{ text: "lyfter 10–15 kg", occurrence: 1, referenceIndices: [0] }, { text: "10–15 kg dagligen", occurrence: 1, referenceIndices: [1] }] };
    const finding = { id: "f1", targetSpan: { text: "10–15 kg", occurrence: 1 } } as Finding;
    const segments = highlightSegments(claim, [finding]);
    expect(segments.map((segment) => segment.text).join("")).toBe(claim.text);
    expect(segments.find((segment) => segment.text === "Patienten ")?.references).toEqual([]);
    const weight = segments.find((segment) => segment.text === "10–15 kg")!;
    expect(weight.references.map((ref) => ref.sourceId)).toEqual(["a", "b"]);
    expect(weight.findings).toEqual([finding]);
    expect(segments.find((segment) => segment.text === " dagligen")?.findings).toEqual([]);
  });
  it("ignores obsolete anchors rather than applying a highlight to different words", () => {
    const claim = { text: "Aktuell egen text.", evidenceRefs: [{ sourceId: "a", exactQuote: "källa" }], evidenceSpans: [{ text: "tidigare text", occurrence: 1, referenceIndices: [0] }] };
    expect(highlightSegments(claim)).toEqual([{ start: 0, end: claim.text.length, text: claim.text, references: [], findings: [] }]);
  });
  it("locates negation deletion in the prepared mock without marking the whole statement", () => {
    const actual = "Patienten har tappat känseln.";
    const span = changedTextSpan(actual, "Patienten uppger att hen inte har tappat känseln.");
    expect(span).toEqual({ text: "har tappat känseln.", occurrence: 1 });
    expect(resolveTextSpan(actual, span!)).toEqual({ start: actual.indexOf("har"), end: actual.length });
    expect(changedTextSpan(actual, actual)).toBeNull();
  });
});
