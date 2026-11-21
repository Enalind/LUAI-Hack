# Intyg som håller

Swedish-language prototype for source-linked FK7804 narrative drafts. **Only fictional patient cases.**

CP0–CP3 implementation is complete: fictional case loading, source/assessment/decision inputs, a validated draft endpoint, four editable narrative fields, separate clinician decisions, source navigation and a direct Anthropic live draft provider. Mock mode is verified; actual live generation is NOT RUN because no server-side key was available. The review workflow and export remain later checkpoints. See [PRODUCT_SPEC.md](PRODUCT_SPEC.md), [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md), and [implementation status](docs/IMPLEMENTATION_STATUS.md).

## Local setup

Use Node.js 24 LTS (`nvm use` reads `.nvmrc`) and npm.

```sh
nvm install
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Mock mode is the default and requires no provider key. Work stays in browser memory; reloading clears inputs and edits.

1. Select one of the three fictional Swedish examples. Optional clinician decision fields can be changed or left empty.
2. Select **Skapa intygsutkast**. The app displays fields 3, 5, 6 and 7, with missing information shown as questions.
3. Select a **Källa** button to focus and highlight its original passage. On narrow screens, this also opens the Underlag tab. Arrow keys navigate the workspace tabs.
4. Edit individual claim cards. Their previous citations remain visible as unverified suggestions. Source/decision edits mark the whole draft as belonging to an older source version. **Ersätt med nytt utkast** replaces the current draft; switching examples clears it.

The prepared mock supports the examples' unchanged consultation and assessment text. In mock mode, arbitrary pasted or changed narratives return an explicit error, retaining your input and previous draft. Decision-only changes are supported. Live mode accepts validated fictional source text; its output quality remains unevaluated. Review has not run; a matching quote does not establish clinical support.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local development server |
| `npm run lint` | ESLint directly, with zero warnings |
| `npm run typecheck` | TypeScript without emitting files |
| `npm test` | Deterministic contracts, sources, providers, transport failures, draft handler and workspace state tests; never uses real credentials or live calls |
| `npm run test:e2e` | Chromium draft/evidence/error/tab flows; starts its own mock server on port 3100 |
| `npm run test:e2e:ui` | Interactive Playwright runner |
| `npm run smoke:live` | Explicit, potentially billable single live D1 draft; no retries; exits 2 with NOT RUN if no key |
| `npm run eval:live` | Explicit NOT RUN error until the later held-out evaluation is implemented |
| `npm run build` | Production build |
| `npm run start` | Serve the production build locally |

Install the test browser once with `npx playwright install chromium` before browser tests.

## Server configuration

Copy `.env.example` to ignored `.env.local`. Keep actual credentials out of Git and browser code.

| Variable | Default | Behavior |
| --- | --- | --- |
| `AI_MODE` | `mock` | Accepts exactly `mock` or `live`; invalid values produce a configuration error |
| `ANTHROPIC_API_KEY` | empty | Required only in live mode; server-only |
| `ANTHROPIC_MODEL` | `claude-sonnet-5-5` | Future live provider model; a blank value in live mode is invalid |

`GET /api/health` checks configuration and returns only the mode and checkpoint (`CP3`), or a safe HTTP 503 configuration error. It does not check provider connectivity or account/model access. The page also displays configuration errors. Live failures never fall back to mock.

To try live drafting, set `AI_MODE=live` and a valid `ANTHROPIC_API_KEY` in ignored `.env.local`, then restart the app. `ANTHROPIC_MODEL` remains configurable on the server. Requests use direct Anthropic structured output, a 6,000-token output cap, a shared 60-second deadline and at most one retry for 429/5xx when a short provider-requested delay fits. The browser allows 70 seconds for a safe server error to return. See [live provider operation](docs/LIVE_PROVIDER.md) for error handling, smoke testing and verification limits.

## CP1 modules

Shared Zod contracts are in `lib/schemas.ts`; pure segmentation and quote validation are in `lib/sources.ts` and `lib/evidence.ts`. Server-only modules create and verify source snapshots, enforce the 256 KB streaming request limit, expose the two-operation provider interface, and validate prepared draft/review output. Output decision fields are copied exclusively from clinician input. Invalid citations are removed from validated evidence and retained as explicit integrity findings.

[Development fixtures](fixtures/development/README.md) contain D1–D3 and independently written answer keys. The active Swedish cases are defined in `cases.ts`; the separate English JSON fixtures imported from origin are preserved and are not currently wired to mock generation. Neither set is held-out evaluation data.

`POST /api/draft` accepts the shared `draftRequestSchema` contract, applies bounded JSON reading and validation before provider selection, creates a source snapshot, selects mock/live explicitly, validates evidence, and returns `draftResponseSchema` with the original snapshot and captured request/revision identifiers. Errors have safe Swedish messages, a machine code, request ID and retry flag. Responses use `Cache-Control: no-store`. Client request IDs and both revisions prevent late results from overwriting edits or appearing in another case; superseded requests are also aborted where possible. Live output with missing/invalid evidence fails explicitly. Mock output can retain an invalid-reference finding with unusable references removed.

`/api/review` is not implemented. Review dispositions, applying suggestions, copying fields and report export remain later work.

## Verification and remaining work

Actual results are recorded in [TEST_REPORT.md](docs/TEST_REPORT.md). [EVALUATION_REPORT.md](docs/EVALUATION_REPORT.md) explicitly separates software checks from unperformed live evaluation.

No deployment has occurred. The draft route declares Node.js and `maxDuration = 120`; selected-plan duration support and deployment access protection remain CP6 checks. Do not expose a paid live endpoint without deployment access protection; use mock for a public demo.
