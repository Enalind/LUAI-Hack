import type { SourceInput } from "../../lib/schemas";

export type DevelopmentCase = {
  id: "D1" | "D2" | "D3";
  label: string;
  fictional: true;
  input: SourceInput;
};

export const developmentCases: DevelopmentCase[] = [
  {
    id: "D1", label: "Lagerarbete och återkommande lyft", fictional: true,
    input: {
      consultationText: [
        "Patient: Jag arbetar på ett lager.",
        "Patient: Jag lyfter lådor på 10–15 kg upprepade gånger under arbetspasset.",
        "Patient: Smärtan i ländryggen gör att jag måste avbryta lyften flera gånger per dag.",
      ].join("\n"),
      clinicianAssessmentText: [
        "Min bedömning är att ländryggssmärtan begränsar förmågan till upprepade lyft i nuläget. Bedömningen baseras på patientens beskrivning; ingen fysisk undersökning dokumenteras.",
        "Plan: Fysioterapeutisk bedömning planeras om en vecka.",
      ].join("\n"),
      explicitDecision: {
        diagnosisText: "Ländryggssmärta, preliminär bedömning", diagnosisCode: null,
        leaveExtent: 50, startDate: "2026-11-21", endDate: "2026-12-05",
      },
      sourceRevision: 0,
    },
  },
  {
    id: "D2", label: "Arbetsuppgifter och bedömning saknas", fictional: true,
    input: {
      consultationText: "Patient: Jag har haft värk i nacken i två veckor.\nPatient: Jag sover sämre när det gör ont.",
      clinicianAssessmentText: "",
      explicitDecision: {
        diagnosisText: null, diagnosisCode: null, leaveExtent: null, startDate: null, endDate: null,
      },
      sourceRevision: 0,
    },
  },
  {
    id: "D3", label: "Nekat symtom och obesvarad fråga", fictional: true,
    input: {
      consultationText: [
        "Patient: Jag har inte tappat känseln.",
        "Läkare: Har du märkt någon svaghet?",
        "Anteckning: Svar på frågan om svaghet saknas.",
      ].join("\n"),
      clinicianAssessmentText: "",
      explicitDecision: {
        diagnosisText: null, diagnosisCode: null, leaveExtent: null, startDate: null, endDate: null,
      },
      sourceRevision: 0,
    },
  },
];
