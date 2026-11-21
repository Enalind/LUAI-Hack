# Test report

## Vercel live configuration follow-up — 21 November 2026

At the user's request, Vercel now accepts explicit `AI_MODE=live` with a server-only Anthropic key, as well as `AI_MODE=mock`. Missing/invalid hosted modes and missing/blank live keys still fail before provider transport. This supersedes the CP6 mock-only deployment policy recorded below.

Verification passed: all 265 deterministic tests in 22 files, lint, typecheck, and a production build with `VERCEL=1 AI_MODE=live` and a synthetic API key. Deployment integration tests use the real route handlers/provider factory with a stubbed Anthropic transport for both draft and review, verify the selected model and mode, and confirm credentials are absent from responses. The synthetic build key was absent from `.next/static`. No real provider calls, deployment or account/protection checks were performed for this change. Browser tests were not rerun because this change is confined to server configuration and documentation.

## CP6 — 21 November 2026

Environment: macOS arm64, Node 24.22.3 LTS, npm 11.18.0, unchanged Next.js 16.4.6 / AI SDK 7.0.179 / Anthropic provider 4.0.107. Package manifests now pin Node `24.x` for reproducible Vercel selection. All routine tests used mocks/stub transports. Exactly six live evaluation requests were made separately, with no retries or repeated probe.

| Command / verification | Actual outcome |
| --- | --- |
| `npm test` | PASSED; 16 files, 216 tests (13 new CP6 cases), 597 ms. |
| `npm run lint` | PASSED; zero errors/warnings. |
| `npm run typecheck` | PASSED. |
| `npm run test:e2e` | PASSED; all 29 Chromium checks in 9.9 seconds, explicit mock mode and empty key. |
| `VERCEL=1 AI_MODE=mock npm run build` | PASSED, using a synthetic key marker; all routes and bundled brand assets/fonts compiled. |
| Production mock startup and API | PASSED; simulated hosted runtime, HTTP page/health/draft response, health `CP6`/`mock`, generated fictional D1 draft mode `mock`. |
| Frontend isolation | PASSED; 15 public build files plus page/health/draft responses contained zero synthetic credential marker hits. `.env` and `.local/held-out-observations.json` confirmed ignored. This is a targeted check, not an exhaustive security audit. |
| `npm run eval:live` | COMPLETED/PASSED contracts; 1 explicit test, 124.71 seconds, three cases, six HTTP requests, zero retries. Separate source-comparison limitations are in the evaluation report. |
| Visual/keyboard QA | PASSED; fresh desktop 1280 px and narrow 375 px screenshots inspected, source focus/highlight, gaps, findings, panel tabs and keyboard acceptance. In-app browser host remains unavailable; Playwright QA was completed independently. |
| `git diff --check` | PASSED. Original product/implementation plans, raw imported research fixtures and live prompts preserved; only the lockfile's root Node engine constraint changed. |

New deterministic checks exercise the evaluation's fixed call count, skipped review after draft failure, retained failures/unknown usage, invalid evidence rejection, masked unknown errors, case-limit rejection and frozen-prompt mismatch before model execution. Hosted tests verify explicit mock works with no key and that missing/live Vercel modes return safe configuration errors before any provider fetch, including when a synthetic key exists. The health route now uses the same relative server import convention as other route modules so its real configuration behavior can be tested directly.

The browser suite includes complete journey A (source-supported accept → stale → recheck → exact copy, desktop/narrow), B (source supplement → deterministic refresh/recheck retaining manual wording, no replacement draft request), and the new combined C (timeout → explicit successful retry → delayed review/edit → older response ignored). A new acceptance check clicks every generated source chip in D1–D3 and asserts exact passage text/focus/highlight. Existing case isolation, missing inputs, clipboard confirmation/fallback and JSON-report checks remain passing.

Live evaluation metadata: `claude-sonnet-5-5`, frozen `swedish-draft-v1` / `swedish-review-v1`, H1–H3 authored after prompt freeze. All three drafts/reviews passed contract validation; 15/15 draft references and 13/13 review/proposal references matched, all 15 decision-field comparisons unchanged. Provider-reported totals: 23,875 input / 12,365 output / 36,240 total tokens; 3,677 reasoning tokens are included in output. No extra model calls were made to fix or retest quality misses. See [EVALUATION_REPORT.md](EVALUATION_REPORT.md) for attribution/fact/gap metrics, rubric limitations and implementation-agent adjudication.

No real Vercel deployment or independent human/clinical review was performed. Public deployment is configured as mock-only and rejects hosted live mode; actual platform provisioning/protection remains unverified. No real patient data or certificate transmission was used.

## Asteria identity follow-up — 21 November 2026

CP5 commit `eda0d5e` was merged with two incoming research-fixture commits and pushed as `bb6ac55` before branding began. The merge passed all 203 deterministic tests (14 files). Branding changes are frontend/assets/docs only, with no dependency or live-prompt changes.

| Command / verification | Actual outcome |
| --- | --- |
| `npm run lint` | PASSED; zero errors/warnings. |
| `npm run typecheck` | PASSED. |
| `npm run test:e2e` | PASSED; all 27 mock Chromium workflow tests, 6.3 seconds. No provider key or real model calls. |
| `npm run build` | PASSED; local variable fonts, supplied SVG icon and all existing dynamic routes compiled successfully. |
| Visual/keyboard QA | Existing desktop and 375 px screenshots inspected: Asteria wordmark, serif headings, warm palette, source highlighting, findings, controls and responsive tabs are readable. Existing keyboard and full editing/export journeys passed. |
| Production preview | PASSED; page, outlined wordmark and static ICO returned HTTP 200; health reported `CP5` / `mock`. |
| User-facing preview handoff | NOT VERIFIED; the in-app browser access host was unavailable. Playwright browser QA and production HTTP checks were completed independently. |
| `git diff --check` | PASSED. |

The first browser-suite launch encountered an already-running local development server; it was not interrupted. The later run passed after that server stopped. The kit's ICO cannot be decoded by Next's file-based image processor because its embedded PNG is not RGBA; serving the unchanged ICO from `public/` and using the supplied SVG as the app icon resolved the compilation error. Font files and complete SIL OFL licenses are bundled locally. No product/research plan, medical source text or clinician decision was rewritten by this UI update. Zero live model calls; no deployment or certificate transmission.

## CP5 — 21 November 2026

Environment: macOS arm64, Node 24.22.3 LTS, npm 11.18.0, Next.js 16.4.6; unchanged dependencies and live prompt versions. **Zero live draft calls and zero live review calls.** Browser tests force mock mode and an empty provider key; provider transport tests use stubs.

| Command / verification | Actual outcome |
| --- | --- |
| `npm test` | PASSED; 14 files, 203 tests, including 22 new CP5 unit/integration scenarios. |
| `npm run lint` | PASSED; zero errors/warnings. |
| `npm run typecheck` | PASSED. |
| `npm run test:e2e` | PASSED; 27 Chromium tests, including 7 new CP5 journeys, 6.7 seconds in the final full run. |
| `npm run build` | PASSED; production routes include deterministic `/api/sources` alongside draft/review/health. Explicit mock mode and an empty provider key were used. |
| Visual/keyboard inspection | Desktop 1280px and narrow 375px full-cycle screenshots inspected; readable current text, source panel, report controls and per-field copy, no horizontal overflow. Acceptance is exercised with keyboard Enter, and existing keyboard-tab checks pass. |
| `git diff --check` | PASSED; plans, raw research fixtures and dependency lockfile unchanged. |

New deterministic checks cover add/replace/delete isolation, preserved clinician decisions, review staleness after acceptance, dismissal without verification, per-request disposition scope, disabled stale/pending/incomplete actions, apply-time invalid target/citation/field/ID rejection, source remapping and retained manual text, old source-response ordering, exact current export wording, absent-field placeholders excluded, null decisions, clean-review copy versus confirmation, report source-text exclusion/opt-in, and invalid source-refresh input before any provider selection. Repeated identical clinician additions retain distinct source references.

Browser journeys complete accept → recheck → copy on desktop and narrow viewports; source supplement → refresh/review with manual text preserved and **one original draft request only**; dismissal and continued copy warnings; invalidated copy confirmation after edits; selectable fallback after clipboard rejection; incomplete-review export confirmation; report disposition/history/source inclusion; and a delayed uncancellable source response that cannot start review after manual editing. Existing review timeout/retry and late review-response journeys remain passing.

Initial browser runs exposed that stale proposals were hidden rather than shown disabled. Current-review proposal controls now remain visible and disabled until rechecked. The first new integration run exposed a test fixture mutation; the test input now deep-clones it. Final verification also caught a React sibling-key collision in case-reset handling; the finding panel and report component now use distinct keys and the browser tests assert no duplicate-key errors. The health-check assertion was updated to CP5. Final suites pass. Screenshots and traces are ignored in `test-results/`.

CP5 does not repeat billable probes or make clinical quality claims. The upstream JSON pack was translated to Swedish before this checkpoint and remains separate from the active TypeScript mock fixtures. See [editing/export behavior](EDITING_EXPORT.md) and [evaluation report](EVALUATION_REPORT.md). No deployment or certificate transmission occurred.

## CP4 — 21 November 2026

Environment: macOS arm64, Node 24.22.3 LTS, npm 11.18.0, Next.js 16.4.6 and unchanged AI SDK/provider versions. The user's minimal-call constraint was met: exactly **one live review request**, **zero live draft requests** and **no retries** during CP4. All other checks used mock providers or stub Anthropic transports, never real-key calls.

| Command / verification | Actual outcome |
| --- | --- |
| `npm test` | PASSED; 12 files, 181 tests (44 new CP4 scenarios), 444 ms. |
| `npm run lint` | PASSED; zero errors/warnings. |
| `npm run typecheck` | PASSED. |
| `npm run test:e2e` | PASSED; 20 Chromium mock-mode tests, 5.8 seconds, including 9 new review journeys. |
| `npm run build` | PASSED; Node.js `/api/review` included alongside draft/health/page routes. |
| `npm run smoke:review` | PASSED; 1 test in 13.12 seconds overall. Prepared D1 draft through mock, then one live review without retries. Known lifting-duty omission detected. Provider latency 12,943 ms; 5,602 input / 1,526 output / 7,128 total tokens, including 710 reasoning tokens within output. |
| Visual checks | Desktop 1280px and narrow 375px review/evidence screenshots inspected: cards, questions, proposals, field/source navigation and tab readability. Browser checks assert no horizontal overflow. |
| Credential checks | 12 public build files scanned; no synthetic key/test marker hits. Tracked/unignored source scan found no Anthropic key-pattern matches. `.env` and `.local/review-smoke-result.json` are ignored. |
| `git diff --check` | PASSED; original plans, research fixtures and dependency lockfile unchanged. |

New deterministic checks cover all three fictional cases, genuine missing information versus omitted available detail, negation/attribution corruption, unknown targets/wrong fields/invalid proposed quotes, duplicate handling without losing distinct issues, invalid snapshot/revision/decision/claim inputs before provider selection, empty completed reviews, explicit incomplete failures with retained code findings/draft, all 400 possible claim-integrity errors, review transport parsing/refusal/truncation/rate limits/timeouts without retries, and revision/request guards. Earlier complete findings survive incomplete rechecks and replacement drafts until a complete current review succeeds.

Browser journeys exercise explicit (never automatic) review, limited empty-review wording, missing-source questions with no invented citations or decisions, a known omission with a cited addition, a reversed denial with a replacement and target focus, review failure/retry without losing edits, manual correction/recheck, replacement-draft staleness, an older uncancellable review ignored after editing, and narrow tabs/question navigation. No suggestions are automatically applied; accept/dismiss/application/export are still CP5.

Live review returned two findings (work tasks and work relationship). Only the deliberate work omission was probed; the additional finding is unadjudicated. General clinical quality and held-out evaluation remain NOT RUN. The sanitized report contains metadata/counts only; no key/source/model prose was printed or retained there. No deployment or certificate transmission occurred. Live smoke commands now select their own test file explicitly, preventing accidental combined draft/review calls.

## Minimal live smoke follow-up — 21 November 2026

`npm run smoke:live` PASSED: 1 file, 1 test, 13.38 seconds overall. Exactly one potentially billable request used the key from ignored `.env`; no retries or review calls. Provider model `claude-sonnet-5-5`, prompt `swedish-draft-v1`, fictional Swedish D1. Provider latency 13,219 ms; reported input/output/total tokens 2,485/1,777/4,262; reasoning tokens 0. Seven claims and seven exact ID/quote-valid references; explicit clinician decision passthrough passed.

The sanitized report is saved in ignored `.local/live-smoke-result.json`. `git check-ignore` confirmed both `.env` and that report are excluded. No key, source text or model prose was printed. No code changes, further model calls, clinical evaluation or deployment occurred. Prior deterministic/build/browser evidence below was not rerun for this test-only follow-up. The initial missing-key outcome below is historical and is superseded by this actual smoke result.

## CP3 — 21 November 2026

Initial implementation verification environment: macOS arm64, Node 24.22.3 LTS, npm 11.18.0, Next.js 16.4.6, AI SDK 7.0.179 and direct Anthropic provider 4.0.107. No dependency upgrades or real provider credentials were used in those initial checks. Normal tests do not load local env files or run the opt-in live test.

| Command / verification | Actual outcome |
| --- | --- |
| `npm test` | PASSED; 8 files, 137 tests (34 new CP3 transport scenarios), 461 ms. All provider network responses are stubbed. |
| `npm run lint` | PASSED; zero errors/warnings. |
| `npm run typecheck` | PASSED. |
| `npm run test:e2e` | PASSED; 11 Chromium tests in mock mode, 5.0 seconds; no provider key/model calls. |
| `npm run build` | PASSED; compiled and generated production routes using mock mode and a synthetic build-time key marker. |
| `npm run smoke:live` | NOT RUN; wrapper exited 2 because ANTHROPIC_API_KEY is unavailable. Zero calls; no live latency/usage/model quality reported. |
| Configured production live-mode shell | PASSED with a synthetic key: live label visible, draft action enabled, page/health response contain no credential marker, health reports CP3. No generation submitted. |
| Credential-isolation checks | PASSED; 12 public build files scanned, no synthetic credential/test marker hits. Tracked/unignored source scan found no Anthropic-key-pattern matches. `.env.local` and `.local/live-smoke-result.json` are ignored. This is a targeted scan plus the server-only import boundary, not an exhaustive secret audit. |
| `git diff --check` | PASSED. Product/implementation plans and dependency lockfile unchanged. |

The new tests exercise actual installed AI SDK and Anthropic adapter parsing against stubbed HTTP responses: native structured-output request shape, direct endpoint/auth header, model configuration, prompt/data separation and absence of tools; successful metadata including reasoning tokens and unknown usage as null; refusal, truncation and unexpected finish reasons even with otherwise valid JSON; malformed/extra output; missing/unknown/foreign/altered/empty references; and empty fields without gaps. They verify bounded retry on 429/5xx, persistent failure, non-retried 401/403/404, Retry-After seconds/milliseconds/HTTP dates, long-delay refusal, remaining-budget handling, wait timing, timeout despite an uncooperative transport, and request cancellation before/after HTTP begins. Safe endpoint errors and absence of console logs/provider bodies/keys are asserted.

These tests do not prove semantic source support, clinical correctness or resistance to every source injection. The live provider rejects reference-integrity failures, while the existing mock contract can return separate integrity findings. No successful empty response or mock fallback replaces a live failure. Existing draft/edit retention tests and browser flows remain green. The production shell check validates configuration/UI isolation only; a synthetic key does not establish account or model access. Its server was stopped after verification.

SDK APIs were verified against installed docs/types and [structured-output documentation](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data), [direct Anthropic documentation](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic), and [generation limits/cancellation documentation](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text). No actual live smoke occurred during the initial implementation checks; see the follow-up above. Live review, clinical/held-out evaluation, deployment access-protection and Vercel plan checks remain unperformed.

## CP2 — 21 November 2026

Environment: macOS arm64, Node 24.22.3 LTS, npm 11.18.0, Next.js 16.4.6. Browser tests run an automatically launched mock development server with an empty provider key. Live-mode handler tests use only an empty or synthetic test key and make no external requests.

| Command / verification | Actual outcome |
| --- | --- |
| `npm test` | PASSED; 7 files, 103 tests, 227 ms in the final run. Includes 14 draft-handler cases and 7 workspace state tests added in CP2. |
| `npm run lint` | PASSED; zero errors/warnings. |
| `npm run typecheck` | PASSED. |
| `npm run test:e2e` | PASSED; 11 Chromium tests in 3.5 seconds, including the 2 existing shell checks. |
| `npm run build` | PASSED; production build includes dynamic Node.js `/`, `/api/draft` and `/api/health` routes. |
| Visual inspection | Desktop 1280px and narrow 375px screenshots: readable panels, focused/highlighted source passage, tabs, no horizontal overflow. Raw source hashes were removed from the primary display; IDs remain in the returned snapshot and passage DOM IDs. |
| `git diff --check` | PASSED. Original planning documents and imported JSON/overview fixtures remain unchanged. |

Draft handler integration checks exercise the actual exported POST handler and its injected server-only factory: valid D1–D3 requests return the original snapshot and clinician decisions; invalid/malformed/oversized input invokes no provider; live mode fails clearly with/without a key and never falls back; unknown provider errors are masked; unsupported mock text fails explicitly; invalid citations produce integrity findings and no usable citation reference.

Workspace tests verify case clearing, discarded late responses after case/source changes, manual editing during regeneration, request-ID ordering when revisions match, duplicate-response rejection, wrong-case rejection and preservation of draft text on failure. Browser tests cover all three fictional examples, separate clinician decisions, exact decision wording/partial nulls, editable cards, evidence selection/focus, missing-source questions, case switching, loading/failure/retry, retained edits after failed regeneration, validation before network submission, narrow tabs and keyboard navigation. Delayed-response ordering is verified in reducer tests; this checkpoint does not claim the CP6 full review journeys.

Initial browser checks found ambiguous test locators because Next.js also renders a route-announcer alert. Application errors now have distinct accessible names; all final checks pass. The browser tests required approved local process/network access as in CP0. Screenshots live in ignored `test-results/`; browser test servers stop automatically.

Live model smoke/evaluation: NOT RUN. Review endpoint/workflow, suggestion application, field copy/report export and CP6 acceptance remain unimplemented. No measured clinical quality or provider latency is inferred from these tests.

## CP1 — 21 November 2026

Environment: macOS arm64, Node 24.22.3 LTS via the temporary runtime noted below, npm 11.18.0, no provider credentials or model calls.

| Command / verification | Actual outcome |
| --- | --- |
| `npm test` | PASSED; 5 files, 82 tests (11 existing configuration tests and 71 new CP1 cases), 229 ms in the final run. |
| `npm run lint` | PASSED; zero errors/warnings. |
| `npm run typecheck` | PASSED. |
| `npm run build` | PASSED; compilation, TypeScript and production page generation succeeded. |
| `git diff --check` | PASSED. Original product/implementation plans, application UI/routes and dependency manifests remain unchanged in CP1. |

Coverage exercised:

- Swedish text, CRLF/LF/CR segmentation, repeated identical sentences with distinct stable IDs, exact whitespace preservation, copied/frozen snapshots, changed case/revision/content scope, JSON round trips and tamper rejection.
- Empty source rejection; per-field/aggregate character limits; actual UTF-8 byte limits with absent/false Content-Length; declared oversize; streaming cancellation; a split multi-byte character; invalid JSON/UTF-8; and a request exactly at the 256 KB cap.
- Invalid/reversed calendar dates, leap years, partial decisions, allowed/invalid leave percentages, and preserved clinician wording, empty strings and nulls.
- Four unique fields, unique claim/source/finding IDs, correct field membership, request/revision validation, manual/stale claim states, revision-scoped dispositions, null suggestions, and separate complete-empty versus incomplete review states.
- Unknown/foreign/old source IDs and altered/empty quotes. Invalid references are excluded from validated evidence and produce integrity findings; model-supplied status or decision fields are rejected.
- All three prepared mock drafts/reviews, separate patient/clinician attribution, D1 source-supported additions after deleting duties/reasoning, D2 genuine source gaps with questions and no fabricated decisions, and D3 reversed denial/question-as-finding repairs.
- Rejection of unknown review targets, wrong-field targets and invalid proposed citations. Unsupported mock source combinations, including instruction-like text, fail explicitly rather than returning an invented draft.

No CP1 UI changes were made, so browser tests were not rerun for this checkpoint. The CP0 browser evidence below remains historical. No endpoint-level drafting/review acceptance is claimed: those routes do not exist until later checkpoints. The streaming parser and provider validators were exercised directly in integration tests. There are no live quality or injection-resistance claims; the mock provider matches prepared templates rather than performing semantic review.

## CP0 — 21 November 2026

21 November 2026 · CP0 · macOS arm64 · Node 24.22.3 LTS · npm 11.18.0 · Next.js 16.4.6.

The host initially supplied Node 26.6.0. A temporary Node 24 runtime under `/private/tmp/luai-node-runtime` was used for the final software checks, production build and local servers. Dependencies are pinned by `package-lock.json`.

| Check | Actual outcome |
| --- | --- |
| `npm install` | PASSED; dependencies installed and lockfile generated. |
| `npm run lint` | PASSED; zero warnings/errors after fixing an internal link to use Next.js Link. |
| `npm run typecheck` | PASSED, including after browser tests generated development route types. |
| `npm test` | PASSED; 1 file, 11 configuration tests. Mock default, unused credential isolation, invalid modes, missing live keys, model defaults/override, and blank model rejection. |
| `npx playwright install chromium` | PASSED; browser installed under `/private/tmp/luai-playwright`. |
| `npm run test:e2e` | PASSED; 2 tests in Chromium, 4.3 seconds. Uses its own `next dev` server with `AI_MODE=mock` and an empty key. Checks fictional-data/mode labels, four empty fields, workspace headings, health response, keyboard skip link and no horizontal overflow at 375 × 812. |
| `npm run build` | PASSED; production compilation, TypeScript and page generation completed. `/` and `/api/health` are dynamic Node.js routes. |
| `npm run start -- --hostname 127.0.0.1 --port 3101` with `AI_MODE=live`, empty key | PASSED; `/api/health` returned 503, `CONFIGURATION_ERROR`, safe Swedish message, request ID and `retryable: false`. The page rendered the visible missing-key configuration error. No model call. |
| `npm run start -- --hostname 127.0.0.1 --port 3102` with `AI_MODE=mock`, empty key | PASSED; production shell rendered and health returned `status: ok`, `mode: mock`, `checkpoint: CP0`. |
| Visual inspection | PASSED for the CP0 shell at 1440px desktop and 375px narrow width, using full-page Chromium screenshots. Narrow layout stacks panels; future interactive tabs belong to the later workspace implementation. |
| Ignore/bundle checks | PASSED; `.env.local`, dependencies, build and test outputs are ignored. No `ANTHROPIC_API_KEY` or test-secret marker found in `.next/static`. No actual credential was used. |
| Planning-document diff and `git diff --check` | PASSED; original plans unchanged; no whitespace errors. |

Verification needed approved local network/process access: the sandbox initially blocked npm DNS and server port binding (`EPERM`). Re-running those commands with approved access succeeded. Chromium used `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/luai-playwright`; ordinary local setup can use the default browser location instead.

The production servers were stopped after verification. Screenshots are temporary local QA artifacts, not source files.

`test:e2e:ui` is configured but the interactive runner was NOT RUN. `eval:live` deliberately exits with an explicit NOT RUN message until the later evaluation implementation; no live model smoke test or evaluation has occurred. npm emitted an ESLint 9 support deprecation notice during installation; the pinned Next.js-compatible linter completed successfully.

Mock shell checks do not establish drafting, review, or live model quality.

## Hover references and longer development examples — 21 November 2026

- `npm test`: 226 tests in 19 files passed. Includes exact citations from the longer transcripts and journal notes, valid diagnosis codes, and canonical JSON example checks.
- `npm run test:e2e`: 34 Chromium checks passed. Text hover, Alt+Down, Escape, touch access, every prepared citation opening its exact passage, manual edits, stale review, source supplementation, clipboard recovery and reports are covered.
- `npm run build`: passed, including TypeScript. Desktop and narrow screenshots inspected.
- Visible citation rows were removed from the draft and findings. Source previews float above the document and allow opening the original passage. Examples are loaded through the server layout; the client receives the validated case data.
- D1–D3 now have 58–65 timestamped turns, about 1,300–1,400 words each, two dated journal notes per case, and clinician-selected M54.5 or M54.2 codes. Prepared mock wording and exact source references were updated together.
- Frozen H1–H3 and their answer keys were unchanged. No live model call or new clinical validation was performed. Historical live results do not validate these updated examples.

## Live draft token-limit regression — 21 November 2026

The user-reported format failure was reproduced on the long fictional D1 example: the live provider stopped at 6,000 output tokens (`max_tokens`) with incomplete JSON. Increased the shared per-step output cap to 12,000, set low effort for draft formatting only, and mapped token-limit parsing failures to an explicit length-limit error. Review retains its default reasoning effort; strict schema and citation validation remain enabled.

- Full deterministic suite: 227 tests passed. A focused rerun of the final draft/review transport changes passed all 49 checks.
- Production build and TypeScript: passed.
- Live verification: the same D1 example passed in 26,619 ms with 14 claims, 20 exact references and unchanged clinician decisions; 14,282 input / 3,844 output tokens. No retry, live review or held-out evaluation.
- Safe local diagnostic reports contain finish reasons, counts and schema issue paths only; source/model prose and credentials are not retained.

## Phrase-level sources and review marks — 21 November 2026

- 239 deterministic tests passed across 20 files. New coverage includes exact/repeated Unicode phrases, source-index bounds, overlapping source/review ranges, unchanged document text, unresolved-anchor rejection, and missing or mismatched live annotations.
- All 34 previous browser journeys passed. Two added phrase-specific checks passed: a phrase opens only its own sources, and a missing-information field heading explains itself on hover. Native editing/copy/export and stale-result guards still pass. Browser tests now use `.next-e2e` so a running user development server can remain active.
- Production build/typecheck passed. Desktop/narrow phrase previews inspected visually.
- Live D1 draft and review probes passed with the new schemas; the draft had 8 claims/12 references and exact anchor alignment, and review detected the deliberate omission with 5 findings/1 phrase target. The first live draft and review attempts also failed validation; those failures were retained as failures and not presented as evidence of quality. No automatic retries were added.
- Frozen held-out cases and answer keys were unchanged; no new held-out or clinical evaluation was performed.


## FK guidance follow-up — 21 November 2026

Added `fk7804-2026-11-21.v1`, a seven-rule curated summary of official FK instructions for narrative fields 3, 5, 6 and 7. Both live system prompts include the pinned rules. Live review requires complete per-rule accounting, applicable allowlisted finding rule IDs and questions for unassessable rules. Server validation rejects inconsistent output; independent source/empty-field checks remain. Hover popups and finding details resolve requirements and official source links from application-owned data. Metadata/review history record the guidance version. Mock examples demonstrate links without claiming semantic FK review.

The existing clinician diagnosis is read-only draft context for DFA continuity; all decisions remain application-controlled. Draft v5 writes text parts once and derives highlights, removing the duplicate-phrase mismatch caught by the first live draft probe. Review uses explicit medium effort after the initial default-effort timeout. Scope and source maintenance are documented in [FK_GUIDANCE.md](FK_GUIDANCE.md).

Verification: 258 unit/integration tests, all 39 Chromium workflows, lint, typecheck, production build and whitespace checks passed. Final live draft passed in 22,015 ms; final guided omission review passed in 14,422 ms with all seven checks and the expected omission detected. Four explicit live probes were made, including the initial timeout and anchor-validation failure; no automatic retries. New prompts have no independent clinical validation or rerun held-out evaluation. No deployment or certificate transmission occurred.
