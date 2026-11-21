import { diagnosisCatalogue, lookupDiagnosisCode, searchDiagnosisCodes } from "../../../lib/server/diagnosis-codes";

export const runtime = "nodejs";
export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = params.get("q") ?? "";
  if (query.length > 150) return Response.json({ message: "Sökningen får vara högst 150 tecken." }, { status: 400 });
  const code = params.get("code");
  if (code && code.length > 20) return Response.json({ message: "Ogiltig kod." }, { status: 400 });
  return Response.json({ catalogue: diagnosisCatalogue, results: searchDiagnosisCodes(query), match: code ? lookupDiagnosisCode(code) : null }, { headers: { "Cache-Control": "no-store" } });
}
