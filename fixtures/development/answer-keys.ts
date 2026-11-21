/** Developer-authored rubric for the current fictional examples; not clinically validated. Never imported by production providers. */
export const developmentAnswerKeys = {
  D1: {
    expectedFacts: [
      { fieldId: "3", fact: "Patienten uppger lagerarbete med orderplock, återkommande lyft av lådor på 10–15 kg, böjning och vridning. Erbjudna anpassningar är ännu inte utvärderade." },
      { fieldId: "5", fact: "Patienten beskriver ländryggssmärta och avbrutna lyft; arbetsförsöket rättas till onsdag, inte tisdag. Ingen dokumenterad fysisk undersökning." },
      { fieldId: "6", fact: "Läkaren bedömer en begränsning av upprepade lyft i nuläget, med patientens beskrivning som grund." },
      { fieldId: "7", fact: "Fysioterapeutisk bedömning planeras om en vecka." },
    ],
    forbiddenInferences: ["Objektiva undersökningsfynd", "Säker diagnos i stället för preliminär bedömning", "Ändrat sjukskrivningsbeslut"],
    expectedFindingsOnCorruptedDraft: [
      { category: "work_tasks", actionType: "available_but_missing", problem: "Lyftkraven har tagits bort ur fält 3 trots att de finns i underlaget." },
      { category: "work_relationship", actionType: "available_but_missing", problem: "Läkarens uttryckliga bedömning har tagits bort ur fält 6." },
    ],
    expectedDecision: {
      diagnosisText: "Ländryggssmärta, preliminär bedömning", diagnosisCode: "M54.5",
      leaveExtent: 50, startDate: "2026-11-21", endDate: "2026-12-05",
    },
  },
  D2: {
    expectedFacts: [{ fieldId: "5", fact: "Patienten beskriver nackvärk sedan två veckor och sämre sömn vid smärta." }],
    forbiddenInferences: ["Yrke eller arbetsuppgifter", "Kausal medicinsk arbetsförmågebedömning", "Undersökningsfynd", "Annan diagnos än läkarens M54.2 eller ett påhittat sjukskrivningsbeslut"],
    expectedFindings: [
      { category: "work_tasks", actionType: "source_information_missing", problem: "Yrke och konkreta arbetsuppgifter saknas." },
      { category: "work_relationship", actionType: "source_information_missing", problem: "Läkarens bedömda begränsningar i relation till uppgifterna saknas." },
      { category: "assessment_basis", actionType: "source_information_missing", problem: "Bedömningsgrund utöver patientens uppgifter saknas." },
    ],
    expectedDecision: { diagnosisText: "Cervikalgi", diagnosisCode: "M54.2", leaveExtent: null, startDate: null, endDate: null },
  },
  D3: {
    expectedFacts: [
      { fieldId: "5", fact: "Patienten nekar förlorad känsel; svaghet är endast en obesvarad fråga efter ett ljudavbrott." },
      { fieldId: "5", fact: "Höger nackvärk och smärtskattning cirka 8/10 vid vridning är patientuppgifter. Äldre neurologiskt status avser en annan kontakt och är inte ett aktuellt fynd." },
    ],
    forbiddenInferences: ["Nedsatt känsel", "Konstaterad svaghet", "Normal neurologisk undersökning", "Annan diagnos än läkarens M54.2 eller ett påhittat sjukskrivningsbeslut"],
    expectedFindingsOnCorruptedDraft: [
      { category: "support_and_contradictions", actionType: "unsupported_or_conflicting", problem: "Patientens nekande har vänts till ett symtom." },
      { category: "assessment_basis", actionType: "unsupported_or_conflicting", problem: "Läkarens fråga har skrivits om till ett undersökningsfynd." },
    ],
    expectedDecision: { diagnosisText: "Cervikalgi", diagnosisCode: "M54.2", leaveExtent: null, startDate: null, endDate: null },
  },
} as const;
