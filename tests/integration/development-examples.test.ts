import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { developmentCases } from "../../fixtures/development/cases";
import { lookupDiagnosisCode, validateDiagnosisCode } from "../../lib/server/diagnosis-codes";
import { createSourceSnapshot } from "../../lib/server/source-snapshot";
import { MockProvider } from "../../lib/server/mock-provider";
import { validateEvidenceReferences } from "../../lib/evidence";

describe("long fictional example sources", () => {
  it.each(developmentCases)("keeps $id realistic in size, sourced and aligned with the official codebook", async (fixture) => {
    const { consultationText, referenceMaterials = [], explicitDecision } = fixture.input;
    expect(consultationText.split(/\s+/).length).toBeGreaterThan(1200);
    expect(consultationText.split("\n").length).toBeGreaterThanOrEqual(55);
    expect(consultationText).toMatch(/^\[00:00\] Läkare:/);
    expect(consultationText).toContain("] Patient:");
    expect(referenceMaterials).toHaveLength(2);
    expect(referenceMaterials.every((material) => material.type === "journal" && material.text.length > 400)).toBe(true);
    expect(() => validateDiagnosisCode(explicitDecision.diagnosisCode)).not.toThrow();
    expect(lookupDiagnosisCode(explicitDecision.diagnosisCode!)?.selectable).toBe(true);
    expect(referenceMaterials.some((material) => material.text.includes(explicitDecision.diagnosisCode!))).toBe(true);
    const snapshot = createSourceSnapshot(fixture.id, fixture.input);
    const draft = await new MockProvider().draft(snapshot);
    for (const claim of draft.sections.flatMap((section) => section.claims)) {
      expect(validateEvidenceReferences(claim.evidenceRefs, snapshot).issues).toEqual([]);
      expect(claim.evidenceRefs.length).toBeGreaterThan(0);
    }
    if (fixture.id === "D1" || fixture.id === "D3") expect(draft.sections.flatMap((section) => section.claims).some((claim) => claim.evidenceRefs.some((ref) => snapshot.passages.find((passage) => passage.id === ref.sourceId)?.origin === "reference_material"))).toBe(true);
  });
});
