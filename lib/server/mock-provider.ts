import "server-only";
import { developmentCases } from "../../fixtures/development/cases";
import { parseClinicianAdditions } from "../clinician-additions";
import {
  draftDocumentSchema, providerDraftOutputSchema, providerReviewOutputSchema,
  type Finding, type FieldId, type ProviderDraftOutput, type ProviderMetadata, type SourceSnapshot,
} from "../schemas";
import { ApplicationError } from "./errors";
import type { CertificateProvider, ProviderReviewInput } from "./provider";
import { validateSourceSnapshot } from "./source-snapshot";

const metadata: ProviderMetadata = {
  mode: "mock", modelId: "prepared-swedish-fixtures-v1", promptVersion: "mock-templates-v1",
  latencyMs: 0, usage: null,
};

function fixtureData(snapshot: SourceSnapshot) {
  const fixture = developmentCases.find(({ input }) => input.consultationText === snapshot.input.consultationText
    && (input.clinicianAssessmentText === snapshot.input.clinicianAssessmentText || parseClinicianAdditions(
      input.clinicianAssessmentText ? snapshot.input.clinicianAssessmentText.startsWith(input.clinicianAssessmentText + "\n")
        ? snapshot.input.clinicianAssessmentText.slice(input.clinicianAssessmentText.length + 1) : "invalid"
        : snapshot.input.clinicianAssessmentText,
    ) !== null));
  if (!fixture) {
    throw new ApplicationError("GENERATION_FAILED", "Mock-läget saknar ett förberett svar för detta underlag. Välj ett oförändrat fiktivt exempel.", 422);
  }
  const suffix = snapshot.input.clinicianAssessmentText.slice(fixture.input.clinicianAssessmentText.length + (fixture.input.clinicianAssessmentText ? 1 : 0));
  return { id: fixture.id, additions: snapshot.input.clinicianAssessmentText === fixture.input.clinicianAssessmentText ? [] : parseClinicianAdditions(suffix)! };
}

function preparedDraft(snapshot: SourceSnapshot): ProviderDraftOutput {
  const { id, additions } = fixtureData(snapshot);
  const sections: ProviderDraftOutput["sections"] = ["3", "5", "6", "7"].map((fieldId) => ({
    fieldId: fieldId as FieldId, claims: [], informationGaps: [],
  }));
  const add = (fieldId: FieldId, claimId: string, text: string, origin: "consultation" | "clinician_assessment", index: number) => {
    const passage = snapshot.passages.filter((source) => source.origin === origin)[index];
    sections.find((section) => section.fieldId === fieldId)!.claims.push({
      id: claimId, fieldId, text, evidenceRefs: [{ sourceId: passage.id, exactQuote: passage.text }],
    });
  };
  const gap = (fieldId: FieldId, question: string) => sections.find((section) => section.fieldId === fieldId)!.informationGaps.push(question);

  if (id === "D1") {
    add("3", "d1-occupation", "Patienten uppger att hen arbetar på ett lager.", "consultation", 0);
    add("3", "d1-lifting", "Patienten uppger återkommande lyft av lådor på 10–15 kg under arbetspasset.", "consultation", 1);
    add("5", "d1-symptoms", "Patienten beskriver ländryggssmärta som gör att hen måste avbryta lyften flera gånger per dag.", "consultation", 2);
    add("5", "d1-assessment-basis", "Läkarens bedömning baseras på patientens beskrivning; ingen fysisk undersökning är dokumenterad.", "clinician_assessment", 0);
    add("6", "d1-work-assessment", "Läkaren bedömer att ländryggssmärtan begränsar förmågan till upprepade lyft i nuläget.", "clinician_assessment", 0);
    add("7", "d1-treatment", "Fysioterapeutisk bedömning planeras om en vecka.", "clinician_assessment", 1);
  } else {
    gap("3", "Vilket yrke och vilka konkreta arbetsuppgifter har patienten?");
    gap("6", "Vilka begränsningar bedömer läkaren i relation till patientens arbetsuppgifter, och på vilken grund?");
    gap("7", "Vilken pågående eller planerad behandling är dokumenterad?");
    if (id === "D2") {
      add("5", "d2-neck-pain", "Patienten uppger nackvärk sedan två veckor.", "consultation", 0);
      add("5", "d2-sleep", "Patienten uppger sämre sömn när det gör ont.", "consultation", 1);
      gap("5", "Vilka fynd eller andra uppgifter ligger till grund för läkarens bedömning utöver patientens beskrivning?");
    } else {
      add("5", "d3-sensation", "Patienten uppger att hen inte har tappat känseln.", "consultation", 0);
      gap("5", "Vad svarade patienten på frågan om svaghet, och finns dokumenterade undersökningsfynd?");
    }
  }
  const citedAdditions = new Set<string>();
  for (const [index, addition] of additions.entries()) {
    const passage = snapshot.passages.find((item) => item.origin === "clinician_assessment" && item.text === addition.sourceLine && !citedAdditions.has(item.id))!;
    citedAdditions.add(passage.id);
    const section = sections.find(({ fieldId }) => fieldId === addition.fieldId)!;
    section.claims.push({ id: `clinician-addition-${addition.fieldId}-${index + 1}`, fieldId: addition.fieldId,
      text: `Läkarens komplettering: ${addition.text}`, evidenceRefs: [{ sourceId: passage.id, exactQuote: passage.text }] });
    section.informationGaps = [];
  }
  return providerDraftOutputSchema.parse({ sections, metadata });
}

function categoryForField(fieldId: FieldId): Finding["category"] {
  return { "3": "work_tasks", "5": "assessment_basis", "6": "work_relationship", "7": "support_and_contradictions" }[fieldId] as Finding["category"];
}

/** Prepared, deterministic demonstration only; this does not perform semantic review. */
export class MockProvider implements CertificateProvider {
  async draft(value: SourceSnapshot) {
    return preparedDraft(validateSourceSnapshot(value));
  }

  async review({ snapshot: value, draft: draftValue }: ProviderReviewInput) {
    const snapshot = validateSourceSnapshot(value);
    const draft = draftDocumentSchema.parse(draftValue);
    const prepared = preparedDraft(snapshot);
    const findings: Finding[] = [];
    for (const section of prepared.sections) {
      const current = draft.sections.find(({ fieldId }) => fieldId === section.fieldId)!;
      for (const [index, question] of section.informationGaps.entries()) {
        findings.push({
          id: `gap-${section.fieldId}-${index + 1}`,
          category: categoryForField(section.fieldId), actionType: "source_information_missing", priority: "clarification",
          fieldId: section.fieldId, targetClaimId: null,
          explanation: "Denna information finns inte i det förberedda underlaget och behöver förtydligas av läkaren.",
          evidenceRefs: [], proposedChange: null, question,
        });
      }
      for (const expected of section.claims) {
        if (current.claims.some((claim) => claim.text === expected.text)) continue;
        const changed = current.claims.find((claim) => claim.id === expected.id);
        findings.push({
          id: `prepared-${expected.id}`, category: expected.id === "d3-sensation" ? "support_and_contradictions" : categoryForField(section.fieldId),
          actionType: changed ? "unsupported_or_conflicting" : "available_but_missing", priority: "needs_review",
          fieldId: section.fieldId, targetClaimId: changed?.id ?? null,
          explanation: changed ? "Formuleringen avviker från den källanknutna uppgiften i det förberedda exemplet." : "En relevant uppgift finns i källan men saknas i detta intygsfält.",
          evidenceRefs: expected.evidenceRefs,
          proposedChange: changed
            ? { operation: "replace", targetClaimId: changed.id, text: expected.text, evidenceRefs: expected.evidenceRefs }
            : { operation: "add", targetClaimId: null, text: expected.text, evidenceRefs: expected.evidenceRefs },
          question: null,
        });
      }
      for (const claim of current.claims) {
        if (section.claims.some((expected) => expected.id === claim.id || expected.text === claim.text)) continue;
        findings.push({
          id: `extra-${section.fieldId}-${findings.length + 1}`, category: categoryForField(section.fieldId),
          actionType: "unsupported_or_conflicting", priority: "needs_review", fieldId: section.fieldId,
          targetClaimId: claim.id, explanation: "Det förberedda exemplet ger inte stöd för detta tillagda påstående. En obesvarad fråga är inget undersökningsfynd.",
          evidenceRefs: [], proposedChange: { operation: "delete", targetClaimId: claim.id, text: null, evidenceRefs: [] }, question: null,
        });
      }
    }
    return providerReviewOutputSchema.parse({ findings, metadata: { ...metadata } });
  }
}
