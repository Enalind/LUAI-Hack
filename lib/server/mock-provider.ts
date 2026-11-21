import "server-only";
import { developmentCases } from "../../fixtures/development/cases";
import { changedTextSpan } from "../text-annotations";
import { parseClinicianAdditions } from "../clinician-additions";
import {
  draftDocumentSchema, providerDraftOutputSchema, providerReviewOutputSchema,
  type Finding, type FieldId, type ProviderDraftOutput, type ProviderMetadata, type SourceSnapshot,
} from "../schemas";
import { ApplicationError } from "./errors";
import type { CertificateProvider, ProviderReviewInput } from "./provider";
import { validateSourceSnapshot } from "./source-snapshot";
import type { FkRuleId } from "../fk-guidance";

// Exact phrases in the prepared draft, each linked to its supporting references.
const preparedSpans: Record<string, { text: string; referenceIndices: number[] }[]> = {
  "d1-occupation": [{ text: "arbetar på ett lager med orderplock och viss varumottagning", referenceIndices: [0] }, { text: "gå mellan hyllor, plocka varor till en vagn och packa order på pall", referenceIndices: [1] }],
  "d1-lifting": [{ text: "lyft av lådor på 10–15 kg", referenceIndices: [0] }, { text: "böjning mot låga hyllor och vridning", referenceIndices: [1] }, { text: "etikettering och inventering", referenceIndices: [2] }, { text: "ännu inte utvärderade", referenceIndices: [2] }],
  "d1-symptoms": [{ text: "ländryggssmärta", referenceIndices: [0] }, { text: "avbryta lyften flera gånger per dag", referenceIndices: [0] }, { text: "arbetsförsöket gjordes på onsdagen", referenceIndices: [1] }, { text: "kortare promenader och lättare vardagsaktiviteter", referenceIndices: [2] }],
  "d1-assessment-basis": [{ text: "baseras på patientens beskrivning", referenceIndices: [0] }, { text: "ingen fysisk undersökning är dokumenterad", referenceIndices: [0] }, { text: "Rörlighet, kraft och känsel är inte undersökta", referenceIndices: [1] }],
  "d1-work-assessment": [{ text: "begränsar förmågan till upprepade lyft", referenceIndices: [0] }, { text: "lättare arbetsuppgifterna behöver följas upp", referenceIndices: [1] }],
  "d1-treatment": [{ text: "Fysioterapeutisk bedömning", referenceIndices: [0] }, { text: "om en vecka", referenceIndices: [0] }, { text: "specificerad aktuell läkemedelsdos är inte dokumenterad", referenceIndices: [1] }],
  "d2-neck-pain": [{ text: "nackvärk sedan två veckor", referenceIndices: [0] }, { text: "främst på höger sida", referenceIndices: [1] }, { text: "tar emot att vrida huvudet", referenceIndices: [2] }],
  "d2-sleep": [{ text: "sämre sömn när det gör ont", referenceIndices: [0] }, { text: "Besvären varierar", referenceIndices: [1] }],
  "d3-sensation": [{ text: "inte har tappat känseln", referenceIndices: [0] }],
  "d3-pain": [{ text: "värk i höger nacke mot skulderbladet", referenceIndices: [0] }, { text: "cirka 8/10", referenceIndices: [1] }, { text: "äldre neurologiska statuset från mars", referenceIndices: [2] }],
};

const metadata: ProviderMetadata = {
  mode: "mock", modelId: "prepared-swedish-fixtures-v2", promptVersion: "mock-phrase-spans-v3",
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
  const add = (fieldId: FieldId, claimId: string, text: string, quote: string, origin: "consultation" | "clinician_assessment", extraQuotes: string[] = []) => {
    const passage = snapshot.passages.find((source) => source.origin === origin && source.text.includes(quote));
    if (!passage) throw new ApplicationError("GENERATION_FAILED", "Det förberedda exemplet saknar sin förväntade källpassage.", 422);
    const evidenceRefs = [{ sourceId: passage.id, exactQuote: quote }, ...extraQuotes.map((extra) => {
      const source = snapshot.passages.find((item) => item.text.includes(extra));
      if (!source) throw new ApplicationError("GENERATION_FAILED", "Det förberedda exemplet saknar en kompletterande källpassage.", 422);
      return { sourceId: source.id, exactQuote: extra };
    })];
    sections.find((section) => section.fieldId === fieldId)!.claims.push({ id: claimId, fieldId, text, evidenceRefs, evidenceSpans: preparedSpans[claimId].map((span) => ({ ...span, occurrence: 1 })) });
  };
  const gap = (fieldId: FieldId, question: string) => sections.find((section) => section.fieldId === fieldId)!.informationGaps.push(question);

  if (id === "D1") {
    add("3", "d1-occupation", "Patienten uppger att hen arbetar på ett lager med orderplock och viss varumottagning. Arbetet innebär att gå mellan hyllor, plocka varor till en vagn och packa order på pall.", "Jag arbetar på ett lager.", "consultation", ["Sedan går jag mellan hyllorna med en vagn"]);
    add("3", "d1-lifting", "Patienten uppger återkommande lyft av lådor på 10–15 kg under arbetspasset, med böjning mot låga hyllor och vridning mellan hylla och vagn. Enligt patienten har arbetsledaren erbjudit etikettering och inventering; dessa anpassade uppgifter är ännu inte utvärderade under ett helt pass.", "Jag lyfter lådor på 10–15 kg upprepade gånger under arbetspasset.", "consultation", ["Jag måste böja mig för de nedersta och vrida mig mellan vagnen och hyllan.", "Det finns etikettering vid ett högt bord och inventering med handdatorn."]);
    add("5", "d1-symptoms", "Patienten beskriver ländryggssmärta som gör att hen måste avbryta lyften flera gånger per dag. Patienten uppger att arbetsförsöket gjordes på onsdagen och att kortare promenader och lättare vardagsaktiviteter fungerar.", "Smärtan i ländryggen gör att jag måste avbryta lyften flera gånger per dag.", "consultation", ["Bara att jag försökte i onsdags och inte i tisdags", "Jag går ut en kort sväng ett par gånger om dagen."]);
    add("5", "d1-assessment-basis", "Läkarens bedömning baseras på patientens beskrivning; ingen fysisk undersökning är dokumenterad. Rörlighet, kraft och känsel är inte undersökta vid distanskontakten.", "Bedömningen baseras på patientens beskrivning; ingen fysisk undersökning dokumenteras.", "clinician_assessment", ["Ingen dokumenterad fysisk undersökning av rörlighet, reflexer, sensibilitet eller kraft."]);
    add("6", "d1-work-assessment", "Läkaren bedömer att ländryggssmärtan begränsar förmågan till upprepade lyft i nuläget. Bedömningen bygger på patientens berättelse; utfallet av de erbjudna lättare arbetsuppgifterna behöver följas upp.", "Min bedömning är att ländryggssmärtan begränsar förmågan till upprepade lyft i nuläget.", "clinician_assessment", ["Uppföljning av hur erbjudna lättare uppgifter fungerar."]);
    add("7", "d1-treatment", "Fysioterapeutisk bedömning planeras om en vecka. Någon specificerad aktuell läkemedelsdos är inte dokumenterad.", "Fysioterapeutisk bedömning planeras om en vecka.", "clinician_assessment", ["Ingen specificerad läkemedelsdos dokumenterad."]);
  } else {
    gap("3", "Vilket yrke och vilka konkreta arbetsuppgifter har patienten?");
    gap("6", "Vilka begränsningar bedömer läkaren i relation till patientens arbetsuppgifter, och på vilken grund?");
    gap("7", "Vilken pågående eller planerad behandling är dokumenterad?");
    if (id === "D2") {
      add("5", "d2-neck-pain", "Patienten uppger nackvärk sedan två veckor, främst på höger sida, med varierande intensitet och stelhet efter stillasittande. Patienten beskriver att det tar emot att vrida huvudet; rörelseomfånget har inte mätts.", "Jag har haft värk i nacken i två veckor.", "consultation", ["Från nedanför hårfästet och en bit ner mot axlarna. Mest på höger sida", "Det tar emot och jag stannar."]);
      add("5", "d2-sleep", "Patienten uppger sämre sömn när det gör ont, med uppvaknanden vid lägesändring vissa nätter. Besvären varierar och någon säker orsak till variationen anges inte.", "Jag sover sämre när det gör ont.", "consultation", ["Natten till igår var faktiskt bättre."]);
      gap("5", "Vilka fynd eller andra uppgifter ligger till grund för läkarens bedömning utöver patientens beskrivning?");
    } else {
      add("5", "d3-sensation", "Patienten uppger att hen inte har tappat känseln.", "Jag har inte tappat känseln.", "consultation");
      add("5", "d3-pain", "Patienten beskriver värk i höger nacke mot skulderbladet med ungefärlig debut kring helgen. Vid smärtande vridning skattar patienten cirka 8/10, med mindre värk i vila. Det är patientuppgifter, inte undersökningsfynd. Det äldre neurologiska statuset från mars avser en annan kontakt.", "Jag har ont på höger sida av nacken och ner mot skulderbladet.", "consultation", ["När det hugger till, kanske åtta.", "Anteckningen avser mars 2026 och en annan kontaktorsak."]);
      gap("5", "Vad svarade patienten på frågan om svaghet, och finns dokumenterade undersökningsfynd?");
    }
  }
  const citedAdditions = new Set<string>();
  for (const [index, addition] of additions.entries()) {
    const passage = snapshot.passages.find((item) => item.origin === "clinician_assessment" && item.text === addition.sourceLine && !citedAdditions.has(item.id))!;
    citedAdditions.add(passage.id);
    const section = sections.find(({ fieldId }) => fieldId === addition.fieldId)!;
    section.claims.push({ id: `clinician-addition-${addition.fieldId}-${index + 1}`, fieldId: addition.fieldId,
      text: `Läkarens komplettering: ${addition.text}`, evidenceSpans: [{ text: addition.text, occurrence: 1, referenceIndices: [0] }], evidenceRefs: [{ sourceId: passage.id, exactQuote: passage.text }] });
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
    return providerReviewOutputSchema.parse({ findings: findings.map((finding) => {
      const claim = draft.sections.flatMap((section) => section.claims).find((item) => item.id === finding.targetClaimId);
      const expected = prepared.sections.flatMap((section) => section.claims).find((item) => item.id === finding.targetClaimId);
      // Demonstrate source links without claiming that prepared fixtures performed an FK review.
      const rule: Record<FieldId, FkRuleId> = { "3": "fk3-occupation", "5": "fk5-basis", "6": "fk6-activity", "7": "fk7-treatment" };
      return { ...finding, guidelineRuleIds: [rule[finding.fieldId]], targetSpan: claim ? changedTextSpan(claim.text, expected?.text ?? "") : null };
    }), metadata: { ...metadata } });
  }
}
