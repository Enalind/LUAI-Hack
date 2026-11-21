import Link from "next/link";
import { ConfigurationError, getServerConfig } from "@/lib/server/config";
import { Workspace } from "@/components/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function Home() {
  let mode: "mock" | "live" | null = null;
  let configurationError: string | null = null;
  try {
    mode = getServerConfig().mode;
  } catch (error) {
    configurationError = error instanceof ConfigurationError ? error.message : "Serverkonfigurationen kunde inte läsas.";
  }
  return <>
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
          <h1 id="page-title">Från underlag till intygsutkast.</h1>
          <p className="intro-copy">Samla uppgifterna, redigera formuleringarna och följ varje påstående till sin källa.</p>
        </div>
        <p className="intro-note">Läkarens bedömning och beslut står i centrum.<br />Granska alltid innehållet innan det används.</p>
      </section>
      <Workspace mode={mode} configurationError={configurationError} />
      <footer><span>Endast fiktiva uppgifter. Ingen överföring till Försäkringskassan.</span><span>Arbetet sparas inte vid omladdning.</span></footer>
    </main>
  </>;
}
