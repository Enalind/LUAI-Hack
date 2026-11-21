/** Human-written before mock templates; never imported by production providers. */
export const developmentAnswerKeys = {
  D1: {
    expectedFacts: [
      { fieldId: "3", fact: "Patienten uppger lagerarbete med återkommande lyft av lådor på 10–15 kg." },
      { fieldId: "5", fact: "Patienten beskriver ländryggssmärta och avbrutna lyft; ingen dokumenterad fysisk undersökning." },
      { fieldId: "6", fact: "Läkaren bedömer en begränsning av upprepade lyft i nuläget, med patientens beskrivning som grund." },
      { fieldId: "7", fact: "Fysioterapeutisk bedömning planeras om en vecka." },
    ],
    forbiddenInferences: ["Objektiva undersökningsfynd", "Säker diagnos i stället för preliminär bedömning", "Ändrat sjukskrivningsbeslut"],
    expectedFindingsOnCorruptedDraft: [
      { category: "work_tasks", actionType: "available_but_missing", problem: "Lyftkraven har tagits bort ur fält 3 trots att de finns i underlaget." },
      { category: "work_relationship", actionType: "available_but_missing", problem: "Läkarens uttryckliga bedömning har tagits bort ur fält 6." },
    ],
    expectedDecision: {
      diagnosisText: "Ländryggssmärta, preliminär bedömning", diagnosisCode: null,
      leaveExtent: 50, startDate: "2026-11-21", endDate: "2026-12-05",
    },
  },
  D2: {
    expectedFacts: [{ fieldId: "5", fact: "Patienten beskriver nackvärk sedan två veckor och sämre sömn vid smärta." }],
    forbiddenInferences: ["Yrke eller arbetsuppgifter", "Kausal medicinsk arbetsförmågebedömning", "Undersökningsfynd", "Diagnos eller sjukskrivningsbeslut"],
    expectedFindings: [
      { category: "work_tasks", actionType: "source_information_missing", problem: "Yrke och konkreta arbetsuppgifter saknas." },
      { category: "work_relationship", actionType: "source_information_missing", problem: "Läkarens bedömda begränsningar i relation till uppgifterna saknas." },
      { category: "assessment_basis", actionType: "source_information_missing", problem: "Bedömningsgrund utöver patientens uppgifter saknas." },
    ],
    expectedDecision: { diagnosisText: null, diagnosisCode: null, leaveExtent: null, startDate: null, endDate: null },
  },
  D3: {
    expectedFacts: [{ fieldId: "5", fact: "Patienten nekar förlorad känsel; svaghet är endast en obesvarad fråga." }],
    forbiddenInferences: ["Nedsatt känsel", "Konstaterad svaghet", "Normal neurologisk undersökning", "Diagnos eller sjukskrivningsbeslut"],
    expectedFindingsOnCorruptedDraft: [
      { category: "support_and_contradictions", actionType: "unsupported_or_conflicting", problem: "Patientens nekande har vänts till ett symtom." },
      { category: "assessment_basis", actionType: "unsupported_or_conflicting", problem: "Läkarens fråga har skrivits om till ett undersökningsfynd." },
    ],
    expectedDecision: { diagnosisText: null, diagnosisCode: null, leaveExtent: null, startDate: null, endDate: null },
  },
} as const;
