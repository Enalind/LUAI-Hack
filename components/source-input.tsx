"use client";

import { useState } from "react";
import { appendClinicianAddition } from "../lib/clinician-additions";
import { certificateFields } from "../lib/fields";
import { developmentCases } from "../fixtures/development/cases";
import { MAX_TEXT_CHARACTERS, type FieldId, type ExplicitDecision, type SourceInput } from "../lib/schemas";

type Props = {
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

export function SourceInputForm({ caseId, input, busy, hasDraft, generationAvailable, mode, onCaseChange, onChange, onGenerate }: Props) {
  const [addition, setAddition] = useState("");
  const [field, setField] = useState<FieldId>("3");
  const decision = input.explicitDecision;
  function updateDecision(change: Partial<ExplicitDecision>) {
    onChange({ ...input, explicitDecision: { ...decision, ...change } });
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); onGenerate(); }}>
      <label htmlFor="case-select">Välj fiktivt exempel</label>
      <select id="case-select" value={caseId} onChange={(event) => onCaseChange(event.target.value)} aria-describedby="case-help">
        <option value="custom">Eget fiktivt underlag</option>
        {developmentCases.map((fixture) => <option key={fixture.id} value={fixture.id}>{fixture.label}</option>)}
      </select>
      <p className="input-help" id="case-help">Byte av exempel rensar utkast och ändringar.</p>

      <details className="source-input-details" open={!hasDraft}>
      <summary>Besöksunderlag och läkarbeslut</summary>
      <label htmlFor="consultation">Besöksunderlag</label>
      <textarea id="consultation" rows={7} maxLength={MAX_TEXT_CHARACTERS} value={input.consultationText}
        placeholder="Klistra in ett fiktivt samtal eller fiktiva besöksanteckningar…"
        onChange={(event) => onChange({ ...input, consultationText: event.target.value })} />
      <label htmlFor="assessment">Läkarens bedömning</label>
      <textarea id="assessment" rows={5} maxLength={MAX_TEXT_CHARACTERS} value={input.clinicianAssessmentText}
        placeholder="Ange uttrycklig bedömning. Lämna tomt om uppgift saknas."
        onChange={(event) => onChange({ ...input, clinicianAssessmentText: event.target.value })} />

      <fieldset className="decision-inputs">
        <legend>Läkarens beslut <span className="optional">(valfritt)</span></legend>
        <p className="input-help">Beslut anges av läkaren. Tomma värden fylls inte i automatiskt.</p>
        <label htmlFor="diagnosis">Diagnos</label>
        <textarea id="diagnosis" rows={2} maxLength={MAX_TEXT_CHARACTERS} value={decision.diagnosisText ?? ""}
          onChange={(event) => updateDecision({ diagnosisText: event.target.value || null })} />
        <label htmlFor="diagnosis-code">Diagnoskod</label>
        <input id="diagnosis-code" maxLength={MAX_TEXT_CHARACTERS} value={decision.diagnosisCode ?? ""}
          onChange={(event) => updateDecision({ diagnosisCode: event.target.value || null })} />
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
      </details>
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
      <button className="primary-button" type="submit" disabled={busy || !generationAvailable}>
        {busy ? "Skapar utkast…" : hasDraft ? "Ersätt med nytt utkast" : "Skapa intygsutkast"}
      </button>
      {hasDraft && <p className="input-help">Ett nytt utkast ersätter dina ändringar i intygsfälten.</p>}
      <p className="input-help">{mode === "live" ? "Live-läget skickar det fiktiva underlaget till Anthropic. Generering kan medföra en kostnad. Granska alltid text och källor." : "Mock-läget använder förberedda exempel och dina uttryckliga läkaruppgifter från kompletteringsfältet. Läkarens beslut kan ändras."}</p>
    </form>
  );
}
