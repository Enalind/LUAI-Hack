# Intyg som håller

Swedish-language prototype for source-linked FK7804 narrative drafts. **Only fictional patient cases.**

CP0–CP2 are complete: fictional case loading, source/assessment/decision inputs, a validated draft endpoint, four editable narrative fields, separate clinician decisions and source passage navigation. Live generation, the review workflow and export remain later checkpoints. See [PRODUCT_SPEC.md](PRODUCT_SPEC.md), [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md), and [implementation status](docs/IMPLEMENTATION_STATUS.md).

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

The prepared mock supports the examples' unchanged consultation and assessment text. Arbitrary pasted or changed narratives return an explicit error, retaining your input and previous draft. Decision-only changes are supported. Review has not run; a matching quote does not establish clinical support.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local development server |
| `npm run lint` | ESLint directly, with zero warnings |
| `npm run typecheck` | TypeScript without emitting files |
| `npm test` | Deterministic contracts, source/evidence, mock provider, draft handler and workspace state tests |
| `npm run test:e2e` | Chromium draft/evidence/error/tab flows; starts its own mock server on port 3100 |
| `npm run test:e2e:ui` | Interactive Playwright runner |
| `npm run eval:live` | Explicit NOT RUN error until live evaluation is implemented; no model calls in CP0–CP2 |
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

`GET /api/health` checks configuration and returns only the mode and checkpoint (`CP2`), or a safe HTTP 503 configuration error. It does not check provider connectivity. The page also displays configuration errors. Live mode never falls back silently to mock. **Live drafting is not implemented yet:** `/api/draft` returns a safe 503 in live mode even when a key exists.

## CP1 modules

Shared Zod contracts are in `lib/schemas.ts`; pure segmentation and quote validation are in `lib/sources.ts` and `lib/evidence.ts`. Server-only modules create and verify source snapshots, enforce the 256 KB streaming request limit, expose the two-operation provider interface, and validate prepared draft/review output. Output decision fields are copied exclusively from clinician input. Invalid citations are removed from validated evidence and retained as explicit integrity findings.

[Development fixtures](fixtures/development/README.md) contain D1–D3 and independently written answer keys. The active Swedish cases are defined in `cases.ts`; the separate English JSON fixtures imported from origin are preserved and are not currently wired to mock generation. Neither set is held-out evaluation data.

`POST /api/draft` accepts the shared `draftRequestSchema` contract, applies bounded JSON reading and validation before provider selection, creates a source snapshot, generates via the mock provider, validates evidence, and returns `draftResponseSchema` with the original snapshot and captured request/revision identifiers. Errors have safe Swedish messages, a machine code, request ID and retry flag. Responses use `Cache-Control: no-store`. Client request IDs and both revisions prevent late results from overwriting edits or appearing in another case; superseded requests are also aborted where possible.

`/api/review` is not implemented. Review dispositions, applying suggestions, copying fields and report export remain later work.

## Verification and remaining work

Actual results are recorded in [TEST_REPORT.md](docs/TEST_REPORT.md). [EVALUATION_REPORT.md](docs/EVALUATION_REPORT.md) explicitly separates software checks from unperformed live evaluation.

No deployment has occurred. Vercel runtime duration, access protection and final deployment readiness are CP6 work. Do not expose a future paid live endpoint without deployment access protection; use mock for a public demo.
