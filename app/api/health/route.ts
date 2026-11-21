import { ConfigurationError, getServerConfig } from "@/lib/server/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const requestId = crypto.randomUUID();
  try {
    const { mode } = getServerConfig();
    return Response.json({ status: "ok", mode, checkpoint: "CP2" }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return Response.json({
      code: "CONFIGURATION_ERROR",
      message: error instanceof ConfigurationError ? error.message : "Serverkonfigurationen kunde inte läsas.",
      requestId,
      retryable: false,
    }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
