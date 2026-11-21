import "server-only";
import { createHash } from "node:crypto";
import { sourceInputSchema, sourceSnapshotSchema, type SourceSnapshot } from "../schemas";
import { buildSourcePassages } from "../sources";

function freezeDeep<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}

/** Server-assigned, case/revision/content-scoped IDs. Original inputs are copied. */
export function createSourceSnapshot(caseId: string, rawInput: unknown): SourceSnapshot {
  const input = sourceInputSchema.parse(rawInput);
  const digest = createHash("sha256").update(JSON.stringify({ caseId, input })).digest("hex");
  const id = `src-${digest}`;
  return freezeDeep(sourceSnapshotSchema.parse({
    id, caseId, sourceRevision: input.sourceRevision, input,
    passages: buildSourcePassages(id, input),
  }));
}

/** Reconstruct a round-tripped snapshot; never trust client passage IDs or text. */
export function validateSourceSnapshot(value: unknown): SourceSnapshot {
  const supplied = sourceSnapshotSchema.parse(value);
  const expected = createSourceSnapshot(supplied.caseId, supplied.input);
  if (JSON.stringify(supplied) !== JSON.stringify(expected)) {
    throw new Error("Källversionen stämmer inte överens med originalunderlaget.");
  }
  return expected;
}
