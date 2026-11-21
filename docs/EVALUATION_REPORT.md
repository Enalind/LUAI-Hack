# Evaluation report

21 November 2026 · CP0–CP3

Live smoke and evaluation: NOT RUN. The CP3 provider and initial draft prompt are implemented, but no Anthropic key was available in the server environment/local env files. The explicit smoke wrapper exited 2 with NOT RUN and made zero model calls. No billable requests have been made.

| CP3 intended smoke | Actual evidence |
| --- | --- |
| Date | 21 November 2026 |
| Fixture | Swedish development D1, configured for the opt-in command; not sent to a model |
| Configured model | `claude-sonnet-5-5`; actual served model ID unknown |
| Prompt | `swedish-draft-v1`; initial prompt, not a held-out evaluation freeze |
| Completion, latency, tokens (including reasoning) | NOT RUN / N/A |
| Clinical/semantic review | NOT RUN |

CP3 deterministic tests use synthetic Anthropic HTTP responses through the installed SDK. Reported tokens in those assertions are test values, not billed usage or evidence of model quality. The production live-mode UI was checked using a synthetic non-credential without invoking generation. Neither check satisfies an actual live smoke or semantic evaluation.

CP2 exposes the prepared Swedish drafts through a validated route and browser workspace. All three development cases passed browser draft-flow checks; this is software evidence only. The English JSON case pack pulled from origin is preserved but not wired into the mock provider and has no reported evaluation result. Neither development set is held out.

CP1 adds three fictional development cases, D1–D3, with independently authored answer keys in `fixtures/development/answer-keys.ts`. The mock implementation does not import those keys. H1–H3 held-out cases remain unwritten and unused; no held-out quality result is claimed. The rubric is developer-authored and not clinically validated.

| Development fixture | Deterministic software checks | Live semantic evaluation |
| --- | --- | --- |
| D1 — Warehouse work | PASSED: source-linked drafting, attribution and unchanged decision; corrupted duties/assessment omissions receive cited additions. | NOT RUN |
| D2 — Missing work information | PASSED: missing sections remain empty with questions; no job, clinician reasoning or decision supplied by mock. | NOT RUN |
| D3 — Attribution and negation | PASSED: denial preserved; corrupted denial and question-as-finding receive replacement/deletion findings. | NOT RUN |

Mock metadata: mode `mock`, model identifier `prepared-swedish-fixtures-v1`, template identifier `mock-templates-v1`, synthetic deterministic latency `0 ms`, usage `null`. This latency is not a measurement of model performance and the template identifier is not a live prompt version. The mock reviewer compares prepared wording; it can flag paraphrases and does not establish clinical correctness.

Live facts retained, unsupported-claim counts, attribution quality, missed gaps, false findings, decision violations, billed usage and latency are all NOT RUN/N/A. No denominator or success rate is inferred from the mock checks. Clinical mentor review: NOT RUN.

The configured default model identifier is `claude-sonnet-5-5`, as specified in PRODUCT_SPEC.md; draft prompt version is `swedish-draft-v1`. Account access, actual served model ID, live token usage/latency, Swedish output quality and human clinical review remain unverified. Set a server-side key and run the explicit smoke, then complete the later semantic evaluation before describing live behavior as demo-ready.
