"use client";

import { useCallback, useEffect, useId, useImperativeHandle, useRef, useState, type CSSProperties, type ReactNode, type Ref } from "react";
import type { EvidenceRef, Finding, SourceSnapshot } from "../lib/schemas";
import { FkGuidanceReference } from "./fk-guidance-reference";

const origins = { consultation: "Besöksunderlag", clinician_assessment: "Läkarens bedömning", clinician_decision: "Läkarens beslut", reference_material: "Referensmaterial" };

/** Citations live outside the document flow; the text itself is the hover target. */
export type EvidenceHoverHandle = { openAt: (point: { x: number; y: number } | null, references: EvidenceRef[], findings?: Finding[], focus?: boolean) => void; close: () => void };
export function EvidenceHover({ references, snapshot, children, stale = false, label, onSource, findings = [], onFinding, managed = false, handleRef }: {
  references: EvidenceRef[]; snapshot: SourceSnapshot; children: ReactNode; stale?: boolean;
  label: string; onSource: (id: string) => void;
  findings?: Finding[]; onFinding?: (id: string) => void; managed?: boolean; handleRef?: Ref<EvidenceHoverHandle>;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<CSSProperties>({});
  const anchor = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();
  const [selection, setSelection] = useState<{ references: EvidenceRef[]; findings: Finding[] } | null>(null);
  const activeFindings = selection?.findings ?? findings;
  const refs = (selection?.references ?? references).flatMap((reference) => {
    const passage = snapshot.passages.find((item) => item.id === reference.sourceId);
    return passage ? [{ reference, passage, number: snapshot.passages.indexOf(passage) + 1 }] : [];
  });
  const clearTimer = useCallback(() => { if (timer.current) clearTimeout(timer.current); }, []);
  const scheduleClose = useCallback(() => {
    clearTimer();
    timer.current = setTimeout(() => {
      if (!anchor.current?.querySelector(".reference-preview")?.contains(document.activeElement)) setOpen(false);
    }, 180);
  }, [clearTimer]);
  const show = useCallback(() => {
    clearTimer();
    const rect = anchor.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(420, window.innerWidth - 32);
    const height = Math.min(340, window.innerHeight * .55);
    const left = pointer.current?.x ?? rect.left;
    const top = pointer.current ? pointer.current.y + 18 : rect.bottom + 8;
    setPosition({ left: Math.max(16, Math.min(left, window.innerWidth - width - 16)), top: Math.max(16, Math.min(top, window.innerHeight - height - 16)) });
    setOpen(true);
  }, [clearTimer]);
  useImperativeHandle(handleRef, () => ({
    openAt(point, refs, issues = [], focus = false) {
      pointer.current = point; setSelection({ references: refs, findings: issues }); show();
      if (focus) requestAnimationFrame(() => anchor.current?.querySelector<HTMLButtonElement>(".reference-open")?.focus({ preventScroll: true }));
    },
    close() { clearTimer(); setOpen(false); },
  }), [clearTimer, show]);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !anchor.current?.contains(event.target)) close(); };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", close);
    return () => { document.removeEventListener("pointerdown", outside); window.removeEventListener("resize", close); };
  }, [open]);
  useEffect(() => clearTimer, [clearTimer]);
  return <div ref={anchor} className={`cited-text ${refs.length ? "has-citations" : ""}`}
    onMouseEnter={(event) => { clearTimer(); if (open || managed) return; pointer.current = { x: event.clientX, y: event.clientY }; if (refs.length || activeFindings.length) timer.current = setTimeout(show, 220); }}
    onMouseLeave={scheduleClose}
    onPointerUp={(event) => { if (!managed && event.pointerType === "touch" && (refs.length || activeFindings.length) && !(event.target instanceof Element && event.target.closest(".reference-preview"))) { pointer.current = { x: event.clientX, y: event.clientY }; show(); } }}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) { clearTimer(); setOpen(false); } }}
    onInput={() => { clearTimer(); setOpen(false); }}
    onKeyDown={(event) => {
      if (event.key === "Escape") { event.stopPropagation(); clearTimer(); setOpen(false); }
      if (!managed && event.altKey && event.key === "ArrowDown" && (refs.length || activeFindings.length)) {
        event.preventDefault(); pointer.current = null; show();
        requestAnimationFrame(() => anchor.current?.querySelector<HTMLButtonElement>(".reference-open")?.focus({ preventScroll: true }));
      }
    }}>
    {children}
    {open && (refs.length > 0 || activeFindings.length > 0) && <div id={id} role="dialog" aria-label={label} className="reference-preview" style={position}
      onMouseEnter={clearTimer} onMouseLeave={scheduleClose}>
      <div className="reference-preview-heading"><strong>{activeFindings.length ? "Granskning" : stale ? "Tidigare källstöd" : "Källunderlag"}</strong><span>{activeFindings.length ? `${activeFindings.length} fynd` : `${refs.length} ${refs.length === 1 ? "hänvisning" : "hänvisningar"}`}</span></div>
      {stale && <p className="reference-stale">Texten har ändrats. Hänvisningarna hör till en tidigare formulering och behöver granskas.</p>}
      <div className="reference-passages">
        {activeFindings.map((finding) => <section className={`hover-finding ${finding.actionType === "unsupported_or_conflicting" ? "hover-conflict" : ""}`} key={finding.id}>
          <strong>{finding.actionType === "unsupported_or_conflicting" ? "Kontrollera formuleringen" : "Behöver förtydligas"}</strong>
          <p>{finding.explanation}</p>{finding.question && <p>{finding.question}</p>}
          <FkGuidanceReference ruleIds={finding.guidelineRuleIds} />
          {onFinding && <button type="button" className="reference-open text-button" onClick={() => { setOpen(false); onFinding(finding.id); }}>Visa granskningsfynd</button>}
        </section>)}
        {refs.map(({ reference, passage, number }, index) => {
        const start = passage.text.indexOf(reference.exactQuote);
        return <section className="reference-passage" key={`${reference.sourceId}-${index}`}>
          <div className="reference-preview-meta">{passage.materialTitle ?? origins[passage.origin]} · Källversion {snapshot.sourceRevision}</div>
          <blockquote className="reference-quote">{start >= 0 ? <>{passage.text.slice(0, start)}<mark>{reference.exactQuote}</mark>{passage.text.slice(start + reference.exactQuote.length)}</> : reference.exactQuote}</blockquote>
          <button type="button" className="reference-open text-button" aria-label={`${stale ? "Visa tidigare källa" : "Visa källa"} ${number} ${label}`} onClick={() => { setOpen(false); onSource(passage.id); }}>Öppna originalunderlaget</button>
        </section>;
      })}</div>
      <div className="reference-preview-footer">Alt + ↓ öppnar källunderlaget · Esc stänger</div>
    </div>}
  </div>;
}
