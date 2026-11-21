import { sourceInputSchema, type SourceInput } from "../../lib/schemas";
import D1 from "./D1.json";
import D2 from "./D2.json";
import D3 from "./D3.json";

export type DevelopmentCase = {
  id: "D1" | "D2" | "D3";
  label: string;
  fictional: true;
  input: SourceInput;
};

/** The example selector and tests use the same canonical, fictional JSON cases. */
export const developmentCases: DevelopmentCase[] = [D1, D2, D3].map((fixture) => ({
  id: fixture.id as DevelopmentCase["id"], label: fixture.title, fictional: true,
  input: sourceInputSchema.parse({
    consultationText: fixture.consultationText,
    clinicianAssessmentText: fixture.clinicianAssessmentText,
    explicitDecision: fixture.explicitDecision, sourceRevision: fixture.sourceRevision,
    referenceMaterials: fixture.journalEntries.map((entry) => ({ id: entry.id, type: "journal", title: entry.title, text: entry.text })),
  }),
}));
