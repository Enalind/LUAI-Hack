"use client";

import type { SourceSnapshot } from "../lib/schemas";

const origins = [
  ["consultation", "Besöksunderlag"],
  ["clinician_assessment", "Läkarens bedömning"],
  ["clinician_decision", "Läkarens beslut"],
  ["reference_material", "Referensmaterial"],
] as const;
const decisionLabels = { diagnosisText: "Diagnos", diagnosisCode: "Diagnoskod", leaveExtent: "Sjukskrivningsgrad", startDate: "Från och med", endDate: "Till och med" };

export function SourcePanel({ snapshot, selectedSourceId, stale }: { snapshot: SourceSnapshot | null; selectedSourceId: string | null; stale: boolean }) {
  return (
    <section className="source-snapshot" aria-labelledby="snapshot-title">
      <h3 id="snapshot-title">Källor för detta utkast</h3>
      {!snapshot ? <p className="input-help">Numrerade källpassager visas när ett utkast har skapats.</p> : <>
        <p className="input-help">Källversion {snapshot.sourceRevision}. {stale ? "Tidigare underlag – inmatningen har ändrats." : "Samma underlag som användes vid skapandet."}</p>
        {origins.map(([origin, title]) => {
          const passages = snapshot.passages.filter((passage) => passage.origin === origin);
          return <section className="source-group" key={origin} aria-label={`Källpassager: ${title}`}>
            <h4>{title}</h4>
            {passages.length === 0 && <p className="input-help">Ingen uppgift angiven.</p>}
            {passages.map((passage) => {
              const number = snapshot.passages.findIndex(({ id }) => id === passage.id) + 1;
              const selected = selectedSourceId === passage.id;
              return <article id={passage.id} key={passage.id} tabIndex={-1} className={`source-passage ${selected ? "selected-source" : ""}`} aria-label={`Källa ${number}: ${title}`}>
                <div className="source-passage-heading"><strong>Källa {number}{passage.materialTitle && ` · ${passage.materialTitle}`}</strong>{selected && <span className="selected-label">Vald källa</span>}</div>
                {passage.decisionField && <span className="input-help">{decisionLabels[passage.decisionField]}</span>}
                <p>{passage.text}</p>
              </article>;
            })}
          </section>;
        })}
      </>}
    </section>
  );
}
