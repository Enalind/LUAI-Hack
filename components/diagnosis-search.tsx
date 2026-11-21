"use client";

import { useEffect, useId, useState } from "react";
import type { ExplicitDecision } from "../lib/schemas";

type Code = { code: string; title: string; selectable: boolean; notPrimary: boolean };
export function DiagnosisSearch({ decision, onChange }: { decision: ExplicitDecision; onChange: (change: Partial<ExplicitDecision>) => void }) {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<{ key: string; results: Code[]; match: Code | null } | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [closed, setClosed] = useState(true);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const key = `${query}|${decision.diagnosisCode ?? ""}`;
  const current = response?.key === key ? response : null;
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query, code: decision.diagnosisCode ?? "" });
        const result = await fetch(`/api/diagnosis-codes?${params}`, { signal: controller.signal });
        if (!result.ok) throw new Error();
        const body = await result.json();
        if (!controller.signal.aborted) setResponse({ key, ...body });
      } catch { if (!controller.signal.aborted) setErrorKey(key); }
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, decision.diagnosisCode, key]);
  const open = !closed && query.trim().length >= 2;
  function choose(code: Code) {
    if (!code.selectable || code.notPrimary) return;
    onChange({ diagnosisCode: code.code, diagnosisText: code.title });
    setQuery(""); setClosed(true); setActive(-1);
  }
  return <div className="diagnosis-search">
    <label htmlFor="diagnosis-lookup">Sök diagnos eller ICD-10-SE-kod</label>
    <div className="lookup-container" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setClosed(true); }}>
      <input id="diagnosis-lookup" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listId}
        aria-activedescendant={open && active >= 0 && current?.results[active] ? `${listId}-${active}` : undefined}
        autoComplete="off" placeholder="Sök till exempel lumbago eller M54.5" maxLength={150} value={query}
        onFocus={() => setClosed(false)} onChange={(event) => { setQuery(event.target.value); setClosed(false); setActive(-1); }}
        onKeyDown={(event) => {
          if (event.key === "Escape") { setClosed(true); return; }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault(); setClosed(false);
            setActive((index) => Math.max(0, Math.min((current?.results.length ?? 1) - 1, index + (event.key === "ArrowDown" ? 1 : -1))));
          }
          if (event.key === "Enter") {
            event.preventDefault(); const code = current?.results[active];
            if (open && code?.selectable && !code.notPrimary) choose(code);
          }
        }} />
      {open && <div className="diagnosis-results">
        <div className="lookup-caption">ICD-10-SE · Utgåva 2026</div>
        <div role="listbox" id={listId} aria-label="Diagnoskoder">{current?.results.map((code, index) => <button type="button" role="option" id={`${listId}-${index}`} aria-selected={active === index}
          disabled={!code.selectable || code.notPrimary} key={code.code} tabIndex={-1}
          onPointerDown={(event) => {
            // Keep combobox focus until click selects the result. Some browsers
            // otherwise blur with relatedTarget=null and remove it before click.
            if (event.button === 0) event.preventDefault();
          }}
          onClick={() => choose(code)}><strong>{code.code}</strong><span>{code.title}{!code.selectable && <small>Välj en mer specificerad kod</small>}{code.notPrimary && <small>Kan inte användas som huvuddiagnos</small>}</span></button>)}</div>
        {!current && <p role="status">{errorKey === key ? "Kodverket kunde inte läsas. Försök igen." : "Söker i kodverket…"}</p>}
        {current?.results.length === 0 && <p>Ingen matchande kod. Prova en kod eller en annan sökterm.</p>}
      </div>}
    </div>
    <div className="diagnosis-selected"><div><label htmlFor="diagnosis">Diagnos</label><textarea id="diagnosis" rows={2} value={decision.diagnosisText ?? ""} maxLength={30000} onChange={(event) => onChange({ diagnosisText: event.target.value || null })} /></div>
      <div><label htmlFor="diagnosis-code">Diagnoskod</label><input id="diagnosis-code" value={decision.diagnosisCode ?? ""} maxLength={20} onChange={(event) => onChange({ diagnosisCode: event.target.value || null })} /></div></div>
    <p className={`input-help ${decision.diagnosisCode && current && (!current.match || !current.match.selectable || current.match.notPrimary) ? "needs-attention" : ""}`} role="status">
      {decision.diagnosisCode ? !current ? errorKey === key ? "Kodverket kunde inte läsas. Försök igen." : "Kontrollerar kod…" : current.match?.selectable && !current.match.notPrimary ? `${current.match.code} · ${current.match.title} · Verifierad i ICD-10-SE 2026` : "Välj en giltig, specificerad huvuddiagnoskod från sökningen." : "Välj en kod från det officiella kodverket. Diagnos och kod beslutas av läkaren."}
    </p>
    <a className="catalogue-link" href="https://samarbetsyta.ehalsomyndigheten.se/spaces/IR2/pages/451267009" target="_blank" rel="noreferrer">Källa: Socialstyrelsen / E-hälsomyndigheten · ICD-10-SE 2026</a>
  </div>;
}
