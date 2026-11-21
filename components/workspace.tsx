"use client";

import { useEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { developmentCases } from "../fixtures/development/cases";
import { apiErrorSchema, draftResponseSchema, reviewRequestSchema, reviewResultSchema, sourceInputSchema, type RequestContext, type SourceInput } from "../lib/schemas";
import { emptySourceInput, getReviewStatus, initialWorkspaceState, workspaceReducer } from "../lib/workspace-state";
import { SourceInputForm } from "./source-input";
import { SourcePanel } from "./source-panel";
import { CertificateEditor } from "./certificate-editor";
import { FindingsPanel } from "./findings-panel";

const tabs = [{ id: "source", label: "Underlag" }, { id: "draft", label: "Intygsutkast" }, { id: "review", label: "Granskning" }] as const;
type TabId = typeof tabs[number]["id"];
function subscribeToWidth(callback: () => void) {
  const query = window.matchMedia("(max-width: 1050px)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
function isNarrow() { return window.matchMedia("(max-width: 1050px)").matches; }
function serverWidth() { return false; }

export function Workspace({ mode, configurationError }: { mode: "mock" | "live" | null; configurationError: string | null }) {
  const [state, dispatch] = useReducer(workspaceReducer, undefined, initialWorkspaceState);
  const [activeTab, setActiveTab] = useState<TabId>("source");
  const [selection, setSelection] = useState<{ id: string } | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const reviewControllerRef = useRef<AbortController | null>(null);
  const narrow = useSyncExternalStore(subscribeToWidth, isNarrow, serverWidth);
  const staleSource = !!state.result && state.result.snapshot.sourceRevision !== state.input.sourceRevision;
  const reviewStatus = getReviewStatus(state);

  useEffect(() => () => { controllerRef.current?.abort(); reviewControllerRef.current?.abort(); }, []);
  useEffect(() => {
    if (selection) {
      const passage = document.getElementById(selection.id);
      const disclosure = passage?.closest("details");
      if (disclosure instanceof HTMLDetailsElement) disclosure.open = true;
      passage?.focus({ preventScroll: true });
      passage?.scrollIntoView({ block: "center", behavior: "instant" });
    }
  }, [selection, activeTab, narrow]);

  function changeCase(caseId: string) {
    controllerRef.current?.abort();
    reviewControllerRef.current?.abort();
    const fixture = developmentCases.find(({ id }) => id === caseId);
    dispatch({ type: "caseChanged", caseId: fixture?.id ?? "custom", input: fixture?.input ?? emptySourceInput() });
    setSelection(null);
    setActiveTab("source");
  }
  function changeSource(input: SourceInput) {
    controllerRef.current?.abort();
    reviewControllerRef.current?.abort();
    dispatch({ type: "sourceChanged", input });
  }

  async function generate() {
    controllerRef.current?.abort();
    reviewControllerRef.current?.abort();
    if (!sourceInputSchema.safeParse(state.input).success) {
      dispatch({ type: "invalid", message: !state.input.consultationText.trim() && !state.input.clinicianAssessmentText.trim()
        ? "Ange besöksunderlag eller läkarens bedömning för ett fiktivt patientfall."
        : "Kontrollera datum, sjukskrivningsgrad och textlängd. Högst 30 000 tecken per textfält och 60 000 totalt." });
      return;
    }
    const context: RequestContext = { requestId: crypto.randomUUID(), sourceRevision: state.input.sourceRevision, draftRevision: state.draftRevision };
    const controller = new AbortController();
    controllerRef.current = controller;
    const timer = window.setTimeout(() => controller.abort("timeout"), 70_000);
    dispatch({ type: "requested", context });
    setSelection(null);
    setActiveTab("draft");
    try {
      const response = await fetch("/api/draft", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...context, caseId: state.caseId, input: state.input }), signal: controller.signal,
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const error = apiErrorSchema.safeParse(body);
        dispatch({ type: "failed", context, message: error.success ? error.data.message : "Utkastet kunde inte skapas. Försök igen." });
        return;
      }
      const parsed = draftResponseSchema.safeParse(body);
      if (!parsed.success || parsed.data.metadata.mode !== mode
        || parsed.data.requestId !== context.requestId || parsed.data.sourceRevision !== context.sourceRevision
        || parsed.data.draftRevision !== context.draftRevision || parsed.data.snapshot.caseId !== state.caseId) {
        dispatch({ type: "failed", context, message: "Svaret kunde inte valideras. Dina uppgifter finns kvar. Försök igen." });
        return;
      }
      dispatch({ type: "received", result: parsed.data });
    } catch {
      dispatch({ type: "failed", context, message: controller.signal.reason === "timeout"
        ? "Det tog för lång tid att skapa utkastet. Dina uppgifter finns kvar. Försök igen."
        : "Kunde inte hämta utkastet. Kontrollera anslutningen och försök igen. Dina uppgifter finns kvar." });
    } finally {
      window.clearTimeout(timer);
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }

  async function review() {
    if (!state.result || staleSource || state.status === "loading" || mode === null) return;
    reviewControllerRef.current?.abort();
    const context: RequestContext = { requestId: crypto.randomUUID(), sourceRevision: state.input.sourceRevision, draftRevision: state.draftRevision };
    dispatch({ type: "reviewRequested", context });
    setActiveTab("review");
    const input = reviewRequestSchema.safeParse({ ...context, snapshot: state.result.snapshot, draft: state.result.draft, explicitDecision: state.input.explicitDecision });
    if (!input.success) {
      dispatch({ type: "reviewFailed", context, message: "Kontrollera att alla påståenden innehåller text och att läkarens beslut motsvarar källversionen." });
      return;
    }
    const controller = new AbortController();
    reviewControllerRef.current = controller;
    const timer = window.setTimeout(() => controller.abort("timeout"), 70_000);
    try {
      const response = await fetch("/api/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input.data), signal: controller.signal });
      const body: unknown = await response.json();
      const parsed = reviewResultSchema.safeParse(body);
      if (response.ok && parsed.success && parsed.data.requestId === context.requestId && parsed.data.sourceRevision === context.sourceRevision
        && parsed.data.draftRevision === context.draftRevision && (!parsed.data.metadata || parsed.data.metadata.mode === mode)) {
        dispatch({ type: "reviewReceived", result: parsed.data });
      } else {
        const error = apiErrorSchema.safeParse(body);
        dispatch({ type: "reviewFailed", context, message: error.success ? error.data.message : "Granskningssvaret kunde inte valideras. Intygstexten finns kvar." });
      }
    } catch {
      dispatch({ type: "reviewFailed", context, message: controller.signal.reason === "timeout"
        ? "Granskningen tog för lång tid. Intygstexten finns kvar. Försök igen."
        : "Granskningen kunde inte hämtas. Intygstexten finns kvar. Försök igen." });
    } finally {
      window.clearTimeout(timer);
      if (reviewControllerRef.current === controller) reviewControllerRef.current = null;
    }
  }
  function panelProps(id: TabId) {
    return { id: `panel-${id}`, role: narrow ? "tabpanel" as const : undefined,
      "aria-labelledby": narrow ? `tab-${id}` : `${id}-title`, hidden: narrow && activeTab !== id };
  }

  return <>
    <div className="workspace-status" role="status" aria-label="Utkaststatus">
      <strong>{state.status === "loading" ? "Skapar utkast…" : reviewStatus === "loading" ? "Granskar utkast…" : state.result
        ? reviewStatus === "complete" ? "Utkast skapat · kontroll genomförd" : reviewStatus === "stale" ? "Utkast skapat · granskning inaktuell"
        : reviewStatus === "incomplete" ? "Utkast skapat · granskning ofullständig" : "Utkast skapat · ej granskat" : "Inget utkast skapat"}</strong>
      <span>Källversion {state.input.sourceRevision} · Utkastversion {state.draftRevision}</span>
    </div>
    {configurationError && <div className="error" role="alert" aria-label="Konfigurationsfel"><strong>Generering är inte tillgänglig</strong><p>{configurationError}</p></div>}
    {state.error && <div className="error" role="alert" aria-label="Utkastfel"><strong>Utkastet kunde inte skapas</strong><p>{state.error}</p></div>}
    {staleSource && <div className="stale-notice" role="note">Underlaget har ändrats. Utkastet och dess källpassager hör till föregående källversion. Skapa ett nytt utkast för att använda ändringarna.</div>}

    {narrow && <div className="workspace-tabs" role="tablist" aria-label="Arbetsytans paneler">{tabs.map((tab, index) => <button
      key={tab.id} id={`tab-${tab.id}`} type="button" role="tab" aria-selected={activeTab === tab.id}
      aria-controls={`panel-${tab.id}`} tabIndex={activeTab === tab.id ? 0 : -1}
      onClick={() => setActiveTab(tab.id)} onKeyDown={(event) => {
        const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
        if (next !== null) { event.preventDefault(); setActiveTab(tabs[next].id); document.getElementById(`tab-${tabs[next].id}`)?.focus(); }
      }}>{tab.label}</button>)}</div>}

    <div className="workspace">
      <section className="panel source-panel" {...panelProps("source")}>
        <div className="panel-heading"><h2 id="source-title">Underlag</h2><span className="tag">Fiktivt fall</span></div>
        <p className="panel-description">Besöksunderlag och läkarens bedömning hålls åtskilda.</p>
        <SourceInputForm caseId={state.caseId} input={state.input} busy={state.status === "loading"} hasDraft={!!state.result}
          generationAvailable={mode !== null} mode={mode} onCaseChange={changeCase} onChange={changeSource} onGenerate={generate} />
        <SourcePanel snapshot={state.result?.snapshot ?? null} selectedSourceId={selection?.id ?? null} stale={staleSource} />
      </section>
      <section className="panel draft-panel" {...panelProps("draft")} aria-busy={state.status === "loading"}>
        <div className="panel-heading"><h2 id="draft-title">Intygsutkast</h2><span className="tag">{state.result ? reviewStatus === "complete" ? "Kontroll genomförd" : "Behöver granskas" : "Ej skapat"}</span></div>
        <p className="panel-description">Redigera ett påstående i taget och följ hänvisningarna till underlaget.</p>
        {state.status === "loading" && <p className="loading-notice">Skapar utkast… Befintlig text behålls tills svaret är klart.</p>}
        <CertificateEditor result={state.result} onEdit={(claimId, text) => { controllerRef.current?.abort(); reviewControllerRef.current?.abort(); dispatch({ type: "claimEdited", claimId, text }); }}
          onSourceSelect={(id) => { setSelection({ id }); setActiveTab("source"); }} />
      </section>
      <section className="panel review-panel" {...panelProps("review")} aria-busy={reviewStatus === "loading"}>
        <FindingsPanel draft={state.result} review={state.review} previousReview={state.previousReview} status={reviewStatus} error={state.reviewError}
          canReview={!!state.result && !staleSource && state.status !== "loading" && mode !== null} sourceStale={staleSource} onReview={review}
          onSource={(id) => { setSelection({ id }); setActiveTab("source"); }}
          onClaim={(id) => { setSelection({ id: `claim-${id}` }); setActiveTab("draft"); }}
          onQuestion={() => { setSelection({ id: "assessment" }); setActiveTab("source"); }} />
      </section>
    </div>
  </>;
}
