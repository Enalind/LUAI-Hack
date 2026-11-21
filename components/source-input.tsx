"use client";

import { useState, useSyncExternalStore } from "react";
import { DiagnosisSearch } from "./diagnosis-search";
import { appendClinicianAddition } from "../lib/clinician-additions";
import { certificateFields } from "../lib/fields";
import type { DevelopmentCase } from "../fixtures/development/cases";
import { MAX_TEXT_CHARACTERS, type FieldId, type ExplicitDecision, type SourceInput, type ReferenceMaterial } from "../lib/schemas";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

type Props = {
  examples: DevelopmentCase[];
  caseId: string;
  input: SourceInput;
  busy: boolean;
  hasDraft: boolean;
  generationAvailable: boolean;
  mode: "mock" | "live" | null;
  onCaseChange: (caseId: string) => void;
  onChange: (input: SourceInput) => void;
  onGenerate: () => void;
};

export function SourceInputForm({ examples, caseId, input, busy, hasDraft, generationAvailable, mode, onCaseChange, onChange, onGenerate }: Props) {
  const hydrated = useSyncExternalStore(subscribe, clientReady, serverReady);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [addition, setAddition] = useState("");
  const [adding, setAdding] = useState(false);
  const materialTypes = [{ type: "consultation", title: "Besöksunderlag", description: "Samtal, transkription eller besöksanteckning" }, { type: "journal", title: "Journalanteckning", description: "Tidigare dokumentation och medicinsk historik" }, { type: "assessment", title: "Läkarens bedömning", description: "Din undersökning och kliniska bedömning" }, { type: "lab", title: "Provsvar / undersökning", description: "Laboratorieresultat och undersökningssvar" }, { type: "other", title: "Annat underlag", description: "Övrig dokumentation som ska ingå" }] as const;
  const materials = input.referenceMaterials ?? [];
  function updateMaterial(id: string, change: Partial<ReferenceMaterial>) {
    onChange({ ...input, referenceMaterials: materials.map((item) => item.id === id ? { ...item, ...change } : item) });
  }
  const [field, setField] = useState<FieldId>("3");
  const decision = input.explicitDecision;
  function updateDecision(change: Partial<ExplicitDecision>) {
    onChange({ ...input, explicitDecision: { ...decision, ...change } });
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); onGenerate(); }}>
      <div className="material-heading"><div><h2>Referensmaterial</h2><p>Samla det som intyget ska bygga på.</p></div>
        <div className="add-material-container"><button type="button" className="secondary-button add-material" aria-expanded={adding} aria-controls="material-type-menu" disabled={!hydrated || materials.length >= 30} onClick={() => setAdding(!adding)} onKeyDown={(event) => { if (event.key === "Escape") setAdding(false); }}><span aria-hidden="true">＋</span> Lägg till underlag</button>
          {adding && <div className="material-menu" id="material-type-menu" aria-label="Välj typ av underlag">{materialTypes.map((kind) => <button type="button" key={kind.type} onClick={() => {
            const id = crypto.randomUUID(); onChange({ ...input, referenceMaterials: [...materials, { id, type: kind.type, title: kind.title, text: "" }] }); setAdding(false);
            requestAnimationFrame(() => document.getElementById(`material-text-${id}`)?.focus());
          }}><strong>{kind.title}</strong><span>{kind.description}</span></button>)}</div>}
        </div>
      </div>
      {!input.consultationText && !input.clinicianAssessmentText && !materials.length && <div className="material-empty"><span className="empty-document" aria-hidden="true">＋</span><h3>Allt börjar med ditt underlag.</h3><p>Lägg till besöksanteckningar, din bedömning eller andra referenser.<br />Varje uppgift i utkastet kan sedan följas till sin källa.</p><button type="button" className="text-button" disabled={!hydrated} onClick={() => setAdding(true)}>Lägg till ditt första underlag</button></div>}
      <div className="material-list">
        {(caseId !== "custom" || !!input.consultationText) && <details className="material-document" open><summary><span className="document-icon" aria-hidden="true">▤</span>Besöksunderlag<span className="material-kind">Besöksanteckning</span></summary><label htmlFor="consultation">Besöksunderlag</label><textarea id="consultation" rows={7} maxLength={MAX_TEXT_CHARACTERS} value={input.consultationText} onChange={(event) => onChange({ ...input, consultationText: event.target.value })} /></details>}
        {(caseId !== "custom" || !!input.clinicianAssessmentText) && <details className="material-document" open><summary><span className="document-icon" aria-hidden="true">▤</span>Läkarens bedömning<span className="material-kind">Bedömning</span></summary><label htmlFor="assessment">Läkarens bedömning</label><textarea id="assessment" rows={5} maxLength={MAX_TEXT_CHARACTERS} value={input.clinicianAssessmentText} onChange={(event) => onChange({ ...input, clinicianAssessmentText: event.target.value })} /></details>}
        {materials.map((material) => <details className="material-document" key={material.id} open><summary><span className="document-icon" aria-hidden="true">▤</span>{material.title}<span className="material-kind">{materialTypes.find(({ type }) => type === material.type)?.title}</span></summary>
          <div className="material-document-toolbar"><label htmlFor={`material-title-${material.id}`}>Titel</label><button type="button" className="text-button" aria-label={`Ta bort ${material.title}`} onClick={() => onChange({ ...input, referenceMaterials: materials.filter(({ id }) => id !== material.id) })}>Ta bort</button></div>
          <input id={`material-title-${material.id}`} maxLength={160} value={material.title} onChange={(event) => updateMaterial(material.id, { title: event.target.value })} />
          <label htmlFor={`material-text-${material.id}`}>Innehåll · {materialTypes.find(({ type }) => type === material.type)?.title}</label><textarea id={`material-text-${material.id}`} rows={6} placeholder="Klistra in underlaget här…" value={material.text} maxLength={MAX_TEXT_CHARACTERS} onChange={(event) => updateMaterial(material.id, { text: event.target.value })} />
          <p className="input-help">{material.text.length.toLocaleString("sv-SE")} tecken · Fiktiva uppgifter</p>
        </details>)}
      </div>
      <div className="example-picker"><button className="text-button example-toggle" type="button" disabled={!hydrated} aria-expanded={examplesOpen} onClick={() => setExamplesOpen(!examplesOpen)}>Prova med ett fiktivt exempel</button><div hidden={!examplesOpen}><label htmlFor="case-select">Välj fiktivt exempel</label><select id="case-select" value={caseId} onChange={(event) => onCaseChange(event.target.value)} aria-describedby="case-help"><option value="custom">Eget fiktivt underlag</option>{examples.map((fixture) => <option key={fixture.id} value={fixture.id}>{fixture.label}</option>)}</select><p className="input-help" id="case-help">Byte av exempel rensar utkast och ändringar.</p></div></div>
      <fieldset className="decision-inputs">
        <legend>Läkarens beslut <span className="optional">(valfritt)</span></legend>
        <p className="input-help">Beslut anges av läkaren. Tomma värden fylls inte i automatiskt.</p>
        <DiagnosisSearch decision={decision} onChange={updateDecision} />
        <label htmlFor="leave-extent">Sjukskrivningsgrad</label>
        <select id="leave-extent" value={decision.leaveExtent ?? ""} onChange={(event) => updateDecision({
          leaveExtent: event.target.value === "" ? null : Number(event.target.value) as ExplicitDecision["leaveExtent"],
        })}>
          <option value="">Ej angiven</option>
          {[25, 50, 75, 100].map((extent) => <option key={extent} value={extent}>{extent} %</option>)}
        </select>
        <div className="date-inputs">
          <div><label htmlFor="start-date">Från och med</label><input id="start-date" type="date" value={decision.startDate ?? ""} onChange={(event) => updateDecision({ startDate: event.target.value || null })} /></div>
          <div><label htmlFor="end-date">Till och med</label><input id="end-date" type="date" value={decision.endDate ?? ""} onChange={(event) => updateDecision({ endDate: event.target.value || null })} /></div>
        </div>
      </fieldset>
      {hasDraft && <fieldset className="clinician-addition"><legend>Lägg till läkaruppgift i underlaget</legend>
        <label htmlFor="addition-field">Berört intygsfält</label><select id="addition-field" value={field} onChange={(event) => setField(event.target.value as FieldId)}>
          {certificateFields.map(({ id, title }) => <option key={id} value={id}>{id} · {title}</option>)}
        </select>
        <label htmlFor="clinician-addition">Läkarens komplettering</label><textarea id="clinician-addition" rows={3} maxLength={MAX_TEXT_CHARACTERS} value={addition} onChange={(event) => setAddition(event.target.value)} />
        <button type="button" className="secondary-button" disabled={!addition.trim() || appendClinicianAddition(input.clinicianAssessmentText, field, addition).length > MAX_TEXT_CHARACTERS} onClick={() => {
          onChange({ ...input, clinicianAssessmentText: appendClinicianAddition(input.clinicianAssessmentText, field, addition) }); setAddition("");
        }}>Lägg till i underlaget</button>
        <p className="input-help">Välj sedan Granska. Befintlig intygstext behålls; kompletteringen kan föreslås som tillägg. Mock-kontrollen återger texten utan medicinsk bedömning.</p>
      </fieldset>}
      <div className="source-form-footer"><p>{materials.length + Number(!!input.consultationText) + Number(!!input.clinicianAssessmentText)} underlag · FK7804</p><button className="primary-button" type="submit" disabled={!hydrated || busy || !generationAvailable}>
        {busy ? "Skapar utkast…" : hasDraft ? "Ersätt med nytt utkast" : "Skapa intygsutkast"}
      </button></div>
      {hasDraft && <p className="input-help">Ett nytt utkast ersätter dina ändringar i intygsfälten.</p>}
      <p className="input-help">{mode === "live" ? "Live-läget skickar det fiktiva underlaget till Anthropic. Generering kan medföra en kostnad. Granska alltid text och källor." : "Mock-läget använder förberedda exempel och dina uttryckliga läkaruppgifter från kompletteringsfältet. Läkarens beslut kan ändras."}</p>
    </form>
  );
}
