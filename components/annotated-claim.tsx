"use client";

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type MouseEvent } from "react";
import { MAX_TEXT_CHARACTERS, type DraftClaim, type Finding, type SourceSnapshot } from "../lib/schemas";
import { highlightSegments } from "../lib/text-annotations";
import { validateEvidenceReferences } from "../lib/evidence";
import { EvidenceHover, type EvidenceHoverHandle } from "./evidence-reference";

/** A native textarea over a text mirror preserves editing/undo while allowing inline marks. */
export function AnnotatedClaim({ claim, snapshot, findings, label, id, onEdit, onSource, onFinding }: {
  claim: DraftClaim; snapshot: SourceSnapshot; findings: Finding[]; label: string; id: string;
  onEdit: (text: string) => void; onSource: (id: string) => void; onFinding?: (id: string) => void;
}) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const mirror = useRef<HTMLDivElement>(null);
  const popup = useRef<EvidenceHoverHandle>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hovered = useRef<number | null>(null);
  const [editing, setEditing] = useState(false);
  const refs = validateEvidenceReferences(claim.evidenceRefs, snapshot).validRefs;
  const segments = highlightSegments(claim, findings).map((segment) => ({ ...segment,
    references: validateEvidenceReferences(segment.references, snapshot).validRefs,
  }));
  function cancel() { if (timer.current) clearTimeout(timer.current); }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useLayoutEffect(() => {
    const element = textarea.current;
    if (!element) return;
    const resize = () => {
      if (!element.clientWidth) return;
      const previous = element.style.height;
      element.style.height = "auto";
      const height = `${element.scrollHeight + 2}px`;
      element.style.height = height;
      if (height !== previous) popup.current?.close();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [claim.text]);

  function hit(event: MouseEvent | PointerEvent): number | null {
    for (const mark of mirror.current?.querySelectorAll<HTMLElement>("[data-highlight]") ?? []) {
      if ([...mark.getClientRects()].some((rect) => event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom)) return Number(mark.dataset.highlight);
    }
    return null;
  }
  function hover(event: MouseEvent) {
    if (editing || (event.target instanceof Element && event.target.closest(".reference-preview"))) return;
    const index = hit(event);
    if (index === hovered.current) return;
    cancel(); hovered.current = index;
    if (index === null) { popup.current?.close(); return; }
    const point = { x: event.clientX, y: event.clientY };
    const segment = segments[index];
    timer.current = setTimeout(() => popup.current?.openAt(point, segment.references, segment.findings), 180);
  }
  return <EvidenceHover references={refs} findings={findings} snapshot={snapshot} stale={claim.supportStatus === "stale"}
    managed handleRef={popup} label={label} onSource={onSource} onFinding={onFinding}>
    <div className={`annotated-claim ${editing ? "is-editing" : ""}`} onMouseMove={hover}
      onMouseLeave={() => { cancel(); hovered.current = null; }}
      onPointerUp={(event) => {
        if (event.pointerType !== "touch") return;
        const index = hit(event), segment = index === null ? null : segments[index];
        popup.current?.openAt({ x: event.clientX, y: event.clientY }, segment?.references ?? refs, segment?.findings ?? findings);
      }}>
      <div className="claim-text-mirror" ref={mirror} aria-hidden="true">{segments.map((segment, index) => {
        const highlight = segment.findings.length > 0 || segment.references.length > 0;
        const conflict = segment.findings.some((finding) => finding.actionType === "unsupported_or_conflicting");
        return highlight ? <mark key={index} data-highlight={index} data-start={segment.start} data-end={segment.end}
          className={`${segment.findings.length ? conflict ? "review-text-highlight conflict-highlight" : "review-text-highlight" : "source-text-highlight"} ${claim.supportStatus === "stale" ? "stale-text-highlight" : ""}`}>{segment.text}</mark> : segment.text;
      })}{claim.text.endsWith("\n") ? "\u200b" : ""}</div>
      <span id={`${id}-help`} className="visually-hidden">Markerade fraser har källunderlag eller granskningsfynd. Håll pekaren över en markering. Alt och pil ned öppnar uppgifterna med tangentbordet.</span>
      <textarea ref={textarea} id={id} rows={1} maxLength={MAX_TEXT_CHARACTERS} value={claim.text}
        aria-describedby={`${id}-help`}
        onFocus={() => { cancel(); setEditing(true); }} onBlur={() => setEditing(false)}
        onChange={(event) => { cancel(); hovered.current = null; popup.current?.close(); onEdit(event.target.value); }}
        onKeyDown={(event) => {
          if (event.altKey && event.key === "ArrowDown") { event.preventDefault(); cancel(); popup.current?.openAt(null, refs, findings, true); }
        }} />
    </div>
  </EvidenceHover>;
}
