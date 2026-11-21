# Implementation status

Updated 21 November 2026. CP0–CP3 implementation complete. Current scope ends at CP3; the actual live smoke is NOT RUN because credentials are unavailable.

| Checkpoint | Status | Evidence / remaining work |
| --- | --- | --- |
| CP0 — Repository and runnable skeleton | PASSED | Next.js shell, scripts, lockfile, environment example, ignore rules, server-only configuration and visible prototype/mode labels. Lint, typecheck, 11 unit tests, 2 browser tests and production build passed on Node 24.22.3. Production mock startup and live missing-key error verified. |
| CP1 — Contracts, source handling, fixtures | PASSED | Shared schemas, bounded request parsing, immutable case/revision/content-scoped source snapshots, exact quote validation, clinician-decision passthrough, two-operation provider contract, prepared mock drafts/reviews and independent D1–D3 answer keys. All 82 deterministic tests, lint, typecheck and production build passed on Node 24.22.3. |
| CP2 — Complete draft flow in mock mode | PASSED | Case/source/decision forms, POST /api/draft, four editable sections, separate explicit decisions, cited source navigation, missing-information questions, errors/loading, narrow tabs and case/request isolation. 103 deterministic tests, 11 Chromium browser tests, lint, typecheck and production build passed. |
| CP3 — Live draft provider | PASSED | Implementation/software checks passed: direct Anthropic SDK structured draft, fixed prompt version, output/deadline/retry limits, safe errors, usage metadata and explicit smoke command. 137 deterministic tests, 11 mock browser tests, lint, typecheck and production build passed. Actual live smoke NOT RUN: no key. |
| CP4 — Review and findings | NOT STARTED | |
| CP5 — Editing, revisions, export | NOT STARTED | |
| CP6 — Acceptance, evaluation, deployment readiness | NOT STARTED | |

Original planning documents are preserved. No deployment or certificate transmission has occurred.

CP0 changed areas: `app/`, `lib/server/config.ts`, package/tool configuration, `.env.example`, README, deterministic configuration tests and browser shell tests. Next.js generated the repository `AGENTS.md`; its relevant installed layout, Route Handler and environment guides were inspected. See [TEST_REPORT.md](TEST_REPORT.md) for verification details.

CP0 blockers: none.

CP1 changed areas: `lib/schemas.ts`, `lib/sources.ts`, `lib/evidence.ts`, server snapshot/request/provider validators, `fixtures/development/`, unit/integration tests and documentation. Cases cover warehouse lifting with an explicit assessment, missing work/assessment information, and attribution/negation. Tests also corrupt copies of drafts to exercise proposed additions, replacements and deletions.

CP1 blockers: none. Mock review is template-based, and reference integrity alone never establishes semantic or clinical support.

CP2 changed areas: draft route/service, client workspace/reducer, source forms and passage panel, certificate editor, responsive styling, health checkpoint label and unit/integration/browser tests. Invalid input reaches no provider; provider failures retain work. Case switches clear prior drafts/decisions. Request IDs, both revisions and abort controllers guard late draft responses after edits/case changes. Edited claims retain prior evidence as unverified suggestions. Desktop and 375px layouts were inspected, including selected-source focus/highlighting and keyboard tabs.

Before CP2, origin's three incoming fixture commits were merged with local CP1 in merge commit `59785ec` and pushed. The English JSON/overview fixtures are preserved alongside the active Swedish mock cases and are explicitly documented as a separate, currently unwired development pack.

CP2 blockers: none. Arbitrary source changes have no prepared mock and fail explicitly in mock mode. Draft editing/concurrency foundations were implemented for CP2 integrity; the remaining CP5 review/edit/export cycle is still NOT STARTED.

CP3 changed areas: `lib/server/live-provider.ts`, versioned prompts/narrative output schema, provider cancellation contract, draft provider selection, route duration, live UI activation/help, opt-in smoke runner, HTTP-transport tests and documentation. Reference failures in live mode are explicit errors; normal mock behavior is preserved. Existing dependencies/lockfile were retained. Installed SDK docs/types and official documentation were checked before implementation.

CP3 verification: 34 new deterministic tests exercise actual SDK transport parsing with stub Anthropic responses; total suite 137. Mock browser flows remain green. A production shell with a synthetic key showed live mode and an enabled action without making a model request; key markers were absent from the page, health response and public bundles. Repository credential-pattern scan found no matches. See [TEST_REPORT.md](TEST_REPORT.md) and [LIVE_PROVIDER.md](LIVE_PROVIDER.md).

CP3 live smoke: NOT RUN / unavailable credential. `npm run smoke:live` exited 2 with an explicit missing-key message and zero calls. No real model ID, measured live latency, billed usage or Swedish semantic quality is established. This satisfies the checkpoint's explicit unavailable-live exit, not a claim of live demo readiness. CP4–CP6 remain NOT STARTED. No deployment or certificate transmission occurred.
