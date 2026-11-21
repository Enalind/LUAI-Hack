import "server-only";
import { draftRequestSchema, sourceSnapshotResponseSchema } from "../schemas";
import { readJsonRequest } from "./request-body";
import { createSourceSnapshot } from "./source-snapshot";
import { ApplicationError } from "./errors";

/** Source refresh is deterministic and never imports/selects a provider. */
export async function updateSourceSnapshot(request: Request): Promise<Response> {
  let requestId = crypto.randomUUID();
  const headers = { "Cache-Control": "no-store" };
  try {
    const input = await readJsonRequest(request, draftRequestSchema);
    requestId = input.requestId;
    return Response.json(sourceSnapshotResponseSchema.parse({ requestId, sourceRevision: input.sourceRevision, draftRevision: input.draftRevision,
      snapshot: createSourceSnapshot(input.caseId, input.input) }), { headers });
  } catch (error) {
    const known = error instanceof ApplicationError;
    return Response.json({ requestId, code: known ? error.code : "GENERATION_FAILED",
      message: known ? error.message : "Källversionen kunde inte uppdateras. Dina ändringar finns kvar.", retryable: known ? error.retryable : true },
    { status: known ? error.status : 500, headers });
  }
}
