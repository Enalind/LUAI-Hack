"use client";

import { useEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { developmentCases } from "../fixtures/development/cases";
import { apiErrorSchema, draftResponseSchema, sourceInputSchema, type RequestContext, type SourceInput } from "../lib/schemas";
import { emptySourceInput, initialWorkspaceState, workspaceReducer } from "../lib/workspace-state";
import { SourceInputForm } from "./source-input";
import { SourcePanel } from "./source-panel";
import { CertificateEditor } from "./certificate-editor";

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
  const narrow = useSyncExternalStore(subscribeToWidth, isNarrow, serverWidth);
  const staleSource = !!state.result && state.result.snapshot.sourceRevision !== state.input.sourceRevision;

  useEffect(() => () => controllerRef.current?.abort(), []);
  useEffect(() => {
    if (selection && (!narrow || activeTab === "source")) {
      const passage = document.getElementById(selection.id);
      passage?.focus({ preventScroll: true });
      passage?.scrollIntoView({ block: "center", behavior: "instant" });
    }
  }, [selection, activeTab, narrow]);

  function changeCase(caseId: string) {
    controllerRef.current?.abort();
    const fixture = developmentCases.find(({ id }) => id === caseId);
    dispatch({ type: "caseChanged", caseId: fixture?.id ?? "custom", input: fixture?.input ?? emptySourceInput() });
    setSelection(null);
    setActiveTab("source");
  }
  function changeSource(input: SourceInput) {
    controllerRef.current?.abort();
    dispatch({ type: "sourceChanged", input });
  }

  async function generate() {
    controllerRef.current?.abort();
    if (!sourceInputSchema.safeParse(state.input).success) {
      dispatch({ type: "invalid", message: !state.input.consultationText.trim() && !state.input.clinicianAssessmentText.trim()
        ? "Ange besöksunderlag eller läkarens bedömning för ett fiktivt patientfall."
        : "Kontrollera datum, sjukskrivningsgrad och textlängd. Högst 30 000 tecken per textfält och 60 000 totalt." });
      return;
    }
    const context: RequestContext = { requestId: crypto.randomUUID(), sourceRevision: state.input.sourceRevision, draftRevision: state.draftRevision };
    const controller = new AbortController();
    controllerRef.current = controller;
    const timer = window.setTimeout(() => controller.abort("timeout"), 60_000);
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
  function panelProps(id: TabId) {
    return { id: `panel-${id}`, role: narrow ? "tabpanel" as const : undefined,
      "aria-labelledby": narrow ? `tab-${id}` : `${id}-title`, hidden: narrow && activeTab !== id };
  }

  return <>
    <div className="workspace-status" role="status" aria-label="Utkaststatus">
      <strong>{state.status === "loading" ? "Skapar utkast…" : state.result ? "Utkast skapat · ej granskat" : "Inget utkast skapat"}</strong>
      <span>Källversion {state.input.sourceRevision} · Utkastversion {state.draftRevision}</span>
    </div>
    {(configurationError || mode === "live") && <div className="error" role="alert" aria-label="Konfigurationsfel"><strong>Generering är inte tillgänglig</strong><p>{configurationError ?? "Live-generering är ännu inte tillgänglig. Använd mock-läge för de fiktiva exemplen."}</p></div>}
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
          generationAvailable={mode === "mock"} onCaseChange={changeCase} onChange={changeSource} onGenerate={generate} />
        <SourcePanel snapshot={state.result?.snapshot ?? null} selectedSourceId={selection?.id ?? null} stale={staleSource} />
      </section>
      <section className="panel draft-panel" {...panelProps("draft")} aria-busy={state.status === "loading"}>
        <div className="panel-heading"><h2 id="draft-title">Intygsutkast</h2><span className="tag">{state.result ? "Ej granskat" : "Ej skapat"}</span></div>
        <p className="panel-description">Redigera ett påstående i taget och följ hänvisningarna till underlaget.</p>
        {state.status === "loading" && <p className="loading-notice">Skapar utkast… Befintlig text behålls tills svaret är klart.</p>}
        <CertificateEditor result={state.result} onEdit={(claimId, text) => { controllerRef.current?.abort(); dispatch({ type: "claimEdited", claimId, text }); }}
          onSourceSelect={(id) => { setSelection({ id }); setActiveTab("source"); }} />
      </section>
      <section className="panel review-panel" {...panelProps("review")}>
        <div className="panel-heading"><h2 id="review-title">Granskning</h2><span className="tag">Ej körd</span></div>
        <p className="panel-description">En separat kontroll inför läkarens genomgång.</p>
        <div className="review-empty"><h3>Utkastet behöver granskas</h3><p>Granskningsflödet är ännu inte tillgängligt. Kontrollera formuleringar, informationsluckor och källor manuellt.</p></div>
        {!!state.result?.validationFindings.length && <div className="integrity-findings" role="alert"><h3>Källhänvisningar behöver kontrolleras</h3><ul>{state.result.validationFindings.map((finding) => <li key={finding.id}>Fält {finding.fieldId}: {finding.explanation}</li>)}</ul></div>}
        <ul className="review-categories"><li>Arbetsuppgifter och krav</li><li>Samband med arbetet</li><li>Bedömningsgrund och attribution</li><li>Källstöd och motsägelser</li></ul>
        <p className="review-note">Ingen granskning har utförts. Matchande hänvisningar innebär inte att innehållet är medicinskt verifierat.</p>
      </section>
    </div>
  </>;
}
