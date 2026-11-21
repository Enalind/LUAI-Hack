# Test report

## CP3 — 21 November 2026

Environment: macOS arm64, Node 24.22.3 LTS, npm 11.18.0, Next.js 16.4.6, AI SDK 7.0.179 and direct Anthropic provider 4.0.107. No dependency upgrades or real provider credentials were used. Normal tests do not load local env files or run the opt-in live test.

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

SDK APIs were verified against installed docs/types and [structured-output documentation](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data), [direct Anthropic documentation](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic), and [generation limits/cancellation documentation](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text). No actual live smoke/evaluation, live review, deployment access-protection check or Vercel plan verification occurred.

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
