import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { sourceInputSchema, decisionsEqual, DECISION_FIELDS, type DraftDocument, type ProviderMetadata } from "../lib/schemas";
import type { CertificateProvider } from "../lib/server/provider";
import { createSourceSnapshot } from "../lib/server/source-snapshot";
import { validateDraftOutput, validateReviewOutput } from "../lib/server/provider-output";
import { deterministicReview, mergeReviewFindings } from "../lib/review";
import { validateEvidenceReferences } from "../lib/evidence";
import { ApplicationError } from "../lib/server/errors";

const caseSchema = z.strictObject({ id: z.enum(["H1", "H2", "H3"]), label: z.string(), adequate: z.boolean(), input: sourceInputSchema });
export type EvaluationCase = z.infer<typeof caseSchema>;
const digest = (content: string) => createHash("sha256").update(content).digest("hex");

/** Fail before selecting a provider if either frozen prompts or held-out evidence changed. */
export async function loadFrozenCases(limit: number, root = process.cwd()) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 3) throw new Error("Use a case limit from 1 to 3.");
  const read = (path: string) => readFile(`${root}/${path}`, "utf8");
  const freeze = JSON.parse(await read("evals/prompt-freeze.json")) as { promptFile: string; sha256: string };
  if (digest(await read(freeze.promptFile)) !== freeze.sha256) throw new Error("Frozen prompts changed; do not reuse the held-out claim.");
  const fixtures = JSON.parse(await read("evals/fixture-freeze.json")) as { files: Record<string, string> };
  for (const [path, expected] of Object.entries(fixtures.files)) {
    if (digest(await read(path)) !== expected) throw new Error("Frozen held-out fixtures or answer keys changed.");
  }
  const cases = await Promise.all(["H1", "H2", "H3"].slice(0, limit).map(async (id) => caseSchema.parse(JSON.parse(await read(`fixtures/held-out/${id}.json`)))));
  return { cases, promptSha256: freeze.sha256, fixtureSha256: fixtures.files };
}

function failure(error: unknown, started: number) {
  return { status: "FAILED" as const, code: error instanceof ApplicationError ? error.code : "EVALUATION_FAILED", elapsedMs: Date.now() - started, metadata: null };
}
function refsFor(draft: DraftDocument) { return draft.sections.flatMap(({ claims }) => claims.flatMap(({ evidenceRefs }) => evidenceRefs)); }

/** One draft and (only if draft succeeded) one review per case; no model grading or retry. */
export async function runEvaluation(cases: EvaluationCase[], provider: CertificateProvider) {
  const results = [];
  let operationAttempts = 0;
  for (const fixture of cases) {
    const snapshot = createSourceSnapshot(fixture.id, fixture.input);
    const base = { id: fixture.id, adequate: fixture.adequate, snapshotId: snapshot.id };
    let draft: DraftDocument;
    let draftMetadata: ProviderMetadata;
    let started = Date.now();
    try {
      operationAttempts++;
      const raw = await provider.draft(snapshot);
      const validated = validateDraftOutput(snapshot, raw);
      if (validated.validationFindings.length) throw new ApplicationError("INVALID_MODEL_OUTPUT", "Invalid draft evidence.", 502);
      draft = validated.draft; draftMetadata = validated.metadata;
    } catch (error) {
      results.push({ ...base, draft: failure(error, started), review: { status: "NOT RUN" as const, reason: "Draft failed; no extra calls." } });
      continue;
    }
    const refs = refsFor(draft);
    const invariants = Object.fromEntries(DECISION_FIELDS.map((field) => [field, draft.explicitDecision[field] !== snapshot.input.explicitDecision[field] ? 1 : 0]));
    const draftResult = { status: "PASSED" as const, metadata: draftMetadata, document: draft,
      exactReferences: { correct: refs.length - validateEvidenceReferences(refs, snapshot).issues.length, total: refs.length },
      decisionInvariantViolations: invariants, decisionsPreserved: decisionsEqual(draft.explicitDecision, snapshot.input.explicitDecision),
    };
    started = Date.now();
    try {
      operationAttempts++;
      const raw = await provider.review({ snapshot, draft });
      const checked = validateReviewOutput(snapshot, draft, raw);
      const findings = mergeReviewFindings(deterministicReview(snapshot, draft), checked.findings, crypto.randomUUID());
      const refs = checked.findings.flatMap((finding) => [...finding.evidenceRefs, ...(finding.proposedChange?.evidenceRefs ?? [])]);
      results.push({ ...base, draft: draftResult, review: { status: "PASSED" as const, metadata: checked.metadata, findings,
        exactReferences: { correct: refs.length - validateEvidenceReferences(refs, snapshot).issues.length, total: refs.length } } });
    } catch (error) { results.push({ ...base, draft: draftResult, review: failure(error, started) }); }
  }
  return { operationAttempts, results };
}
