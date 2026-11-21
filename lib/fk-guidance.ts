/** Curated application rules, paraphrased from FK's instructions; not an official FK ruleset. */
export const FK_GUIDANCE_VERSION = "fk7804-2026-11-21.v1";
export const FK_GUIDANCE_VERIFIED_ON = "2026-11-21";
export const FK_GUIDANCE_SOURCE = "https://www.forsakringskassan.se/halso-och-sjukvarden/sjukdom-och-skada/intyg-for-sjukpenning";

export const FK_RULE_IDS = [
  "fk3-occupation", "fk5-function", "fk5-basis", "fk6-activity", "fk6-work", "fk7-treatment", "fk-dfa",
] as const;
export type FkRuleId = typeof FK_RULE_IDS[number];
type GuidanceRule = {
  id: FkRuleId; title: string; fields: readonly ("3" | "5" | "6" | "7")[];
  sourceSection: string; requirement: string; reviewInstruction: string;
};

export const FK_GUIDANCE_RULES: readonly GuidanceRule[] = [
  {
    id: "fk3-occupation", title: "Sysselsättning och bedömningsgrund", fields: ["3"],
    sourceSection: "3. I relation till vilken sysselsättning bedömer du arbetsförmågan?",
    requirement: "Beskriv den sysselsättning som arbetsförmågan bedöms mot. Bedömningsgrunden beror på patientens situation; föräldraledighet och arbetslöshet bedöms inte automatiskt mot ett tidigare arbete.",
    reviewInstruction: "Kontrollera dokumenterad sysselsättning och konkreta uppgifter/krav när patienten arbetar. Anta inte anställning, sjukperiodens längd eller rätt bedömningsgrund. Fråga efter relevant saknad information; avgör inte rätten till ersättning.",
  },
  {
    id: "fk5-function", title: "Funktionsnedsättning och svårighetsgrad", fields: ["5"],
    sourceSection: "5. Funktionsnedsättning",
    requirement: "Beskriv hur sjukdomen påverkar fysisk eller psykisk funktion och hur uttalad nedsättningen är.",
    reviewInstruction: "Kontrollera en individuell beskrivning och dokumenterad svårighetsgrad, kvalitativ eller konkret beskriven. En diagnos ensam räcker inte. Skapa aldrig en gradering eller ett fynd som saknas i underlaget.",
  },
  {
    id: "fk5-basis", title: "Läkarens bedömningsunderlag", fields: ["5"],
    sourceSection: "5. Funktionsnedsättning",
    requirement: "Redovisa vad läkarens bedömning bygger på och hur uppgifterna bedöms. Det kan vara undersökningsfynd, tester, utredningssvar eller anamnes. Patientens berättelse och läkarens professionella bedömning behöver kunna skiljas åt.",
    reviewInstruction: "Kontrollera attribution och läkarens dokumenterade bedömning. Kräv inte fysisk undersökning i varje ärende: anamnes kan ingå i bedömningsunderlaget. Enbart patienttext får inte presenteras som läkarfynd. Äldre journalfynd får inte bli aktuella fynd; en obesvarad fråga är inget fynd. Ett exakt källcitat bevisar inte medicinskt stöd.",
  },
  {
    id: "fk6-activity", title: "Konkreta aktivitetsbegränsningar", fields: ["6"],
    sourceSection: "6. Aktivitetsbegränsning",
    requirement: "Beskriv vad läkaren bedömer att patienten har svårt att göra till följd av sjukdomen, med konkreta exempel och begränsningarnas svårighetsgrad.",
    reviewInstruction: "Kontrollera individuell aktivitet, konsekvens och dokumenterad omfattning/svårighet. En uppräkning av symtom eller diagnoser beskriver inte i sig aktivitetsbegränsning. Be om komplettering i stället för att härleda en ny medicinsk slutsats.",
  },
  {
    id: "fk6-work", title: "Samband med arbete eller annan sysselsättning", fields: ["3", "6"],
    sourceSection: "6. Aktivitetsbegränsning",
    requirement: "Relatera aktivitetsbegränsningarna till de arbetsuppgifter eller den andra sysselsättning som arbetsförmågan bedöms i förhållande till i fält 3.",
    reviewInstruction: "Kontrollera om det framgår vilka konkreta krav som påverkas och hur, enligt läkarens dokumenterade bedömning. Flagga ett saknat eller motsägelsefullt samband. Hitta inte på kausalitet, arbetskrav eller bedömning av arbetsförmåga.",
  },
  {
    id: "fk7-treatment", title: "Behandlingens syfte och planering", fields: ["7"],
    sourceSection: "7. Medicinsk behandling",
    requirement: "Beskriv pågående och planerade medicinska åtgärder som kan påverka arbetsförmågan, deras syfte och, när möjligt, tidsplan och ansvarig vårdenhet.",
    reviewInstruction: "Kontrollera relevanta dokumenterade åtgärder och deras syfte. Efterfråga tidsplan eller ansvar när det behövs och går att klargöra; gör inte dessa villkorliga uppgifter till absoluta krav. Dokumenterat att ingen behandling planeras är inte automatiskt en lucka. Skapa inga behandlingsråd.",
  },
  {
    id: "fk-dfa", title: "Sammanhängande DFA-beskrivning", fields: ["5", "6"],
    sourceSection: "Vilka är de vanligaste orsakerna till att Försäkringskassan begär komplettering av medicinska underlag?",
    requirement: "Den medicinska beskrivningen behöver hänga ihop mellan diagnos, funktionsnedsättning, aktivitetsbegränsning och konsekvenser för arbetsförmågan. Otydliga samband är en vanlig orsak till komplettering.",
    reviewInstruction: "Läs fält 5 och 6 tillsammans med läkarens angivna diagnos och sysselsättningen. Flagga saknade eller motsägelsefulla länkar och förklara vilken länk som behöver klargöras. Är diagnos eller medicinsk bedömning inte dokumenterad, ställ en fråga. Välj aldrig diagnos, sjukskrivningsgrad eller period och anta inte att diagnosen ensam medför arbetsoförmåga.",
  },
];

export function getFkRule(id: FkRuleId) {
  return FK_GUIDANCE_RULES.find((rule) => rule.id === id)!;
}

/** URLs and explanations come from this registry, never from model-generated links. */
export function fkRuleUrl(id: FkRuleId) {
  return `${FK_GUIDANCE_SOURCE}#:~:text=${encodeURIComponent(getFkRule(id).sourceSection)}`;
}

export function fkGuidancePrompt(): string {
  return `Källanknutet applikationsregelverk ${FK_GUIDANCE_VERSION}, kontrollerat ${FK_GUIDANCE_VERIFIED_ON}.
Källa: Försäkringskassan, Intyg för sjukpenning (${FK_GUIDANCE_SOURCE}). Reglerna nedan är applikationens sammanfattningar av angivna avsnitt, inte ordagranna citat eller Försäkringskassans eget maskinella regelverk.
Omfattning: fält 3, 5, 6 och 7. Ingen fullständig intygs-, laglighets- eller ersättningsprövning. Diagnosspecifika rekommendationer från Socialstyrelsens försäkringsmedicinska beslutsstöd ingår inte. Regler beskriver vilken information som behövs, aldrig nya patientfakta.
${FK_GUIDANCE_RULES.map((rule) => `[${rule.id}] Fält ${rule.fields.join(", ")}: ${rule.title}\nFK-avsnitt: ${rule.sourceSection}\nVägledning: ${rule.requirement}\nTillämpning: ${rule.reviewInstruction}`).join("\n\n")}`;
}
