import "server-only";
import { reviewRequestSchema, reviewResultSchema, type ApiError, type Finding, type ReviewRequest } from "../schemas";
import { deterministicReview, mergeReviewFindings } from "../review";
import { ConfigurationError } from "./config";
import { ApplicationError } from "./errors";
import type { CertificateProvider } from "./provider";
import { getCertificateProvider } from "./provider-factory";
import { validateReviewOutput } from "./provider-output";
import { readJsonRequest } from "./request-body";
import { validateSourceSnapshot } from "./source-snapshot";

function safeError(error: unknown, requestId: string): { body: ApiError; status: number } {
  if (error instanceof ApplicationError) return { body: { code: error.code, message: error.message, retryable: error.retryable, requestId }, status: error.status };
  if (error instanceof ConfigurationError) return { body: { code: "PROVIDER_UNAVAILABLE", message: error.message, retryable: false, requestId }, status: 503 };
  return { body: { code: "GENERATION_FAILED", message: "Granskningen kunde inte slutföras. Intygstexten finns kvar. Försök igen.", retryable: true, requestId }, status: 500 };
}

export function createReviewHandler(providerFactory: () => CertificateProvider = getCertificateProvider) {
  return async function handleReview(request: Request): Promise<Response> {
    let requestId = crypto.randomUUID();
    let input: ReviewRequest | null = null;
    let codeFindings: Finding[] = [];
    const headers = { "Cache-Control": "no-store" };
    try {
      const parsed = await readJsonRequest(request, reviewRequestSchema);
      requestId = parsed.requestId;
      let snapshot;
      try { snapshot = validateSourceSnapshot(parsed.snapshot); }
      catch { throw new ApplicationError("INVALID_INPUT", "Källversionen stämmer inte med originalunderlaget. Skapa ett nytt utkast.", 400); }
      input = parsed;
      codeFindings = deterministicReview(snapshot, input.draft);
      const output = await providerFactory().review({ snapshot, draft: input.draft }, { signal: request.signal });
      const validated = validateReviewOutput(snapshot, input.draft, output);
      return Response.json(reviewResultSchema.parse({
        requestId, sourceRevision: input.sourceRevision, draftRevision: input.draftRevision,
        findings: mergeReviewFindings(codeFindings, validated.findings, requestId), completionStatus: "complete", metadata: validated.metadata, error: null,
      }), { headers });
    } catch (error) {
      const safe = safeError(error, requestId);
      // Provider failures retain deterministic findings and explicitly mark the review incomplete.
      if (input) return Response.json(reviewResultSchema.parse({
        requestId, sourceRevision: input.sourceRevision, draftRevision: input.draftRevision,
        findings: mergeReviewFindings(codeFindings, [], requestId), completionStatus: "incomplete", metadata: null, error: safe.body,
      }), { headers });
      return Response.json(safe.body, { status: safe.status, headers });
    }
  };
}
