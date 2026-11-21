# Test report

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
