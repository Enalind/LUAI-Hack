# Implementation status

Updated 21 November 2026. CP0–CP2 complete. Current implementation scope ends at CP2.

| Checkpoint | Status | Evidence / remaining work |
| --- | --- | --- |
| CP0 — Repository and runnable skeleton | PASSED | Next.js shell, scripts, lockfile, environment example, ignore rules, server-only configuration and visible prototype/mode labels. Lint, typecheck, 11 unit tests, 2 browser tests and production build passed on Node 24.22.3. Production mock startup and live missing-key error verified. |
| CP1 — Contracts, source handling, fixtures | PASSED | Shared schemas, bounded request parsing, immutable case/revision/content-scoped source snapshots, exact quote validation, clinician-decision passthrough, two-operation provider contract, prepared mock drafts/reviews and independent D1–D3 answer keys. All 82 deterministic tests, lint, typecheck and production build passed on Node 24.22.3. |
| CP2 — Complete draft flow in mock mode | PASSED | Case/source/decision forms, POST /api/draft, four editable sections, separate explicit decisions, cited source navigation, missing-information questions, errors/loading, narrow tabs and case/request isolation. 103 deterministic tests, 11 Chromium browser tests, lint, typecheck and production build passed. |
| CP3 — Live draft provider | NOT STARTED | No model requests implemented. |
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

CP2 blockers: none. Arbitrary source changes are accepted as input but have no prepared mock and fail explicitly. Live mode returns 503 instead of substituting mock output. No review endpoint, applied suggestions, copy/export or live model connection exists. Draft editing/concurrency foundations were implemented for CP2 integrity; the remaining CP5 review/edit/export cycle is still NOT STARTED. CP3–CP6 remain NOT STARTED. No live requests, deployment or certificate transmission occurred.
