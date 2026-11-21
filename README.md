# Intyg som håller

Swedish-language prototype for source-linked FK7804 narrative drafts. **Only fictional patient cases.**

CP0 provides the runnable workspace shell and configuration checks. Source input, drafting, review, editing and export are planned in CP1–CP6 and are not implemented yet. See [PRODUCT_SPEC.md](PRODUCT_SPEC.md), [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md), and [implementation status](docs/IMPLEMENTATION_STATUS.md).

## Local setup

Use Node.js 24 LTS (`nvm use` reads `.nvmrc`) and npm.

```sh
nvm install
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Mock mode is the default and requires no provider key. Active work is intended to remain in browser memory; reloading will clear edits once editing is implemented.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local development server |
| `npm run lint` | ESLint directly, with zero warnings |
| `npm run typecheck` | TypeScript without emitting files |
| `npm test` | Deterministic configuration tests |
| `npm run test:e2e` | Chromium shell smoke tests; starts its own mock server on port 3100 |
| `npm run test:e2e:ui` | Interactive Playwright runner |
| `npm run eval:live` | Explicit NOT RUN error until live evaluation is implemented; never calls a model in CP0 |
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

`GET /api/health` checks configuration and returns only the mode and checkpoint, or a safe HTTP 503 configuration error. It does not check provider connectivity. The page also displays configuration errors. Live mode never falls back silently to mock. **A configured live shell does not mean generation is implemented.**

## Verification and remaining work

Actual results are recorded in [TEST_REPORT.md](docs/TEST_REPORT.md). [EVALUATION_REPORT.md](docs/EVALUATION_REPORT.md) explicitly separates software checks from unperformed live evaluation.

No deployment has occurred. Vercel runtime duration, access protection and final deployment readiness are CP6 work. Do not expose a future paid live endpoint without deployment access protection; use mock for a public demo.
