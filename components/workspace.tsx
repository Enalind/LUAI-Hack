"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { DevelopmentCase } from "../fixtures/development/cases";
import { apiErrorSchema, draftResponseSchema, reviewRequestSchema, reviewResultSchema, sourceInputSchema, sourceSnapshotResponseSchema, type RequestContext, type SourceInput } from "../lib/schemas";
import { emptySourceInput, getReviewStatus, initialWorkspaceState, workspaceReducer } from "../lib/workspace-state";
import { refreshDraftSources } from "../lib/revisions";
import { ReportDownload } from "./export-controls";
import { SourceInputForm } from "./source-input";
import { SourcePanel } from "./source-panel";
import { CertificateEditor } from "./certificate-editor";
import { FindingsPanel } from "./findings-panel";

const tabs = [{ id: "source", label: "Underlag", href: "/underlag", icon: "sources" }, { id: "draft", label: "Intygsutkast", href: "/utkast", icon: "document" }, { id: "review", label: "Granskning", href: "/granskning", icon: "review" }] as const;
type TabId = typeof tabs[number]["id"];
function Icon({ name }: { name: string }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{name === "sources" ? <><path d="M3 7h6l2 2h10v11H3z" /><path d="M3 7V4h7l2 3h8v2" /></> : name === "review" ? <><path d="M14 3H5v18h14v-9" /><path d="m10 10 3 3 8-9M8 17h6" /></> : <><path d="M14 3H5v18h14V8zM14 3v5h5M8 12h8M8 16h6" /></>}</svg>;
}

export function Workspace({ mode, configurationError, examples }: { examples: DevelopmentCase[]; mode: "mock" | "live" | null; configurationError: string | null }) {
  const [state, dispatch] = useReducer(workspaceReducer, undefined, initialWorkspaceState);
  const pathname = usePathname();
  const router = useRouter();
  const activeTab: TabId = pathname === "/utkast" ? "draft" : pathname === "/granskning" ? "review" : "source";
  function setActiveTab(id: TabId) { router.push(tabs.find((tab) => tab.id === id)!.href, { scroll: false }); }
  const [selection, setSelection] = useState<{ id: string } | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const reviewControllerRef = useRef<AbortController | null>(null);

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
  }, [selection, activeTab]);

  function changeCase(caseId: string) {
    controllerRef.current?.abort();
    reviewControllerRef.current?.abort();
    const fixture = examples.find(({ id }) => id === caseId);
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
      dispatch({ type: "invalid", message: !state.input.consultationText.trim() && !state.input.clinicianAssessmentText.trim() && !state.input.referenceMaterials?.some((item) => item.text.trim())
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
    if (!state.result || state.status === "loading" || mode === null) return;
    reviewControllerRef.current?.abort();
    const context: RequestContext = { requestId: crypto.randomUUID(), sourceRevision: state.input.sourceRevision, draftRevision: state.draftRevision };
    dispatch({ type: staleSource ? "sourcesRequested" : "reviewRequested", context });
    setActiveTab("review");
    const controller = new AbortController();
    reviewControllerRef.current = controller;
    const timer = window.setTimeout(() => controller.abort("timeout"), 70_000);
    try {
      let result = state.result;
      if (staleSource) {
        const response = await fetch("/api/sources", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...context, caseId: state.caseId, input: state.input }), signal: controller.signal });
        const body: unknown = await response.json();
        if (controller.signal.aborted) return;
        const parsed = sourceSnapshotResponseSchema.safeParse(body);
        if (!response.ok || !parsed.success || parsed.data.requestId !== context.requestId || parsed.data.sourceRevision !== context.sourceRevision
          || parsed.data.draftRevision !== context.draftRevision || parsed.data.snapshot.caseId !== state.caseId) {
          dispatch({ type: "reviewFailed", context, message: "Källversionen kunde inte uppdateras. Intygstexten finns kvar." }); return;
        }
        result = refreshDraftSources(result, parsed.data.snapshot);
        dispatch({ type: "sourcesReceived", result: parsed.data });
        dispatch({ type: "reviewRequested", context });
      }
      const input = reviewRequestSchema.safeParse({ ...context, snapshot: result.snapshot, draft: result.draft, explicitDecision: state.input.explicitDecision });
      if (!input.success) {
        dispatch({ type: "reviewFailed", context, message: "Kontrollera att alla påståenden innehåller text och att läkarens beslut motsvarar källversionen." }); return;
      }
      if (controller.signal.aborted) return;
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
  const sourceCount = Number(!!state.input.consultationText.trim()) + Number(!!state.input.clinicianAssessmentText.trim()) + (state.input.referenceMaterials?.filter((item) => item.text.trim()).length ?? 0);
  const pageCopy = activeTab === "source" ? { eyebrow: "DITT ARBETSRUM", title: "Ett bra intyg börjar här.", description: "Samla underlaget. Låt sedan Asteria hjälpa dig med formuleringarna." }
    : activeTab === "draft" ? { eyebrow: "INTYGSUTKAST · FK7804", title: "Utrymme för din bedömning.", description: "Redigera direkt i texten. Håll pekaren över markerade fraser för att se källunderlaget." }
    : { eyebrow: "GRANSKNING · FK7804", title: "En extra blick på detaljerna.", description: "Håll pekaren över en markerad fras för att läsa granskningsfyndet i sitt sammanhang." };
  function selectSource(id: string) { setSelection({ id }); setActiveTab("source"); }
  function selectClaim(id: string) { setSelection({ id: `claim-${id}` }); if (activeTab !== "review") setActiveTab("draft"); }
  const canReview = !!state.result && state.status !== "loading" && mode !== null;
  return <div className="app-shell">
    <aside className="app-sidebar">
      <Link className="brand" href="/" aria-label="Asteria, startsida"><Image className="brand-wordmark" src="/brand/asteria-wordmark-forest.svg" alt="Asteria" width={174} height={64} preload /></Link>
      <div className="sidebar-workspace"><span className="workspace-monogram">A</span><div>Intygsstöd<small>Ditt kliniska arbetsrum</small></div></div>
      <p className="nav-caption">ARBETSFLÖDE</p>
      <nav className="workflow-nav" aria-label="Arbetsflöde">{tabs.map((tab) => <Link key={tab.id} href={tab.href} aria-label={tab.label} aria-current={activeTab === tab.id ? "page" : undefined}><Icon name={tab.icon} /><span>{tab.label}</span>{tab.id === "source" && sourceCount > 0 && <span className="nav-count">{sourceCount}</span>}{tab.id === "review" && reviewStatus === "complete" && !!state.review?.findings.length && <span className="nav-count">{state.review.findings.length}</span>}</Link>)}</nav>
      <div className="sidebar-bottom"><span className="sidebar-symbol" aria-hidden="true">✳</span><p>Du står för bedömningen.<br />Vi hjälper dig med klarheten.</p><small>Endast fiktiva patientfall</small></div>
    </aside>
    <div className="app-content">
      <header className="app-topbar"><div className="breadcrumb">Arbetsrum <span>/</span> <strong>{tabs.find((tab) => tab.id === activeTab)?.label}</strong></div><span className={`mode-badge ${mode === "live" ? "live" : ""}`}>{mode === "live" ? "Live-läge · serverkonfigurerat" : mode === "mock" ? "Mock-läge · ingen modellanslutning" : "Konfigurationsfel"}</span></header>
      <main id="main">
        <div className="page-heading"><div><p className="eyebrow">{pageCopy.eyebrow}</p><h1>{pageCopy.title}</h1><p>{pageCopy.description}</p></div>{activeTab === "draft" && state.result && <button className="primary-button review-trigger" aria-label="Granska utkast" type="button" disabled={!canReview || reviewStatus === "loading"} onClick={review}><Icon name="review" />Granska</button>}</div>
        <div className="workspace-status" role="status" aria-label="Utkaststatus"><strong>{state.status === "loading" ? "Skapar utkast…" : reviewStatus === "loading" ? "Granskar utkast…" : state.result
          ? reviewStatus === "complete" ? "Utkast skapat · kontroll genomförd" : reviewStatus === "stale" ? "Utkast skapat · granskning inaktuell"
          : reviewStatus === "incomplete" ? "Utkast skapat · granskning ofullständig" : "Utkast skapat · ej granskat" : "Inget utkast skapat"}</strong><span>Källversion {state.input.sourceRevision} · Utkastversion {state.draftRevision}</span></div>
        {configurationError && <div className="error" role="alert" aria-label="Konfigurationsfel"><strong>Generering är inte tillgänglig</strong><p>{configurationError}</p></div>}
        {state.error && <div className="error" role="alert" aria-label="Utkastfel"><strong>Utkastet kunde inte skapas</strong><p>{state.error}</p></div>}
        {staleSource && <div className="stale-notice" role="note">Underlaget har ändrats. Utkastets hänvisningar gäller tidigare underlag. Välj Granska för att uppdatera källversionen och behålla dina redigeringar.</div>}
        <div className={`workspace workspace-${activeTab}`}>
          <section id="panel-source" className="source-panel" hidden={activeTab !== "source"} aria-label="Underlag">
            <SourceInputForm examples={examples} key={state.caseId} caseId={state.caseId} input={state.input} busy={state.status === "loading"} hasDraft={!!state.result}
              generationAvailable={mode !== null} mode={mode} onCaseChange={changeCase} onChange={changeSource} onGenerate={generate} />
            {state.result && <details className="source-passages-disclosure" open={!!selection && !selection.id.startsWith("claim-")}><summary>Källpassager i utkastet</summary><SourcePanel snapshot={state.result.snapshot} selectedSourceId={selection?.id ?? null} stale={staleSource} /></details>}
          </section>
          <section id="panel-draft" className="draft-panel" hidden={activeTab === "source"} aria-label="Intygsutkast" aria-busy={state.status === "loading"}>
            <div className="document-toolbar"><span><Icon name="document" /> Läkarintyg för sjukpenning</span><span>FK7804</span></div>
            {state.status === "loading" && <div className="draft-loading" role="status"><span className="loading-orbit" /><h2>Formulerar ditt utkast…</h2><p>Underlaget struktureras och knyts till källorna.</p></div>}
            {!state.result && state.status !== "loading" && <div className="draft-empty"><Icon name="document" /><h2>Ditt utkast får plats här.</h2><p>Lägg till underlag och skapa ditt första intygsutkast.</p><Link href="/underlag" className="secondary-button">Till underlag</Link></div>}
            {state.result && <div className="document-paper"><div className="document-heading"><p className="eyebrow">LÄKARINTYG FÖR SJUKPENNING</p><h2>Intygsutkast</h2><span className="document-draft-label">UTKAST</span></div>
              {activeTab === "review" && <div className="review-legend"><span><i />Behöver uppmärksamhet</span><span><i className="legend-conflict" />Källstöd / motsägelse</span>{reviewStatus === "stale" && <span>Tidigare markeringar är inaktuella</span>}</div>}
              <CertificateEditor state={state} result={state.result} reviewMode={activeTab === "review"} onFinding={(id) => setSelection({ id: `finding-${id}` })}
                onEdit={(claimId, text) => { controllerRef.current?.abort(); reviewControllerRef.current?.abort(); dispatch({ type: "claimEdited", claimId, text }); }} onSourceSelect={selectSource} />
              <div className="document-end">Utkast för läkarens genomgång · Asteria</div>
            </div>}
          </section>
          <aside id="panel-review" className="review-panel" hidden={activeTab !== "review"} aria-label="Granskningsfynd" aria-busy={reviewStatus === "loading"}>
            <FindingsPanel key={`findings-${state.caseId}`} draft={state.result} review={state.review} previousReview={state.previousReview} status={reviewStatus} error={state.reviewError}
              canReview={canReview} sourceStale={staleSource} onReview={review} dispositions={state.dispositions}
              onDisposition={(findingId, status, note) => dispatch({ type: "findingDisposition", findingId, status, note })} onSource={selectSource} onClaim={selectClaim}
              onQuestion={() => { const assessment = state.input.referenceMaterials?.find((item) => item.type === "assessment"); setSelection({ id: assessment ? `material-text-${assessment.id}` : state.caseId !== "custom" || state.input.clinicianAssessmentText ? "assessment" : "clinician-addition" }); setActiveTab("source"); }} />
            <ReportDownload key={`report-${state.caseId}`} state={state} />
          </aside>
        </div>
        <footer><span><strong>Asteria</strong> · Ingen överföring till Försäkringskassan.</span><span>Arbetet behålls mellan stegen men sparas inte vid omladdning.</span></footer>
      </main>
    </div>
  </div>;
}
