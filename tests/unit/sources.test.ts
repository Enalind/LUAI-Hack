import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { developmentCases } from "../../fixtures/development/cases";
import { validateEvidenceReferences } from "../../lib/evidence";
import { sourceSnapshotSchema } from "../../lib/schemas";
import { segmentSourceText } from "../../lib/sources";
import { createSourceSnapshot, validateSourceSnapshot } from "../../lib/server/source-snapshot";

describe("source snapshots and reference integrity", () => {
  const original = developmentCases[1].input;

  it("segments exact Swedish lines without trimming or merging identical passages", () => {
    const text = "  Patient: Återkommande smärta.  \r\n\r\nPatient: Ömhet.\nPatient: Ömhet.\rFråga: När?\n";
    expect(segmentSourceText(text)).toEqual(["  Patient: Återkommande smärta.  ", "Patient: Ömhet.", "Patient: Ömhet.", "Fråga: När?"]);
    const snapshot = createSourceSnapshot("duplicate-lines", { ...original, consultationText: text });
    expect(snapshot.input.consultationText).toBe(text);
    expect(snapshot.passages[1].id).not.toBe(snapshot.passages[2].id);
    const secondDuplicate = { sourceId: snapshot.passages[2].id, exactQuote: "Patient: Ömhet." };
    expect(validateEvidenceReferences([secondDuplicate], snapshot)).toEqual({ validRefs: [secondDuplicate], issues: [] });
  });

  it("assigns repeatable IDs for the same case/revision/content and changes scope on any source change", () => {
    const snapshot = createSourceSnapshot("D2", original);
    expect(createSourceSnapshot("D2", original)).toEqual(snapshot);
    expect(createSourceSnapshot("other-case", original).id).not.toBe(snapshot.id);
    expect(createSourceSnapshot("D2", { ...original, sourceRevision: 1 }).id).not.toBe(snapshot.id);
    expect(createSourceSnapshot("D2", { ...original, consultationText: `${original.consultationText} ` }).id).not.toBe(snapshot.id);
    expect(createSourceSnapshot("D2", { ...original, explicitDecision: { ...original.explicitDecision, leaveExtent: 25 } }).id).not.toBe(snapshot.id);
  });

  it("copies and deeply freezes the source instead of retaining mutable caller objects", () => {
    const input = structuredClone(original);
    const snapshot = createSourceSnapshot("D2", input);
    input.consultationText = "Ändrat efter skapandet.";
    input.explicitDecision.diagnosisText = "Ny text.";
    expect(snapshot.input.consultationText).toBe(original.consultationText);
    expect(snapshot.input.explicitDecision.diagnosisText).toBeNull();
    expect(Object.isFrozen(snapshot.passages[0])).toBe(true);
    expect(() => Object.assign(snapshot.input.explicitDecision, { leaveExtent: 100 })).toThrow(TypeError);
    expect(() => Object.assign(snapshot.passages, { 0: {} })).toThrow(TypeError);
  });

  it("creates decision passages only for supplied values and preserves exact wording", () => {
    const snapshot = createSourceSnapshot("D1", { ...original, explicitDecision: { diagnosisText: "  Möjligen ländryggssmärta?\nEj säker.  ", diagnosisCode: "", leaveExtent: 25, startDate: "2026-11-21", endDate: null } });
    expect(snapshot.passages.filter(({ origin }) => origin === "clinician_decision").map(({ decisionField, text }) => [decisionField, text])).toEqual([
      ["diagnosisText", "  Möjligen ländryggssmärta?\nEj säker.  "], ["leaveExtent", "25"], ["startDate", "2026-11-21"],
    ]);
    expect(createSourceSnapshot("D2", original).passages.every(({ origin }) => origin !== "clinician_decision")).toBe(true);
  });

  it("reconstructs round-tripped snapshots and rejects altered IDs, passages, input or revision", () => {
    const snapshot = createSourceSnapshot("D2", original);
    expect(validateSourceSnapshot(JSON.parse(JSON.stringify(snapshot)))).toEqual(snapshot);
    for (const mutate of [
      (copy: ReturnType<typeof sourceSnapshotSchema.parse>) => { copy.passages[0].text = "Ändrat citat."; },
      (copy: ReturnType<typeof sourceSnapshotSchema.parse>) => { copy.passages[0].id = "model-generated-source"; },
      (copy: ReturnType<typeof sourceSnapshotSchema.parse>) => { copy.input.consultationText = "Annat underlag."; },
      (copy: ReturnType<typeof sourceSnapshotSchema.parse>) => { copy.sourceRevision = 5; },
      (copy: ReturnType<typeof sourceSnapshotSchema.parse>) => { copy.caseId = "other-case"; },
    ]) {
      const copy = sourceSnapshotSchema.parse(snapshot);
      mutate(copy);
      expect(() => validateSourceSnapshot(copy)).toThrow();
    }
  });

  it("matches nonempty exact quotes against the specified passage without normalization", () => {
    const snapshot = createSourceSnapshot("D2", original);
    const passage = snapshot.passages[0];
    const valid = { sourceId: passage.id, exactQuote: "värk i nacken" };
    const { validRefs, issues } = validateEvidenceReferences([
      valid,
      { sourceId: passage.id, exactQuote: "Värk i nacken" },
      { sourceId: passage.id, exactQuote: snapshot.passages[1].text },
      { sourceId: passage.id, exactQuote: "" },
      { sourceId: passage.id, exactQuote: " \n" },
      { sourceId: "invented-source", exactQuote: valid.exactQuote },
    ], snapshot);
    expect(validRefs).toEqual([valid]);
    expect(issues.map(({ code }) => code)).toEqual(["QUOTE_MISMATCH", "QUOTE_MISMATCH", "EMPTY_QUOTE", "EMPTY_QUOTE", "UNKNOWN_SOURCE"]);
  });

  it("rejects references from another case or an older source snapshot, even with identical text", () => {
    const snapshot = createSourceSnapshot("D2", original);
    const others = [createSourceSnapshot("other-case", original), createSourceSnapshot("D2", { ...original, sourceRevision: 1 })];
    for (const other of others) {
      const foreignRef = { sourceId: other.passages[0].id, exactQuote: other.passages[0].text };
      expect(validateEvidenceReferences([foreignRef], snapshot).issues[0].code).toBe("UNKNOWN_SOURCE");
    }
  });

  it("retains conflicting statements and validates their references without choosing a clinical truth", () => {
    const snapshot = createSourceSnapshot("conflict", { ...original, consultationText: "Patient: Jag klarar att lyfta 10 kg.\nPatient: Jag klarar inte att lyfta 10 kg." });
    expect(snapshot.passages).toHaveLength(2);
    expect(validateEvidenceReferences(snapshot.passages.map(({ id, text }) => ({ sourceId: id, exactQuote: text })), snapshot).issues).toEqual([]);
    expect(snapshot.passages[1].text).toContain("inte");
  });
});
