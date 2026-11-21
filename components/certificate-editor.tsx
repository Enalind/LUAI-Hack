"use client";

import type { WorkspaceState } from "../lib/workspace-state";
import { FieldCopy } from "./export-controls";
import { certificateFields } from "../lib/fields";
import { validateEvidenceReferences } from "../lib/evidence";
import { type DraftResponse, type ExplicitDecision } from "../lib/schemas";
import { EvidenceHover } from "./evidence-reference";
import { AnnotatedClaim } from "./annotated-claim";
import { getReviewStatus } from "../lib/workspace-state";

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

export function CertificateEditor({ state, result, onEdit, onSourceSelect, reviewMode = false, onFinding }: { state: WorkspaceState; result: DraftResponse | null; onEdit: (claimId: string, text: string) => void; onSourceSelect: (sourceId: string) => void; reviewMode?: boolean; onFinding?: (id: string) => void }) {
  const status = getReviewStatus(state);
  const findings = reviewMode && (status === "complete" || status === "incomplete") ? state.review?.findings ?? [] : [];
  return <>
    {result && <DecisionDisplay decision={result.draft.explicitDecision} />}
    <div className="draft-fields">{certificateFields.map(({ id, title, description }) => {
      const section = result?.draft.sections.find(({ fieldId }) => fieldId === id);
      const fieldFindings = findings.filter((finding) => finding.fieldId === id && (!finding.targetClaimId || !finding.targetSpan));
      const gaps = section?.informationGaps.filter((gap) => !fieldFindings.some((finding) => finding.question === gap)) ?? [];
      return <section className={`field ${fieldFindings.length ? "field-attention" : ""}`} key={id} aria-labelledby={`field-${id}`}>
        <div className="field-heading"><span className="field-number">{id}</span>{fieldFindings.length && result ? <EvidenceHover references={fieldFindings.flatMap((finding) => finding.evidenceRefs)} findings={fieldFindings} snapshot={result.snapshot} label={`för fält ${id}`} onSource={onSourceSelect} onFinding={onFinding}>
          <h3 id={`field-${id}`}><mark className="review-field-highlight" tabIndex={0} aria-description={`${fieldFindings.length} granskningsfynd. Håll pekaren över rubriken eller tryck Alt och pil ned.`}>{title}</mark></h3>
        </EvidenceHover> : <h3 id={`field-${id}`}>{title}</h3>}</div>
        <p className="field-description">{description}</p>
        {!section?.claims.length && <p className="placeholder">Underlag saknas</p>}
        {section?.claims.map((claim, index) => {
          const stale = claim.supportStatus === "stale";
          const refs = result ? validateEvidenceReferences(claim.evidenceRefs, result.snapshot).validRefs : [];
          const origins = new Set(refs.map((ref) => result?.snapshot.passages.find(({ id }) => id === ref.sourceId)?.origin));
          const attribution = origins.size !== 1 ? "Flera källtyper" : origins.has("clinician_assessment") ? "Läkarens bedömning" : origins.has("consultation") ? "Besöksunderlag" : origins.has("reference_material") ? "Referensmaterial" : "Läkarens beslut";
          const claimFindings = findings.filter((finding) => finding.targetClaimId === claim.id);
          return <article className={`claim-card ${stale ? "stale-claim" : ""}`} key={claim.id}>
            <label htmlFor={`claim-${claim.id}`}>Påstående {index + 1} · {title}</label>
            <AnnotatedClaim claim={claim} snapshot={result!.snapshot} findings={claimFindings} label={`för påstående ${index + 1} i ${title}`} id={`claim-${claim.id}`} onEdit={(text) => onEdit(claim.id, text)} onSource={onSourceSelect} onFinding={onFinding} />
            <p className="claim-origin">{refs.length > 0 ? attribution : "Källhänvisning saknas"}</p>
            <p className={`claim-status ${stale || claim.integrityStatus !== "valid" ? "needs-attention" : ""}`}>
              {stale ? "Ändrat – tidigare källstöd behöver granskas på nytt." : claim.integrityStatus !== "valid" ? "Källhänvisningen behöver kontrolleras."
                : claim.supportStatus === "reviewed" ? "Kontroll genomförd; läkarens granskning återstår."
                : claim.supportStatus === "needs_review" ? "Påståendet berörs av ett granskningsfynd." : "Hänvisning matchar underlaget. Innehållet är inte granskat."}
            </p>
          </article>;
        })}
        {result && <FieldCopy state={state} fieldId={id} />}
        {!reviewMode && !!gaps.length && <div className="information-gaps"><strong>Behöver förtydligas</strong><ul>{gaps.map((gap, index) => <li key={index}>{gap}</li>)}</ul></div>}
      </section>;
    })}</div>
  </>;
}
