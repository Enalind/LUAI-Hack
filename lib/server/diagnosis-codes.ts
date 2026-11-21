import "server-only";
import catalogue from "../../data/icd-10-se-2026.json";
import { ApplicationError } from "./errors";

export type DiagnosisCode = { code: string; title: string; notPrimary: boolean; selectable: boolean };
export const diagnosisCatalogue = { system: catalogue.system, version: catalogue.version, publisher: catalogue.publisher, sourceUrl: catalogue.sourceUrl };
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const entries = catalogue.codes.map((entry) => ({ ...entry, search: normalize(`${entry.code} ${entry.title}`) }));
const byCode = new Map(entries.map((entry) => [entry.code.replace(".", ""), entry]));
export function lookupDiagnosisCode(code: string): DiagnosisCode | null {
  const entry = byCode.get(code.trim().toUpperCase().replace(".", ""));
  return entry ? { code: entry.code, title: entry.title, notPrimary: entry.notPrimary, selectable: entry.selectable } : null;
}
export function searchDiagnosisCodes(query: string, limit = 12): DiagnosisCode[] {
  const text = normalize(query).slice(0, 150);
  if (text.length < 2) return [];
  const exact = lookupDiagnosisCode(query);
  const words = text.split(/\s+/);
  return entries.filter((entry) => entry.code === exact?.code || words.every((word) => entry.search.includes(word) || entry.code.replace(".", "").toLowerCase().startsWith(word)))
    .sort((a, b) => Number(b.code === exact?.code) - Number(a.code === exact?.code) || Number(b.search.startsWith(text)) - Number(a.search.startsWith(text)) || a.code.localeCompare(b.code))
    .slice(0, Math.max(1, Math.min(20, limit)))
    .map(({ code, title, notPrimary, selectable }) => ({ code, title, notPrimary, selectable }));
}
export function validateDiagnosisCode(code: string | null) {
  if (!code?.trim()) return;
  const entry = lookupDiagnosisCode(code);
  if (!entry || !entry.selectable || entry.notPrimary) throw new ApplicationError("INVALID_INPUT", !entry
    ? "Diagnoskoden finns inte i ICD-10-SE 2026. Välj en kod från sökningen."
    : "Välj en specificerad ICD-10-SE-kod som kan användas som huvuddiagnos.", 400);
}
