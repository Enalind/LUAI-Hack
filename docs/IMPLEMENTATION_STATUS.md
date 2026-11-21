# Implementation status

Updated 21 November 2026. CP0 and CP1 complete. Current requested scope ends at CP1.

| Checkpoint | Status | Evidence / remaining work |
| --- | --- | --- |
| CP0 — Repository and runnable skeleton | PASSED | Next.js shell, scripts, lockfile, environment example, ignore rules, server-only configuration and visible prototype/mode labels. Lint, typecheck, 11 unit tests, 2 browser tests and production build passed on Node 24.22.3. Production mock startup and live missing-key error verified. |
| CP1 — Contracts, source handling, fixtures | PASSED | Shared schemas, bounded request parsing, immutable case/revision/content-scoped source snapshots, exact quote validation, clinician-decision passthrough, two-operation provider contract, prepared mock drafts/reviews and independent D1–D3 answer keys. All 82 deterministic tests, lint, typecheck and production build passed on Node 24.22.3. |
| CP2 — Complete draft flow in mock mode | NOT STARTED | |
| CP3 — Live draft provider | NOT STARTED | No model requests implemented. |
| CP4 — Review and findings | NOT STARTED | |
| CP5 — Editing, revisions, export | NOT STARTED | |
| CP6 — Acceptance, evaluation, deployment readiness | NOT STARTED | |

Original planning documents are preserved. No deployment or certificate transmission has occurred.

CP0 changed areas: `app/`, `lib/server/config.ts`, package/tool configuration, `.env.example`, README, deterministic configuration tests and browser shell tests. Next.js generated the repository `AGENTS.md`; its relevant installed layout, Route Handler and environment guides were inspected. See [TEST_REPORT.md](TEST_REPORT.md) for verification details.

CP0 blockers: none.

CP1 changed areas: `lib/schemas.ts`, `lib/sources.ts`, `lib/evidence.ts`, server snapshot/request/provider validators, `fixtures/development/`, unit/integration tests and documentation. Cases cover warehouse lifting with an explicit assessment, missing work/assessment information, and attribution/negation. Tests also corrupt copies of drafts to exercise proposed additions, replacements and deletions.

CP1 blockers: none. The existing workspace UI and health endpoint remain the CP0 shell; UI/API wiring starts at CP2. Source and draft revisions are present in contracts; browser concurrency guards and actual suggestion application are later work. Mock review is template-based, and reference integrity alone never establishes semantic or clinical support. Live evaluation is NOT RUN; no model connection or prompts exist. CP2–CP6 remain NOT STARTED.
