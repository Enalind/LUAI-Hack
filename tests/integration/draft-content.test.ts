import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { assembleDraftContent, liveDraftContentSchema } from "../../lib/server/draft-content";
import { resolveTextSpan } from "../../lib/text-annotations";

function content(parts: { text: string; referenceIndices: number[] }[]) {
  return liveDraftContentSchema.parse({ sections: ["3", "5", "6", "7"].map((fieldId) => ({ fieldId, informationGaps: [],
    claims: fieldId !== "5" ? [] : [{ id: "patient-description", fieldId, textParts: parts,
      evidenceRefs: [{ sourceId: "source-one", exactQuote: "Inte samma uppgift på morgon och kväll." }, { sourceId: "source-two", exactQuote: "En andra anteckning." }] }],
  })) });
}

describe("literal draft text assembly", () => {
  it("preserves Swedish text, whitespace, negation and punctuation while deriving exact phrase anchors", () => {
    const parts = [{ text: "Patienten uppger ", referenceIndices: [] }, { text: "inte nedsatt känsel", referenceIndices: [0, 1] }, { text: ".\nPlanerat återbesök: ", referenceIndices: [] }, { text: "om en vecka", referenceIndices: [1] }, { text: ".", referenceIndices: [] }];
    const claim = assembleDraftContent(content(parts)).sections[1].claims[0];
    expect(claim.text).toBe("Patienten uppger inte nedsatt känsel.\nPlanerat återbesök: om en vecka.");
    expect(claim.evidenceSpans).toEqual([{ text: "inte nedsatt känsel", occurrence: 1, referenceIndices: [0, 1] }, { text: "om en vecka", occurrence: 1, referenceIndices: [1] }]);
    expect(claim).not.toHaveProperty("textParts");
  });

  it("links repeated phrases to their actual occurrences and keeps different references separate", () => {
    const claim = assembleDraftContent(content([{ text: "Värk", referenceIndices: [0] }, { text: ". Värk", referenceIndices: [] }, { text: " och ", referenceIndices: [] }, { text: "Värk", referenceIndices: [1] }])).sections[1].claims[0];
    expect(claim.evidenceSpans.map(({ occurrence }) => occurrence)).toEqual([1, 3]);
    expect(claim.evidenceSpans.map((span) => resolveTextSpan(claim.text, span))).toEqual([{ start: 0, end: 4 }, { start: 15, end: 19 }]);
    expect(claim.evidenceSpans.map(({ referenceIndices }) => referenceIndices)).toEqual([[0], [1]]);
  });

  it("rejects an unrepresentable overlapping occurrence instead of pointing at different text", () => {
    expect(() => assembleDraftContent(content([{ text: "a", referenceIndices: [] }, { text: "aa", referenceIndices: [0] }]))).toThrow();
  });
});
