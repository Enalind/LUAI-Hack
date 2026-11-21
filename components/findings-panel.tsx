"use client";

import { useState } from "react";
import type { ScopedDisposition, DraftResponse, Finding, ReviewResult } from "../lib/schemas";
import type { getReviewStatus } from "../lib/workspace-state";
import { validateEvidenceReferences } from "../lib/evidence";
import { EvidenceHover } from "./evidence-reference";
import { FkGuidanceReference } from "./fk-guidance-reference";
import { FK_GUIDANCE_SOURCE, FK_GUIDANCE_VERSION, FK_GUIDANCE_VERIFIED_ON } from "../lib/fk-guidance";

const categories = { work_tasks: "Arbetsuppgifter och krav", work_relationship: "Samband med arbetet", assessment_basis: "Bedömningsgrund och attribution", support_and_contradictions: "Källstöd och motsägelser" };
const actions = { available_but_missing: "Finns i källan men saknas i utkastet", source_information_missing: "Information saknas i underlaget", unsupported_or_conflicting: "Källstöd eller formulering behöver granskas", unclear: "Behöver förtydligas" };
const operations = { add: "Lägg till", replace: "Ersätt påståendet", delete: "Ta bort påståendet" };
type Props = {
  draft: DraftResponse | null; review: ReviewResult | null; previousReview: ReviewResult | null;
  status: ReturnType<typeof getReviewStatus>; error: string | null; canReview: boolean; sourceStale: boolean;
  dispositions: ScopedDisposition[]; onDisposition: (findingId: string, status: "accepted" | "dismissed", note: string) => void;
  onReview: () => void; onSource: (id: string) => void; onClaim: (id: string) => void; onQuestion: () => void;
};

export function FindingsPanel({ draft, review, previousReview, status, error, canReview, sourceStale, onReview, onSource, onClaim, onQuestion, dispositions, onDisposition }: Props) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  function cards(findings: Finding[], old = false, requestId = review?.requestId) {
    return findings.map((finding) => {
      const disposition = dispositions.find((item) => item.reviewRequestId === requestId && item.findingId === finding.id);
      const actionable = !old && status === "complete" && canReview && !disposition;
      const claim = draft?.draft.sections.flatMap(({ claims }) => claims).find(({ id }) => id === finding.targetClaimId);
      const refs = draft ? validateEvidenceReferences([...finding.evidenceRefs, ...(finding.proposedChange?.evidenceRefs ?? [])], draft.snapshot).validRefs : [];
      const uniqueRefs = refs.filter((ref, index) => refs.findIndex((other) => other.sourceId === ref.sourceId && other.exactQuote === ref.exactQuote) === index);
      return <article className={`finding-card ${finding.actionType === "unsupported_or_conflicting" ? "conflict-finding" : ""} ${old ? "old-finding" : ""}`} key={finding.id} id={`finding-${finding.id}`} tabIndex={-1} aria-label={`Fynd: ${categories[finding.category]}`}>
        <div className="finding-heading"><span className="finding-priority">{finding.priority === "needs_review" ? "Behöver granskas" : "Förtydligande"}</span><span>Fält {finding.fieldId}</span></div>
        <h3>{categories[finding.category]}</h3><p className="finding-type">{actions[finding.actionType]}</p>
        {old && <p className="needs-attention">Tidigare fynd – kontrollera mot aktuell version.</p>}
        <EvidenceHover references={uniqueRefs} snapshot={draft!.snapshot} label="för granskningsfynd" onSource={onSource}><p className="finding-explanation" tabIndex={uniqueRefs.length ? 0 : undefined}>{finding.explanation}</p></EvidenceHover>
        <FkGuidanceReference ruleIds={finding.guidelineRuleIds} />
        {claim && <button type="button" className="text-button" onClick={() => onClaim(claim.id)}>Gå till berört påstående</button>}
        {finding.question && <div className="finding-question"><strong>Fråga till läkaren</strong><p>{finding.question}</p><button type="button" className="text-button" onClick={onQuestion}>Komplettera underlaget</button></div>}
        {finding.proposedChange && <div className="proposed-change"><strong>Förslag: {operations[finding.proposedChange.operation]}</strong>
          {finding.proposedChange.text && <p>{finding.proposedChange.text}</p>}
          <p className="input-help">Bedöm förslaget innan intygstexten ändras. Inga ändringar görs automatiskt.</p>
        </div>}
        {disposition && <p className="disposition-status">{disposition.status === "accepted" ? "Accepterat för denna version" : "Avfärdat för denna version – innebär inte verifiering"}{disposition.clinicianNote && `: ${disposition.clinicianNote}`}</p>}
        {requestId === review?.requestId && <div className="finding-actions">
          <label htmlFor={`note-${finding.id}`}>Egen anteckning (valfritt)</label>
          <input id={`note-${finding.id}`} maxLength={30000} value={notes[finding.id] ?? ""} disabled={!actionable} onChange={(event) => setNotes({ ...notes, [finding.id]: event.target.value })} />
          {finding.proposedChange && <button type="button" className="secondary-button" disabled={!actionable} onClick={() => onDisposition(finding.id, "accepted", notes[finding.id] ?? "")}>Acceptera förslag</button>}{" "}
          <button type="button" className="text-button" disabled={!actionable} onClick={() => onDisposition(finding.id, "dismissed", notes[finding.id] ?? "")}>Avfärda fynd</button>
        </div>}

      </article>;
    });
  }
  const incomplete = status === "incomplete" || (status === "loading" && review?.completionStatus === "incomplete");
  return <>
    <div className="panel-heading"><h2 id="review-title">Granskning</h2><span className="tag">{status === "complete" ? "Kontroll genomförd" : status === "stale" ? "Inaktuell" : status === "incomplete" ? "Ofullständig" : status === "loading" ? "Pågår" : "Ej körd"}</span></div>
    <p className="panel-description">Kontroll av källstöd och intygsinnehåll mot Försäkringskassans vägledning för fält 3, 5, 6 och 7.</p>
    <button type="button" className="primary-button" disabled={!canReview || status === "loading"} onClick={onReview}>
      {status === "loading" ? "Granskar utkast…" : status === "incomplete" ? "Försök granska igen" : review ? "Granska på nytt" : "Granska utkast"}
    </button>
    <p className="input-help">Granskning startas när du väljer den. Live-läget använder ett modellanrop utan automatisk omkörning.</p>
    {!draft && <p>Skapa ett utkast innan du granskar.</p>}
    {sourceStale && <p className="needs-attention">Granska uppdaterar källversionen och granskar din befintliga intygstext utan att ersätta redigeringarna.</p>}
    {status === "loading" && <p role="status" aria-label="Granskningsstatus">Granskar utkast… Intygstexten finns kvar och kan redigeras.</p>}
    {status === "stale" && <p className="stale-notice">Tidigare granskning är inaktuell efter ändringar. Kör en ny granskning.</p>}
    {incomplete && <div className="error" role="alert" aria-label="Granskningsfel"><strong>Granskningen är ofullständig</strong><p>{error ?? review?.error?.message ?? "Kontrollen kunde inte slutföras."}</p><p>Intygstexten finns kvar. Eventuella kodkontroller och tidigare fynd visas nedan.</p></div>}
    {status === "complete" && review?.findings.length === 0 && <p className="review-empty-result">Inga problem identifierades av kontrollen.</p>}
    {review && <p className="input-help">{review.completionStatus === "complete" ? `${review.findings.length} fynd. ` : "Kodkontroller för denna version. "}{review.metadata?.mode === "mock" ? "Förberedd mock-kontroll." : review.metadata?.mode === "live" ? "Modellassisterad kontroll." : "Modellkontrollen slutfördes inte."}</p>}
    {review?.metadata?.guidanceVersion === FK_GUIDANCE_VERSION && review.guidelineChecks && <p className="input-help guidance-version" data-guidance-version={review.metadata.guidanceVersion}>
      {review.guidelineChecks.length} vägledningsområden genomgångna. <a href={FK_GUIDANCE_SOURCE} target="_blank" rel="noopener noreferrer">FK:s intygsvägledning ↗</a> · Källan kontrollerad {FK_GUIDANCE_VERIFIED_ON}. Avser dessa fyra fält, inte en fullständig intygsprövning.
    </p>}
    {review?.metadata?.mode === "mock" && <p className="input-help">Vägledningslänkarna visas i ett förberett exempel; ingen modellbedömning mot vägledningen har utförts.</p>}
    {review && cards(review.findings, status === "stale" || (status === "incomplete" && review.completionStatus === "complete"))}
    {previousReview && <section aria-label="Tidigare granskningsfynd"><h3>Tidigare granskningsfynd</h3>{cards(previousReview.findings, true, previousReview.requestId)}</section>}
    {status === "idle" && !!draft?.validationFindings.length && <div className="integrity-findings" role="alert"><h3>Källhänvisningar behöver kontrolleras</h3>{cards(draft.validationFindings)}</div>}
    <p className="review-note">Kontrollen kan missa problem. Läkarens genomgång krävs; matchande hänvisningar innebär inte medicinsk verifiering eller ett myndighetsgodkännande.</p>
  </>;
}
