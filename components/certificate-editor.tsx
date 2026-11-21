"use client";

import type { WorkspaceState } from "../lib/workspace-state";
import { FieldCopy } from "./export-controls";
import { certificateFields } from "../lib/fields";
import { validateEvidenceReferences } from "../lib/evidence";
import { MAX_TEXT_CHARACTERS, type DraftResponse, type ExplicitDecision } from "../lib/schemas";

function DecisionDisplay({ decision }: { decision: ExplicitDecision }) {
  return <section className="decision-display" aria-labelledby="decision-display-title">
    <h3 id="decision-display-title">Läkarens beslut i källversionen</h3>
    <p className="input-help">Återgivet från läkarens inmatning.</p>
    <dl>
      <div><dt>Diagnos</dt><dd>{decision.diagnosisText?.trim() ? decision.diagnosisText : "Ej angiven"}</dd></div>
      <div><dt>Diagnoskod</dt><dd>{decision.diagnosisCode?.trim() ? decision.diagnosisCode : "Ej angiven"}</dd></div>
      <div><dt>Sjukskrivningsgrad</dt><dd>{decision.leaveExtent === null ? "Ej angiven" : `${decision.leaveExtent} %`}</dd></div>
      <div><dt>Från och med</dt><dd>{decision.startDate ?? "Ej angivet"}</dd></div>
      <div><dt>Till och med</dt><dd>{decision.endDate ?? "Ej angivet"}</dd></div>
    </dl>
  </section>;
}

export function CertificateEditor({ state, result, onEdit, onSourceSelect }: { state: WorkspaceState; result: DraftResponse | null; onEdit: (claimId: string, text: string) => void; onSourceSelect: (sourceId: string) => void }) {
  return <>
    {result && <DecisionDisplay decision={result.draft.explicitDecision} />}
    <div className="draft-fields">{certificateFields.map(({ id, title, description }) => {
      const section = result?.draft.sections.find(({ fieldId }) => fieldId === id);
      return <section className="field" key={id} aria-labelledby={`field-${id}`}>
        <div className="field-heading"><span className="field-number">{id}</span><h3 id={`field-${id}`}>{title}</h3></div>
        <p className="field-description">{description}</p>
        {!section?.claims.length && <p className="placeholder">Underlag saknas</p>}
        {section?.claims.map((claim, index) => {
          const stale = claim.supportStatus === "stale";
          const refs = result ? validateEvidenceReferences(claim.evidenceRefs, result.snapshot).validRefs : [];
          const origins = new Set(refs.map((ref) => result?.snapshot.passages.find(({ id }) => id === ref.sourceId)?.origin));
          const attribution = origins.size !== 1 ? "Flera källtyper" : origins.has("clinician_assessment") ? "Läkarens bedömning" : origins.has("consultation") ? "Besöksunderlag" : "Läkarens beslut";
          return <article className={`claim-card ${stale ? "stale-claim" : ""}`} key={claim.id}>
            <label htmlFor={`claim-${claim.id}`}>Påstående {index + 1} · {title}</label>
            <textarea id={`claim-${claim.id}`} rows={Math.max(3, Math.min(7, Math.ceil(claim.text.length / 50)))} maxLength={MAX_TEXT_CHARACTERS} value={claim.text} onChange={(event) => onEdit(claim.id, event.target.value)} />
            <p className="claim-origin">{refs.length > 0 ? attribution : "Källhänvisning saknas"}</p>
            <div className="evidence-buttons">{refs.map((ref, refIndex) => {
              const number = result!.snapshot.passages.findIndex(({ id }) => id === ref.sourceId) + 1;
              return <button key={`${ref.sourceId}-${refIndex}`} type="button" className="source-chip" aria-label={`${stale ? "Visa tidigare källa" : "Visa källa"} ${number} för påstående ${index + 1} i ${title}`} onClick={() => onSourceSelect(ref.sourceId)}>{stale ? "Tidigare källa" : "Källa"} {number}</button>;
            })}</div>
            <p className={`claim-status ${stale || claim.integrityStatus !== "valid" ? "needs-attention" : ""}`}>
              {stale ? "Ändrat – tidigare källstöd behöver granskas på nytt." : claim.integrityStatus !== "valid" ? "Källhänvisningen behöver kontrolleras."
                : claim.supportStatus === "reviewed" ? "Kontroll genomförd; läkarens granskning återstår."
                : claim.supportStatus === "needs_review" ? "Påståendet berörs av ett granskningsfynd." : "Hänvisning matchar underlaget. Innehållet är inte granskat."}
            </p>
          </article>;
        })}
        {result && <FieldCopy state={state} fieldId={id} />}
        {!!section?.informationGaps.length && <div className="information-gaps"><strong>Behöver förtydligas</strong><ul>{section.informationGaps.map((gap, index) => <li key={index}>{gap}</li>)}</ul></div>}
      </section>;
    })}</div>
  </>;
}
