# Evaluation report

21 November 2026 · CP0–CP1

Live evaluation: NOT RUN. No model integration or prompts exist, no live credentials are needed and no billable requests have been made.

CP1 adds three fictional development cases, D1–D3, with independently authored answer keys in `fixtures/development/answer-keys.ts`. The mock implementation does not import those keys. H1–H3 held-out cases remain unwritten and unused; no held-out quality result is claimed. The rubric is developer-authored and not clinically validated.

| Development fixture | Deterministic software checks | Live semantic evaluation |
| --- | --- | --- |
| D1 — Warehouse work | PASSED: source-linked drafting, attribution and unchanged decision; corrupted duties/assessment omissions receive cited additions. | NOT RUN |
| D2 — Missing work information | PASSED: missing sections remain empty with questions; no job, clinician reasoning or decision supplied by mock. | NOT RUN |
| D3 — Attribution and negation | PASSED: denial preserved; corrupted denial and question-as-finding receive replacement/deletion findings. | NOT RUN |

Mock metadata: mode `mock`, model identifier `prepared-swedish-fixtures-v1`, template identifier `mock-templates-v1`, synthetic deterministic latency `0 ms`, usage `null`. This latency is not a measurement of model performance and the template identifier is not a live prompt version. The mock reviewer compares prepared wording; it can flag paraphrases and does not establish clinical correctness.

Live facts retained, unsupported-claim counts, attribution quality, missed gaps, false findings, decision violations, billed usage and latency are all NOT RUN/N/A. No denominator or success rate is inferred from the mock checks. Clinical mentor review: NOT RUN.

The default future model identifier is `claude-sonnet-5-5`, as specified in PRODUCT_SPEC.md. Model availability, prompt versions, token usage, latency, Swedish output quality and human clinical review are unverified. These are scheduled for later checkpoints.
