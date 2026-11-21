# Intyg som håller

Swedish-language prototype for source-linked FK7804 narrative drafts. **Only fictional patient cases.**

CP0–CP5 implementation is complete: fictional case loading, editable source-linked drafts, separate clinician decisions, direct Anthropic drafting and an explicit review workflow with questions, evidence and proposed changes. Mock flows and one live draft/review smoke each are verified; clinical quality and held-out evaluation remain untested. Revision-scoped accept/dismiss, source supplementation with preserved manual text, field copying and separate JSON reports are implemented. CP5 required zero live model calls. See [PRODUCT_SPEC.md](PRODUCT_SPEC.md), [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md), and [implementation status](docs/IMPLEMENTATION_STATUS.md).

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
5. Select **Granska utkast** to run code checks plus mock/model-assisted review. Follow finding citations, inspect proposed additions/replacements/deletions, or use **Komplettera underlaget** to focus the assessment input. Proposals never change text automatically.
6. Use **Acceptera förslag** or **Avfärda fynd**, optionally with a clinician note. Acceptance changes only the target section/claim and makes the review stale. Dismissal keeps the text and does not verify it.
7. Add missing clinician facts with **Lägg till läkaruppgift i underlaget**. Select **Granska** to update the immutable source version and recheck the existing draft, preserving manual edits. This performs no draft-generation call. **Ersätt med nytt utkast** remains a deliberate replacement.
8. Select **Granska på nytt** after changes. Old findings remain stale until a complete recheck succeeds. A failed review preserves editable text and allows retry.
9. **Kopiera fält** copies current claim text only. Unresolved findings, gaps, missing evidence or incomplete/stale review require an explicit in-app confirmation. If the clipboard fails, selectable text appears.
10. **Ladda ner granskningsrapport** downloads a separate JSON report with revisions, findings, decisions, dispositions, review history and model/prompt metadata. Original source text and exact quotes are excluded unless you check **Inkludera fiktivt källunderlag…**. Reports include current draft text; save them deliberately.

The prepared mock supports the examples' original consultation/assessment plus explicit field-scoped clinician supplements entered through the supplement form. It copies those additions literally with attribution; it does not judge whether they resolve a medical gap. In mock mode, arbitrary pasted or changed narratives return an explicit error, retaining your input and previous draft. Decision-only changes are supported. Mock review compares prepared wording and can flag paraphrases. Live mode accepts validated fictional source text; broad quality remains unevaluated. A matching quote or completed model review does not establish clinical support or approval.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local development server |
| `npm run lint` | ESLint directly, with zero warnings |
| `npm run typecheck` | TypeScript without emitting files |
| `npm test` | Deterministic contract, source, provider, draft/review handler and workspace state tests; never uses real credentials or live calls |
| `npm run test:e2e` | Chromium draft/review/evidence/error/tab flows; starts its own mock server on port 3100 |
| `npm run test:e2e:ui` | Interactive Playwright runner |
| `npm run smoke:live` | Explicit, potentially billable single live D1 draft; no retries; exits 2 with NOT RUN if no key |
| `npm run smoke:review` | Explicit single live review of a prepared corrupted D1 draft; zero live draft calls and no retries |
| `npm run eval:live` | Explicit NOT RUN error until the later held-out evaluation is implemented |
| `npm run build` | Production build |
| `npm run start` | Serve the production build locally |

Install the test browser once with `npx playwright install chromium` before browser tests.

## Server configuration

For a new setup, copy `.env.example` to ignored `.env.local`. An existing ignored `.env` is also supported; `.env.local` takes precedence. Keep actual credentials out of Git and browser code.

| Variable | Default | Behavior |
| --- | --- | --- |
| `AI_MODE` | `mock` | Accepts exactly `mock` or `live`; invalid values produce a configuration error |
| `ANTHROPIC_API_KEY` | empty | Required only in live mode; server-only |
| `ANTHROPIC_MODEL` | `claude-sonnet-5-5` | Live draft/review model; a blank value in live mode is invalid |

`GET /api/health` checks configuration and returns only the mode and checkpoint (`CP5`), or a safe HTTP 503 configuration error. It does not check provider connectivity or account/model access. The page also displays configuration errors. Live failures never fall back to mock.

To try live drafting/review, set `AI_MODE=live` and a valid `ANTHROPIC_API_KEY` in ignored `.env` or `.env.local`, then restart the app. `ANTHROPIC_MODEL` remains configurable on the server. Each operation uses direct Anthropic structured output, a 6,000-token output cap and a 60-second deadline. Drafting allows at most one short 429/5xx retry; review uses exactly one attempt, with no automatic retries or automatic review after generation. The browser allows 70 seconds for a safe error to return. See [live provider operation](docs/LIVE_PROVIDER.md).

## CP1 modules

Shared Zod contracts are in `lib/schemas.ts`; pure segmentation and quote validation are in `lib/sources.ts` and `lib/evidence.ts`. Server-only modules create and verify source snapshots, enforce the 256 KB streaming request limit, expose the two-operation provider interface, and validate prepared draft/review output. Output decision fields are copied exclusively from clinician input. Invalid citations are removed from validated evidence and retained as explicit integrity findings.

[Development fixtures](fixtures/development/README.md) contain D1–D3 and independently written answer keys. The active Swedish cases are defined in `cases.ts`; the separate JSON fixtures imported from origin (now translated to Swedish) are preserved and are not currently wired to mock generation. Neither set is held-out evaluation data.

`POST /api/draft` accepts the shared `draftRequestSchema` contract, applies bounded JSON reading and validation before provider selection, creates a source snapshot, selects mock/live explicitly, validates evidence, and returns `draftResponseSchema` with the original snapshot and captured request/revision identifiers. Errors have safe Swedish messages, a machine code, request ID and retry flag. Responses use `Cache-Control: no-store`. Client request IDs and both revisions prevent late results from overwriting edits or appearing in another case; superseded requests are also aborted where possible. Live output with missing/invalid evidence fails explicitly. Mock output can retain an invalid-reference finding with unusable references removed.

`POST /api/review` validates the complete snapshot, draft IDs/fields, clinician decisions and revisions before selecting a provider. Code checks reference integrity and empty sections; the mock/live reviewer distinguishes omitted source details from genuine source gaps and reviews four categories. Unknown targets or invalid proposed citations cannot become usable proposals. On provider failure, the response is a typed `ReviewResult` with `completionStatus: incomplete`, a safe error and retained code findings; callers must inspect completion status, not just HTTP 200. See [review behavior](docs/REVIEW.md). See [editing and export](docs/EDITING_EXPORT.md) for disposition scope, source refresh and copy/report behavior.

`POST /api/sources` accepts the same validated request envelope as drafting and returns an immutable source snapshot without selecting any provider. Rechecking changed sources uses this endpoint, preserves current draft wording, and only then starts one explicit review.

## Verification and remaining work

Actual results are recorded in [TEST_REPORT.md](docs/TEST_REPORT.md). [EVALUATION_REPORT.md](docs/EVALUATION_REPORT.md) explicitly separates software checks from unperformed live evaluation.

No deployment has occurred. Draft/review routes declare Node.js and `maxDuration = 120`; selected-plan duration support and deployment access protection remain CP6 checks. Do not expose paid live endpoints without deployment access protection; use mock for a public demo.
