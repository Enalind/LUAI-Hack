# Implementation status

Updated 21 November 2026. CP0–CP5 implementation complete. One live draft smoke and one live review smoke passed. Full clinical/held-out evaluation remains NOT RUN.

| Checkpoint | Status | Evidence / remaining work |
| --- | --- | --- |
| CP0 — Repository and runnable skeleton | PASSED | Next.js shell, scripts, lockfile, environment example, ignore rules, server-only configuration and visible prototype/mode labels. Lint, typecheck, 11 unit tests, 2 browser tests and production build passed on Node 24.22.3. Production mock startup and live missing-key error verified. |
| CP1 — Contracts, source handling, fixtures | PASSED | Shared schemas, bounded request parsing, immutable case/revision/content-scoped source snapshots, exact quote validation, clinician-decision passthrough, two-operation provider contract, prepared mock drafts/reviews and independent D1–D3 answer keys. All 82 deterministic tests, lint, typecheck and production build passed on Node 24.22.3. |
| CP2 — Complete draft flow in mock mode | PASSED | Case/source/decision forms, POST /api/draft, four editable sections, separate explicit decisions, cited source navigation, missing-information questions, errors/loading, narrow tabs and case/request isolation. 103 deterministic tests, 11 Chromium browser tests, lint, typecheck and production build passed. |
| CP3 — Live draft provider | PASSED | Direct Anthropic structured draft, versioned prompt, output/deadline/retry limits, safe errors and usage metadata. Prior checks: 137 deterministic tests, 11 mock browser tests, lint, typecheck and build passed. Follow-up actual live D1 smoke PASSED: 13,219 ms, 4,262 tokens, seven valid references and unchanged clinician decisions. |
| CP4 — Review and findings | PASSED | Validated review endpoint, code checks plus separate mock/live semantic review, conservative deduplication, finding/proposal/question cards and evidence/target navigation. 181 deterministic tests, 20 mock browser tests, lint, typecheck and build passed. CP4 used one live review, zero live drafts and no retries; known work omission detected. |
| CP5 — Editing, revisions, export | PASSED | Revision-scoped accept/dismiss and notes, safe add/replace/delete, deterministic source refresh with preserved manual text, clinician supplements, stale-response guards, clean per-field copy with confirmation/fallback, separate opt-in JSON reports/history. 203 deterministic tests, 27 mock browser tests, lint, typecheck and production build passed. Zero live model calls. |
| CP6 — Acceptance, evaluation, deployment readiness | NOT STARTED | |

Original planning documents are preserved. No deployment or certificate transmission has occurred.

CP0 changed areas: `app/`, `lib/server/config.ts`, package/tool configuration, `.env.example`, README, deterministic configuration tests and browser shell tests. Next.js generated the repository `AGENTS.md`; its relevant installed layout, Route Handler and environment guides were inspected. See [TEST_REPORT.md](TEST_REPORT.md) for verification details.

CP0 blockers: none.

CP1 changed areas: `lib/schemas.ts`, `lib/sources.ts`, `lib/evidence.ts`, server snapshot/request/provider validators, `fixtures/development/`, unit/integration tests and documentation. Cases cover warehouse lifting with an explicit assessment, missing work/assessment information, and attribution/negation. Tests also corrupt copies of drafts to exercise proposed additions, replacements and deletions.

CP1 blockers: none. Mock review is template-based, and reference integrity alone never establishes semantic or clinical support.

CP2 changed areas: draft route/service, client workspace/reducer, source forms and passage panel, certificate editor, responsive styling, health checkpoint label and unit/integration/browser tests. Invalid input reaches no provider; provider failures retain work. Case switches clear prior drafts/decisions. Request IDs, both revisions and abort controllers guard late draft responses after edits/case changes. Edited claims retain prior evidence as unverified suggestions. Desktop and 375px layouts were inspected, including selected-source focus/highlighting and keyboard tabs.

Before CP2, origin's three incoming fixture commits were merged with local CP1 in merge commit `59785ec` and pushed. The JSON/overview fixtures (English when imported, now translated to Swedish upstream) are preserved alongside the active Swedish mock cases and are explicitly documented as a separate, currently unwired development pack.

CP2 blockers: none. Arbitrary source changes have no prepared mock and fail explicitly in mock mode. Draft editing/concurrency foundations were implemented for CP2 integrity; the remaining CP5 review/edit/export cycle is still NOT STARTED.

CP3 changed areas: `lib/server/live-provider.ts`, versioned prompts/narrative output schema, provider cancellation contract, draft provider selection, route duration, live UI activation/help, opt-in smoke runner, HTTP-transport tests and documentation. Reference failures in live mode are explicit errors; normal mock behavior is preserved. Existing dependencies/lockfile were retained. Installed SDK docs/types and official documentation were checked before implementation.

CP3 verification: 34 new deterministic tests exercise actual SDK transport parsing with stub Anthropic responses; total suite 137. Mock browser flows remain green. A production shell with a synthetic key showed live mode and an enabled action without making a model request; key markers were absent from the page, health response and public bundles. Repository credential-pattern scan found no matches. See [TEST_REPORT.md](TEST_REPORT.md) and [LIVE_PROVIDER.md](LIVE_PROVIDER.md).

CP3 live smoke follow-up: PASSED. After the user added a key to ignored `.env`, `npm run smoke:live` ran one D1 draft, no retries/reviews. Provider model `claude-sonnet-5-5`, prompt `swedish-draft-v1`, latency 13,219 ms, input/output/total tokens 2,485/1,777/4,262, reported reasoning tokens 0. All seven references matched their exact source passages, and explicit clinician decisions were unchanged. The earlier missing-key attempt made zero calls.

CP4 changed areas: review route/service, shared provider factory, reusable bounded live execution, `swedish-review-v1` prompt, deterministic integrity/empty-field checks and deduplication, review state/revision guards, finding cards/navigation, mock/transport/state/browser tests and an isolated review smoke command. Bad input reaches no provider. Bad model targets/citations yield incomplete review with retained code findings. Empty findings use limited wording; failures preserve editable text. Source/claim changes and replacement drafts preserve earlier results as stale until rechecked. Suggestions are displayed; accept/dismiss/application/export remain CP5 work.

CP4 live smoke: PASSED with exactly one review call, zero live drafting calls and no retries. The prepared D1 draft had a known lifting-duty omission. Provider model `claude-sonnet-5-5`, prompt `swedish-review-v1`, 12,943 ms, reported input/output/total tokens 5,602/1,526/7,128, including 710 reasoning tokens within output. Two findings returned; the expected omission was detected. The additional work-relationship finding is unadjudicated. No further model requests were made to tune or repeat the probe. All routine checks used mocks/stubs. See [REVIEW.md](REVIEW.md) and [EVALUATION_REPORT.md](EVALUATION_REPORT.md).

CP4 blockers: none. Full clinical/held-out evaluation remains NOT RUN; a positive development probe is not clinical validation. CP5 is complete as recorded below; CP6 remains NOT STARTED. No deployment or certificate transmission occurred.


CP5 changed areas: `lib/revisions.ts`, `lib/export.ts`, clinician supplement parsing, source snapshot endpoint/service, workspace state/history/dispositions, finding actions, supplement/copy/report UI, health label and tests. Accept revalidates targets/quotes and only changes the intended claim/section; dismissal leaves support status unchanged. Source refresh creates no provider call, preserves manual draft text and conservatively remaps identical passage references before one explicit recheck. Missing or stale/incomplete review and unresolved field findings require copy confirmation; clipboard failure offers selectable current text. JSON reports include current text, revisions, source IDs, review metadata/history and dispositions; original source inputs/passages/quotes require an explicit checkbox.

CP5 verification: all 203 unit/integration tests (22 new), all 27 Chromium tests (7 new), lint, typecheck, production build and diff whitespace checks passed. Desktop/narrow screenshots were inspected. Full accept/recheck/copy, clinician supplement/recheck without draft regeneration, dismissal, stale/incomplete confirmation, clipboard fallback, report inclusion rules and late uncancellable source responses were exercised. No dependencies or live prompts changed; zero live model calls. See [EDITING_EXPORT.md](EDITING_EXPORT.md) and [TEST_REPORT.md](TEST_REPORT.md).

Repository sync before CP5: CP4 commit `8b5ffb8` and origin's Swedish JSON fixture translations were merged and pushed as `faa13af`. The active TypeScript fixtures remain separate from that imported pack. Planning/research documents, raw fixture pack and dependency lockfile were preserved.

CP5 blockers: none. Mock supplements are literal field-scoped demonstrations, not medical completeness judgments. Full held-out/live evaluation and deployment readiness remain CP6 work; no deployment or certificate transmission occurred.
