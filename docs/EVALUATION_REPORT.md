# Evaluation report

21 November 2026 · CP0–CP5

## CP5 software-only follow-up

CP5 added editing/dispositions, deterministic source refresh, source supplementation and clean field/report export. All verification used prepared mocks/stub transports: **zero live draft calls and zero live review calls**. Mock supplement handling copies explicit clinician text with attribution and suppresses that field's prepared gap; it does not assess whether the added facts are medically sufficient. No live model/prompt changes or new clinical quality measurements were made. The upstream JSON development pack was translated to Swedish before CP5; it remains separate from the active TypeScript fixtures and has not been evaluated.

## CP4 review smoke — one model call

`npm run smoke:review` PASSED with one live review, zero live draft calls and no retries. All development/unit/integration/browser work used deterministic mocks or stub transports. No extra calls were made to tune or rerun this probe.

| Review smoke | Actual evidence |
| --- | --- |
| Date | 21 November 2026, 13:08 Europe/Stockholm (12:08 UTC) |
| Source/draft | Swedish development D1; mock-prepared draft with the lifting-duty claim removed |
| Configured / served model | `claude-sonnet-5-5` / `claude-sonnet-5-5` |
| Prompt | `swedish-review-v1`; initial development prompt, not a held-out freeze |
| Completion / provider latency | PASSED / 12,943 ms |
| Input / output / total tokens | 5,602 / 1,526 / 7,128 |
| Reasoning tokens | 710, included in output tokens |
| Findings | 2; `work_tasks` and `work_relationship` |
| Known work omission | Detected (`available_but_missing`, field 3) |
| Target/reference integrity and unchanged draft | PASSED by runtime validation/assertion |
| Clinical/held-out evaluation | NOT RUN |

The test took 13.12 seconds overall and saved ignored `.local/review-smoke-result.json`. No credentials, raw sources or model prose were retained in that report. The extra work-relationship finding was not adjudicated; it must not be counted as either a correct finding or a false alarm without review. The known omission is one positive developer-authored semantic probe, not a clinical quality score. Full fact-retention, attribution, unsupported-claim, missed-gap and false-alarm measurements remain unperformed. The separate JSON case pack and held-out cases were not used.

## CP3 draft smoke

Live draft contract/reference smoke: PASSED on the user's minimal-test follow-up after a key was added to ignored `.env`. That command made exactly one live D1 draft call, no retries and no review calls. The earlier missing-key attempt made zero calls. See the separate CP4 review probe above; full clinical/held-out evaluation remains NOT RUN.

| CP3 live smoke | Actual evidence |
| --- | --- |
| Date | 21 November 2026, 12:38 Europe/Stockholm (11:38 UTC) |
| Fixture | Swedish development D1; one draft call, no retries/reviews |
| Configured / served model | `claude-sonnet-5-5` / `claude-sonnet-5-5` |
| Prompt | `swedish-draft-v1`; initial prompt, not a held-out evaluation freeze |
| Completion / provider latency | PASSED / 13,219 ms |
| Reported input / output / total tokens | 2,485 / 1,777 / 4,262 |
| Reported reasoning tokens | 0 |
| Claim / reference count | 7 / 7; all seven references passed exact ID/quote checks |
| Clinician decisions | Unchanged; passthrough assertion PASSED |
| Clinical/semantic review | NOT RUN |

The live follow-up passed one test in 13.38 seconds overall and produced a sanitized report at ignored `.local/live-smoke-result.json`. That report contains no credentials, source text or model prose. `.env` is ignored. No code changes or additional model calls were needed. The seven references establish string integrity only; unsupported-claim, attribution, omission and clinical-quality scores were not assessed.

The separate CP3 deterministic tests use synthetic Anthropic HTTP responses through the installed SDK. Their token assertions are test values. The earlier production live-mode UI check used a synthetic non-credential without generation. Those checks remain distinct from the actual smoke result above.

CP2 exposes the prepared Swedish drafts through a validated route and browser workspace. All three development cases passed browser draft-flow checks; this is software evidence only. The separate JSON case pack pulled from origin is preserved but not wired into the mock provider and has no reported evaluation result. Neither development set is held out.

CP1 adds three fictional development cases, D1–D3, with independently authored answer keys in `fixtures/development/answer-keys.ts`. The mock implementation does not import those keys. H1–H3 held-out cases remain unwritten and unused; no held-out quality result is claimed. The rubric is developer-authored and not clinically validated.

| Development fixture | Deterministic software checks | Live semantic evaluation |
| --- | --- | --- |
| D1 — Warehouse work | PASSED: source-linked drafting, attribution and unchanged decision; corrupted duties/assessment omissions receive cited additions. | One known work-omission probe detected; full evaluation NOT RUN |
| D2 — Missing work information | PASSED: missing sections remain empty with questions; no job, clinician reasoning or decision supplied by mock. | NOT RUN |
| D3 — Attribution and negation | PASSED: denial preserved; corrupted denial and question-as-finding receive replacement/deletion findings. | NOT RUN |

Mock metadata: mode `mock`, model identifier `prepared-swedish-fixtures-v1`, template identifier `mock-templates-v1`, synthetic deterministic latency `0 ms`, usage `null`. This latency is not a measurement of model performance and the template identifier is not a live prompt version. The mock reviewer compares prepared wording; it can flag paraphrases and does not establish clinical correctness.

Live facts retained, unsupported-claim counts, attribution quality, missed gaps and false findings remain NOT RUN/N/A. Decision passthrough and reference integrity passed on the draft smoke; review target/reference checks and one known omission probe passed separately. Provider-reported usage and latency are recorded above. No clinical success rate or cost estimate is inferred. Clinical mentor review: NOT RUN.

The configured default model identifier is `claude-sonnet-5-5`, as specified in PRODUCT_SPEC.md; prompt versions are `swedish-draft-v1` and `swedish-review-v1`. Account/model access, drafting and review contracts were each demonstrated once. General Swedish semantic quality and human clinical review remain unverified; complete the later evaluation before describing live behavior as demo-ready.
