import Link from "next/link";
import { ConfigurationError, getServerConfig } from "@/lib/server/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fields = [
  ["3", "Sysselsättning", "Yrke, arbetsuppgifter och relevanta krav."],
  ["5", "Funktionsnedsättning", "Beskrivning och dokumenterad bedömningsgrund."],
  ["6", "Aktivitetsbegränsning", "Bedömda begränsningar i relation till arbetet."],
  ["7", "Medicinsk behandling", "Dokumenterad pågående eller planerad behandling."],
];

export default function Home() {
  let mode: "mock" | "live" | undefined;
  let configurationError: string | undefined;
  try {
    mode = getServerConfig().mode;
  } catch (error) {
    configurationError = error instanceof ConfigurationError
      ? error.message
      : "Serverkonfigurationen kunde inte läsas.";
  }

  return (
    <>
      <header className="header">
        <Link className="brand" href="/" aria-label="Intyg som håller, startsida">
          <span className="brand-mark" aria-hidden="true">i</span>
          <span>Intyg som håller<span className="brand-subtitle">Från underlag till tydligare intyg</span></span>
        </Link>
        <span className={`mode-badge ${mode === "live" ? "live" : ""}`}>
          {mode === "mock" ? "Mock-läge · ingen modellanslutning" : mode === "live" ? "Live-läge · serverkonfigurerat" : "Konfigurationsfel"}
        </span>
      </header>

      <main id="main">
        <section className="intro" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">Arbetsyta för intyg · FK7804</p>
            <h1 id="page-title">Ett tydligt intyg börjar<br className="desktop-break" /> med ett tydligt underlag.</h1>
            <p className="intro-copy">Samla underlag, följ källorna och granska formuleringarna.<br />Läkarens bedömning och beslut står i centrum.</p>
          </div>
          <aside className="checkpoint" aria-label="Implementationsstatus">
            <span className="eyebrow">Första byggsteget</span>
            <strong>CP0 · Teknisk grund</strong>
            <p>Arbetsytan är förberedd. Inmatning, utkast och granskning kommer i följande byggsteg.</p>
          </aside>
        </section>

        {configurationError && <div className="error" role="alert"><strong>Konfigurationen behöver åtgärdas</strong><p>{configurationError}</p></div>}

        <div className="workspace">
          <section className="panel source-panel" aria-labelledby="source-title">
            <div className="panel-heading"><h2 id="source-title">Underlag</h2><span className="tag">Källor</span></div>
            <p className="panel-description">Besöksunderlag och läkarens bedömning hålls åtskilda.</p>
            <div className="empty-source"><span className="document-icon" aria-hidden="true">≡</span><h3>Här börjar ditt utkast</h3><p>Fiktiva exempel och källinmatning blir tillgängliga i nästa byggsteg.</p></div>
            <div className="decision-note"><h3>Läkarens beslut</h3><p>Diagnos, sjukskrivningsgrad och datum anges uttryckligen av läkaren. Saknade beslut förblir tomma.</p></div>
          </section>

          <section className="panel draft-panel" aria-labelledby="draft-title">
            <div className="panel-heading"><h2 id="draft-title">Intygsutkast</h2><span className="tag">Ej skapat</span></div>
            <p className="panel-description">Fyra fält med redigerbara, källanknutna påståenden.</p>
            <div className="draft-fields">{fields.map(([id, title, description]) => <section className="field" key={id} aria-labelledby={`field-${id}`}><div className="field-heading"><span className="field-number">{id}</span><h3 id={`field-${id}`}>{title}</h3></div><p>{description}</p><span className="placeholder">Underlag saknas</span></section>)}</div>
          </section>

          <section className="panel review-panel" aria-labelledby="review-title">
            <div className="panel-heading"><h2 id="review-title">Granskning</h2><span className="tag">Ej körd</span></div>
            <p className="panel-description">En separat kontroll inför läkarens genomgång.</p>
            <div className="review-empty"><div className="review-symbol" aria-hidden="true">✓</div><h3>Plats för en andra genomgång</h3><p>Här visas informationsluckor, källstöd och förslag när granskningsflödet är implementerat.</p></div>
            <ul className="review-categories"><li>Arbetsuppgifter och krav</li><li>Samband med arbetet</li><li>Bedömningsgrund och attribution</li><li>Källstöd och motsägelser</li></ul>
            <p className="review-note">Ingen granskning har utförts. Prototypen fattar inga medicinska beslut.</p>
          </section>
        </div>
        <footer><span>Endast fiktiva uppgifter. Ingen överföring till Försäkringskassan.</span><span>Arbetet sparas inte vid omladdning.</span></footer>
      </main>
    </>
  );
}
