import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const manrope = localFont({ src: "../public/fonts/Manrope-Variable.woff2", variable: "--font-manrope", display: "swap", weight: "200 800" });
const newsreader = localFont({ src: "../public/fonts/Newsreader-Variable.woff2", variable: "--font-newsreader", display: "swap", weight: "200 800" });

export const metadata: Metadata = {
  title: "Asteria · Intygsstöd · Prototyp",
  description: "Asteria – AI-stöd för klinisk dokumentation. Strukturera, granska och förtydliga källanknutna intygsutkast. Endast fiktiva patientfall.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sv" className={`${manrope.variable} ${newsreader.variable}`}>
      <body>
        <a className="skip-link" href="#main">Till innehållet</a>
        <div className="prototype-notice">Prototyp – endast fiktiva patientfall</div>
        {children}
      </body>
    </html>
  );
}
