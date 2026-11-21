"use client";

import { useEffect, useRef, useState } from "react";
import { copyWarnings, createReviewReport, fieldText } from "../lib/export";
import type { WorkspaceState } from "../lib/workspace-state";
import type { FieldId } from "../lib/schemas";

export function FieldCopy({ state, fieldId }: { state: WorkspaceState; fieldId: FieldId }) {
  const [confirmation, setConfirmation] = useState<WorkspaceState | null>(null);
  const [fallback, setFallback] = useState<WorkspaceState | null>(null);
  const [copied, setCopied] = useState<WorkspaceState | null>(null);
  const current = useRef(state);
  useEffect(() => { current.current = state; }, [state]);
  const text = fieldText(state, fieldId);
  async function copy() {
    setConfirmation(null);
    try {
      await navigator.clipboard.writeText(text);
      if (current.current === state) setCopied(state);
    } catch { if (current.current === state) setFallback(state); }
  }
  return <div className="field-export">
    <button type="button" className="secondary-button" disabled={!text} onClick={() => {
      setCopied(null); setFallback(null);
      if (copyWarnings(state, fieldId).length) setConfirmation(state); else void copy();
    }}>Kopiera fält {fieldId}</button>
    {copied === state && <p role="status">Fält {fieldId} kopierat.</p>}
    {confirmation === state && <div role="dialog" aria-modal="false" aria-label={`Bekräfta kopiering av fält ${fieldId}`} className="copy-confirmation">
      <strong>Granskning återstår</strong><ul>{copyWarnings(state, fieldId).map((warning) => <li key={warning}>{warning}</li>)}</ul>
      <button type="button" className="secondary-button" onClick={() => void copy()}>Kopiera ändå</button>{" "}
      <button type="button" className="text-button" onClick={() => setConfirmation(null)}>Avbryt</button>
    </div>}
    {fallback === state && <div role="status"><p>Urklipp är inte tillgängligt. Markera och kopiera texten nedan.</p>
      <textarea aria-label={`Text att kopiera från fält ${fieldId}`} readOnly value={text} rows={5} onFocus={(event) => event.currentTarget.select()} />
    </div>}
  </div>;
}

export function ReportDownload({ state }: { state: WorkspaceState }) {
  const [includeSources, setIncludeSources] = useState(false);
  function download() {
    const url = URL.createObjectURL(new Blob([createReviewReport(state, includeSources)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url; link.download = `granskningsrapport-${state.caseId}-v${state.draftRevision}.json`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="report-export">
    <label><input type="checkbox" checked={includeSources} onChange={(event) => setIncludeSources(event.target.checked)} /> Inkludera fiktivt källunderlag och källcitat i rapporten</label>
    <button type="button" className="secondary-button" disabled={!state.result} onClick={download}>Ladda ner granskningsrapport</button>
    <p className="input-help">Separat JSON-rapport med versioner, fynd, åtgärder och mock/live-märkning. Arbetsytan sparas inte efter omladdning.</p>
  </div>;
}
