import "server-only";
import { draftRequestSchema, draftResponseSchema, type DraftResponse } from "../schemas";
import { ConfigurationError, getServerConfig } from "./config";
import { ApplicationError } from "./errors";
import { MockProvider } from "./mock-provider";
import type { CertificateProvider } from "./provider";
import { validateDraftOutput } from "./provider-output";
import { readJsonRequest } from "./request-body";
import { createSourceSnapshot } from "./source-snapshot";

function getDraftProvider(): CertificateProvider {
  const config = getServerConfig();
  if (config.mode === "live") {
    throw new ApplicationError("PROVIDER_UNAVAILABLE", "Live-generering är ännu inte tillgänglig. Välj AI_MODE=mock på servern för att använda de fiktiva exemplen.", 503);
  }
  return new MockProvider();
}

/** Validate before selecting or calling any provider. Injection is server/test-only. */
export function createDraftHandler(providerFactory: () => CertificateProvider = getDraftProvider) {
  return async function handleDraft(request: Request): Promise<Response> {
    let requestId = crypto.randomUUID();
    const headers = { "Cache-Control": "no-store" };
    try {
      const input = await readJsonRequest(request, draftRequestSchema);
      requestId = input.requestId;
      const snapshot = createSourceSnapshot(input.caseId, input.input);
      const output = await providerFactory().draft(snapshot);
      const validated = validateDraftOutput(snapshot, output);
      const result: DraftResponse = draftResponseSchema.parse({
        requestId, sourceRevision: input.sourceRevision, draftRevision: input.draftRevision,
        snapshot, ...validated,
      });
      return Response.json(result, { headers });
    } catch (error) {
      if (error instanceof ConfigurationError) {
        return Response.json({ code: "PROVIDER_UNAVAILABLE", message: error.message, requestId, retryable: false }, { status: 503, headers });
      }
      if (error instanceof ApplicationError) {
        return Response.json({ code: error.code, message: error.message, requestId, retryable: error.retryable }, { status: error.status, headers });
      }
      // Never return raw exceptions, source material or provider response bodies.
      return Response.json({ code: "GENERATION_FAILED", message: "Utkastet kunde inte skapas. Dina uppgifter finns kvar. Försök igen.", requestId, retryable: true }, { status: 500, headers });
    }
  };
}
