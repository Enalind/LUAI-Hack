# Review behavior — CP4–CP5

The current live workflow also uses the pinned [FK guidance layer](FK_GUIDANCE.md): seven source-linked checks for fields 3, 5, 6 and 7. Every live finding identifies applicable rules, and hover explanations link to their official source. The ruleset version is recorded in provider metadata. This is a scoped, model-assisted review, not a complete certificate or entitlement determination.

The user starts each review with **Granska utkast** or **Granska på nytt**. There is no automatic review call after generation, edits or failures. A live review makes one model request with no automatic retries. Mock development and browser tests need no model calls.

## Request and validation

`POST /api/review` accepts `reviewRequestSchema`: requestId, sourceRevision, draftRevision, source snapshot, current four-field draft and explicit clinician decision. It enforces the 256 KB request cap, reconstructs the snapshot and validates its IDs/text, rejects unknown fields and duplicate field/claim IDs, and checks exact decision passthrough before selecting/calling a provider. Proposed target IDs are separately checked against the submitted draft. Source revisions must match. The draft revision and request ID identify the exact client draft being checked; responses echo both revisions and the request ID.

Invalid input receives safe 4xx errors without a provider call. Typed clinician decisions cannot be changed by review. A failed provider/structured output/target/reference check yields HTTP 200 with `completionStatus: incomplete`, `metadata: null`, a safe error and code findings. HTTP success alone is not a completed check. The browser checks the complete response schema and revision/request identity.

## Code and model checks

Code rechecks source IDs and exact quotes, detects missing evidence, and flags empty sections. A generic empty-field finding is `unclear`: emptiness alone does not prove that source information is unavailable. The model/mock identifies four semantic categories: work tasks, work relationship, assessment basis/attribution, and source support/contradictions.

Available-but-omitted information has a cited addition. Missing source information has a focused question and no fabricated source or completion. Unsupported claims can have a supported replacement/deletion or no proposal. Unclear findings have a question. Targets must belong to the stated field. All finding/proposal citations are validated; a broken model proposal makes the model review incomplete instead of exposing an applicable unsafe action.

Exact duplicates collapse, with identity including field, target, action, explanation, question, references and proposal. Distinct issues in the same category/field remain. Specific validated model findings can replace generic empty-field prompts; integrity findings are never suppressed by a model's empty list. IDs are assigned by the server and scoped to the request, preventing model/code collisions. Results accommodate the maximum 400 claim-integrity errors plus model findings.

## Interface and revisions

Cards show review priority (not medical urgency), field, explanation, question/proposal, and evidence links. Source links focus and highlight the original passage. Target links focus the claim; question links open the source disclosure and focus the assessment input. No edits occur automatically. Fresh complete reviews expose accept/dismiss actions with optional notes. Accept revalidates the target and citations, changes only its intended claim/section, increments draftRevision and makes the review stale. Dismiss leaves text/support unchanged. Both dispositions retain source/draft revisions and the review request ID; new reviews do not inherit them. Old or pending/incomplete review actions are disabled.

Editing sources, decisions or claims invalidates the relevant pending request; best-effort abort and revision/request guards prevent stale responses from becoming current. Prior findings remain visibly stale, including across replacement drafts, until a complete recheck succeeds. An incomplete recheck retains older findings separately. Failures never replace clinical text. Claim status says only that a check occurred or a finding targets the claim; it never claims medical verification.

A complete empty result says **Inga problem identifierades av kontrollen**. Incomplete/stale checks do not show that empty-success wording. Review has no FK approval semantics. Changed sources are refreshed through deterministic `/api/sources` before an explicitly requested review, without draft generation. Unchanged passages at the same source position receive updated references; changed passages keep unusable old references for integrity review. Manual draft text is preserved. Mock source combinations remain limited to prepared fixtures plus explicit field-scoped clinician supplements. See [editing and export](EDITING_EXPORT.md).

## Minimal live check

`npm run smoke:review` selects only `tests/live/review-smoke.live.ts`. It prepares D1 through the mock provider, removes the documented lifting-duty claim and performs one live review, no live draft and no retries. The draft smoke command separately selects only its own test, avoiding accidental combined billing. Reports are sanitized and written to ignored `.local/`.

On 21 November 2026, this check passed with `claude-sonnet-5-5` / `swedish-review-v1`: 12,943 ms, 5,602 input and 1,526 output tokens (7,128 total, including 710 reported reasoning tokens within output). It returned two findings (`work_tasks`, `work_relationship`), and the expected work omission was detected. The extra work-relationship finding was not adjudicated; no false-alarm or clinical-quality rate is claimed. This is one development probe, not clinical validation or held-out evaluation.
