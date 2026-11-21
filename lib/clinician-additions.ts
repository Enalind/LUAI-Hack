import { FIELD_IDS, type FieldId } from "./schemas";

// Explicit field-scoped clinician data, not operational/model instructions.
export function appendClinicianAddition(assessment: string, fieldId: FieldId, text: string): string {
  if (!FIELD_IDS.includes(fieldId) || !text.trim()) throw new Error("Ange en läkaruppgift och ett intygsfält.");
  const lines = text.split(/\r\n|\n|\r/).map((line) => `Läkarkomplettering fält ${fieldId}: ${line}`);
  return `${assessment}${assessment ? "\n" : ""}${lines.join("\n")}`;
}

export function parseClinicianAdditions(text: string): { fieldId: FieldId; text: string; sourceLine: string }[] | null {
  if (!text) return [];
  const additions = [];
  for (const line of text.split("\n")) {
    const match = /^Läkarkomplettering fält (3|5|6|7): ([\s\S]*)$/.exec(line);
    if (!match) return null;
    if (match[2].trim()) additions.push({ fieldId: match[1] as FieldId, text: match[2], sourceLine: line });
  }
  return additions.length ? additions : null;
}
