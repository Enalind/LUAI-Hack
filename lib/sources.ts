import { DECISION_FIELDS, type SourceInput, type SourcePassage } from "./schemas";

/** Keep original line strings, including spaces; do not collapse identical lines. */
export function segmentSourceText(text: string): string[] {
  return text.split(/\r\n|\n|\r/).filter((line) => line.trim().length > 0);
}

export function buildSourcePassages(snapshotId: string, input: SourceInput): SourcePassage[] {
  const passages: SourcePassage[] = [];
  const append = (text: string, origin: "consultation" | "clinician_assessment") => {
    segmentSourceText(text).forEach((line, index) => {
      passages.push({
        id: `${snapshotId}:${origin}:${index + 1}`,
        origin, text: line, decisionField: null,
      });
    });
  };
  append(input.consultationText, "consultation");
  append(input.clinicianAssessmentText, "clinician_assessment");
  for (const material of input.referenceMaterials ?? []) {
    segmentSourceText(material.text).forEach((line, index) => passages.push({
      id: `${snapshotId}:material:${material.id}:${index + 1}`,
      origin: material.type === "assessment" ? "clinician_assessment" : material.type === "consultation" ? "consultation" : "reference_material",
      text: line, decisionField: null, materialId: material.id, materialTitle: material.title, materialType: material.type,
    }));
  }
  for (const field of DECISION_FIELDS) {
    const value = input.explicitDecision[field];
    if (value === null || (typeof value === "string" && !value.trim())) continue;
    passages.push({
      id: `${snapshotId}:clinician_decision:${field}`,
      origin: "clinician_decision",
      text: String(value),
      decisionField: field,
    });
  }
  return passages;
}
