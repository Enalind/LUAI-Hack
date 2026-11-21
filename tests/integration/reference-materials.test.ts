import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { sourceInputSchema, draftResponseSchema } from "../../lib/schemas";
import { emptySourceInput } from "../../lib/workspace-state";
import { createSourceSnapshot, validateSourceSnapshot } from "../../lib/server/source-snapshot";
import { refreshDraftSources } from "../../lib/revisions";
import { MockProvider } from "../../lib/server/mock-provider";
import { validateDraftOutput } from "../../lib/server/provider-output";
import { developmentCases } from "../../fixtures/development/cases";

it("accepts typed material without legacy inputs and preserves the exact text, title and origin", () => {
  const input = { ...emptySourceInput(), referenceMaterials: [
    { id: "lab-1", type: "lab", title: "Provsvar 20 november", text: "  Fiktivt resultat.\nAndra raden." },
    { id: "assessment-1", type: "assessment", title: "Min bedömning", text: "Läkaren bedömer begränsad rörlighet." },
  ] };
  const snapshot = createSourceSnapshot("custom", input);
  expect(snapshot.passages).toHaveLength(3);
  expect(snapshot.passages[0]).toMatchObject({ materialId: "lab-1", materialType: "lab", materialTitle: "Provsvar 20 november", text: "  Fiktivt resultat.", origin: "reference_material" });
  expect(snapshot.passages[2].origin).toBe("clinician_assessment");
  expect(validateSourceSnapshot(JSON.parse(JSON.stringify(snapshot)))).toEqual(snapshot);
  expect(sourceInputSchema.safeParse({ ...input, referenceMaterials: [input.referenceMaterials[0], input.referenceMaterials[0]] }).success).toBe(false);
  expect(sourceInputSchema.safeParse({ ...input, referenceMaterials: [{ ...input.referenceMaterials[0], id: "a".repeat(65) }] }).success).toBe(false);
  expect(sourceInputSchema.safeParse({ ...input, referenceMaterials: [{ ...input.referenceMaterials[0], text: " " }] }).success).toBe(false);
  expect(sourceInputSchema.safeParse({ ...input, referenceMaterials: input.referenceMaterials.map((item) => ({ ...item, text: "a".repeat(30000) })), consultationText: "extra" }).success).toBe(false);
});

it("retargets unchanged material by document identity after reordering", async () => {
  const referenceMaterials = [{ id: "journal-1", type: "journal" as const, title: "Journal", text: "Fiktiv historik." }, { id: "lab-1", type: "lab" as const, title: "Provsvar", text: "Fiktivt provsvar." }];
  const first = createSourceSnapshot("D1", { ...developmentCases[0].input, referenceMaterials: [...developmentCases[0].input.referenceMaterials!, ...referenceMaterials] });
  const validated = validateDraftOutput(first, await new MockProvider().draft(first));
  const result = draftResponseSchema.parse({ ...validated, snapshot: first, sourceRevision: 0, draftRevision: 0, requestId: crypto.randomUUID() });
  const passage = first.passages.find((item) => item.materialId === "lab-1")!;
  result.draft.sections[0].claims[0].evidenceRefs = [{ sourceId: passage.id, exactQuote: passage.text }];
  const next = createSourceSnapshot("D1", { ...first.input, sourceRevision: 1, referenceMaterials: [...first.input.referenceMaterials!].reverse() });
  const refreshed = refreshDraftSources(result, next);
  expect(refreshed.draft.sections[0].claims[0].evidenceRefs[0].sourceId).toBe(next.passages.find((item) => item.materialId === "lab-1")!.id);
  expect(refreshed.draft.sections[0].claims[0].text).toBe(result.draft.sections[0].claims[0].text);
});
