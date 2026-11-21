import type { FieldId } from "./schemas";

export const certificateFields: { id: FieldId; title: string; description: string }[] = [
  { id: "3", title: "Sysselsättning", description: "Yrke, arbetsuppgifter och relevanta krav." },
  { id: "5", title: "Funktionsnedsättning", description: "Beskrivning och dokumenterad bedömningsgrund." },
  { id: "6", title: "Aktivitetsbegränsning", description: "Bedömda begränsningar i relation till arbetet." },
  { id: "7", title: "Medicinsk behandling", description: "Dokumenterad pågående eller planerad behandling." },
];
