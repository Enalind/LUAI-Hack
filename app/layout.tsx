import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Intyg som håller · Prototyp",
  description: "En prototyp för källanknutna intygsutkast. Endast fiktiva patientfall.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sv">
      <body>
        <a className="skip-link" href="#main">Till innehållet</a>
        <div className="prototype-notice">Prototyp – endast fiktiva patientfall</div>
        {children}
      </body>
    </html>
  );
}
