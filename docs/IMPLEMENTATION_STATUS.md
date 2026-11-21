# Implementation status

Updated 21 November 2026. CP0–CP6 software implementation complete. Earlier live smokes and the three-case prompt-held-out evaluation completed. The latter used six calls with documented semantic limitations. Independent human/clinical validation remains NOT RUN; no deployment occurred.

| Checkpoint | Status | Evidence / remaining work |
| --- | --- | --- |
| CP0 — Repository and runnable skeleton | PASSED | Next.js shell, scripts, lockfile, environment example, ignore rules, server-only configuration and visible prototype/mode labels. Lint, typecheck, 11 unit tests, 2 browser tests and production build passed on Node 24.22.3. Production mock startup and live missing-key error verified. |
| CP1 — Contracts, source handling, fixtures | PASSED | Shared schemas, bounded request parsing, immutable case/revision/content-scoped source snapshots, exact quote validation, clinician-decision passthrough, two-operation provider contract, prepared mock drafts/reviews and independent D1–D3 answer keys. All 82 deterministic tests, lint, typecheck and production build passed on Node 24.22.3. |
| CP2 — Complete draft flow in mock mode | PASSED | Case/source/decision forms, POST /api/draft, four editable sections, separate explicit decisions, cited source navigation, missing-information questions, errors/loading, narrow tabs and case/request isolation. 103 deterministic tests, 11 Chromium browser tests, lint, typecheck and production build passed. |
| CP3 — Live draft provider | PASSED | Direct Anthropic structured draft, versioned prompt, output/deadline/retry limits, safe errors and usage metadata. Prior checks: 137 deterministic tests, 11 mock browser tests, lint, typecheck and build passed. Follow-up actual live D1 smoke PASSED: 13,219 ms, 4,262 tokens, seven valid references and unchanged clinician decisions. |
| CP4 — Review and findings | PASSED | Validated review endpoint, code checks plus separate mock/live semantic review, conservative deduplication, finding/proposal/question cards and evidence/target navigation. 181 deterministic tests, 20 mock browser tests, lint, typecheck and build passed. CP4 used one live review, zero live drafts and no retries; known work omission detected. |
| CP5 — Editing, revisions, export | PASSED | Revision-scoped accept/dismiss and notes, safe add/replace/delete, deterministic source refresh with preserved manual text, clinician supplements, stale-response guards, clean per-field copy with confirmation/fallback, separate opt-in JSON reports/history. 203 deterministic tests, 27 mock browser tests, lint, typecheck and production build passed. Zero live model calls. |
| CP6 — Acceptance, evaluation, deployment readiness | PASSED | 216 deterministic tests, 29 mock browser checks including all three complete journeys and every generated D1–D3 source chip, lint/typecheck/build, desktop/narrow and keyboard acceptance, frozen H1–H3 evaluation (six live calls; all three contracts complete), Node 24 pin and fail-closed Vercel mock-only policy. Quality misses/extra questions documented; independent human/clinical review and real deployment NOT RUN. |

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

CP4 blockers: none. Full clinical/held-out evaluation remains NOT RUN; a positive development probe is not clinical validation. At that checkpoint CP5/CP6 had not started; both are completed in the later records below. No deployment or certificate transmission occurred.


CP5 changed areas: `lib/revisions.ts`, `lib/export.ts`, clinician supplement parsing, source snapshot endpoint/service, workspace state/history/dispositions, finding actions, supplement/copy/report UI, health label and tests. Accept revalidates targets/quotes and only changes the intended claim/section; dismissal leaves support status unchanged. Source refresh creates no provider call, preserves manual draft text and conservatively remaps identical passage references before one explicit recheck. Missing or stale/incomplete review and unresolved field findings require copy confirmation; clipboard failure offers selectable current text. JSON reports include current text, revisions, source IDs, review metadata/history and dispositions; original source inputs/passages/quotes require an explicit checkbox.

CP5 verification: all 203 unit/integration tests (22 new), all 27 Chromium tests (7 new), lint, typecheck, production build and diff whitespace checks passed. Desktop/narrow screenshots were inspected. Full accept/recheck/copy, clinician supplement/recheck without draft regeneration, dismissal, stale/incomplete confirmation, clipboard fallback, report inclusion rules and late uncancellable source responses were exercised. No dependencies or live prompts changed; zero live model calls. See [EDITING_EXPORT.md](EDITING_EXPORT.md) and [TEST_REPORT.md](TEST_REPORT.md).

Repository sync before CP5: CP4 commit `8b5ffb8` and origin's Swedish JSON fixture translations were merged and pushed as `faa13af`. The active TypeScript fixtures remain separate from that imported pack. Planning/research documents, raw fixture pack and dependency lockfile were preserved.

CP5 blockers: none. Mock supplements are literal field-scoped demonstrations, not medical completeness judgments. Full held-out/live evaluation and deployment readiness remain CP6 work; no deployment or certificate transmission occurred.


## Asteria identity follow-up — 21 November 2026

CP5 was already committed as `eda0d5e`. Incoming research-fixture commits were reviewed and merged, all 203 deterministic tests passed, and the merge was pushed to `origin/main` as `bb6ac55` before the UI work.

The supplied parent-directory Asteria identity was applied to the local app: outlined wordmark, bundled Newsreader/Manrope fonts and licenses, supplied favicon assets, forest/oat/stone tokens, serif panel headings, source-link styling, amber gap and red conflict accents, responsive controls, metadata and footer. The underlying CP5 workflow remains intact. See [BRAND_IDENTITY.md](BRAND_IDENTITY.md).

Verification: lint, typecheck, all 27 mock Chromium workflows and production build passed; desktop/narrow screenshots were inspected. The production mock preview returned HTTP 200 for the page, wordmark and favicon, and health reported CP5/mock. The in-app browser access host was unavailable, so user-facing preview handoff could not be verified; the existing Playwright browser QA passed. Zero live model calls and no deployment during that brand follow-up; CP6 was completed subsequently as recorded below.


## CP6 — Acceptance, bounded evaluation and deployment readiness

Implemented the opt-in evaluation wrapper and reusable runner, frozen prompt/fixture manifests, H1–H3 fictional sources and prewritten answer keys, recording rubric, versioned metadata/count summary, mock-only Vercel configuration/guard, deployment exclusions, Node 24 engine pin, CP6 health label and documentation. No dependency versions or live prompts changed. The existing local Asteria UI refresh was preserved.

Verification: all 216 deterministic tests (13 new CP6 scenarios), all 29 Chromium tests (two new acceptance checks), lint, typecheck, production build and whitespace checks passed. Journey A accepts/rechecks/copies on desktop/narrow screens; B supplements sources while retaining manual text; C now combines timeout, explicit retry and a delayed stale response after editing. All generated source chips in D1–D3 were clicked and matched to the exact snapshot text. Desktop/narrow screenshots and keyboard behavior were checked.

Live evaluation: three cases completed in exactly six requests, no retries/baseline/separate grader API calls. Frozen prompt versions remained `swedish-draft-v1` / `swedish-review-v1`; served model `claude-sonnet-5-5`, 36,240 reported tokens. Exact draft references 15/15; review/proposal references 13/13; decision invariant violations zero. Source comparison retained 11/12 keyed facts in substantive text, with H3's symptom omission recovered by review; one treatment gap was missed by review; H1 had extra clarification requests. An H2 key field-annotation limitation is disclosed separately. The sources/keys/judgments were implementation-agent authored, not an independent human clinical gold standard. See [EVALUATION_REPORT.md](EVALUATION_REPORT.md).

Deployment readiness: `VERCEL=1` requires explicit `AI_MODE=mock`; missing/live modes fail before any provider fetch. A simulated hosted production build/start returned CP6/mock and generated a fictional mock draft. Fifteen public build files plus page/health/draft responses contained no synthetic credential marker. Actual Vercel project/account settings are uninspected and no deployment is claimed. See [DEPLOYMENT.md](DEPLOYMENT.md) and [DEMO_CHECKLIST.md](DEMO_CHECKLIST.md).

CP6 software/readiness blockers: none. Independent human/clinical validation is NOT RUN; the measured local live behavior has omissions, over-clarification and wording limitations. The public demo stays mock-only. No deployment, real patient use or certificate transmission occurred. All brand and CP6 edits are local/uncommitted pending the user's normal review/commit workflow.


## FK guidance follow-up — 21 November 2026

Added `fk7804-2026-11-21.v1`, a seven-rule curated summary of official FK instructions for narrative fields 3, 5, 6 and 7. Both live system prompts include the pinned rules. Live review requires complete per-rule accounting, applicable allowlisted finding rule IDs and questions for unassessable rules. Server validation rejects inconsistent output; independent source/empty-field checks remain. Hover popups and finding details resolve requirements and official source links from application-owned data. Metadata/review history record the guidance version. Mock examples demonstrate links without claiming semantic FK review.

The existing clinician diagnosis is read-only draft context for DFA continuity; all decisions remain application-controlled. Draft v5 writes text parts once and derives highlights, removing the duplicate-phrase mismatch caught by the first live draft probe. Review uses explicit medium effort after the initial default-effort timeout. Scope and source maintenance are documented in [FK_GUIDANCE.md](FK_GUIDANCE.md).

Verification: 258 unit/integration tests, all 39 Chromium workflows, lint, typecheck, production build and whitespace checks passed. Final live draft passed in 22,015 ms; final guided omission review passed in 14,422 ms with all seven checks and the expected omission detected. Four explicit live probes were made, including the initial timeout and anchor-validation failure; no automatic retries. New prompts have no independent clinical validation or rerun held-out evaluation. No deployment or certificate transmission occurred.
