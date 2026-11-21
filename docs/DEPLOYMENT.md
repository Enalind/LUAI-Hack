# Vercel deployment

The app supports both mock and live AI on Vercel. Live mode was enabled at the user's request after CP6; the original CP6 mock-only restriction has been replaced. No deployment has been performed or inspected in this workspace.

## Vercel configuration

1. Import this repository as a Next.js project with the repository root as Root Directory.
2. Use Node.js **24.x**. Both package manifests pin `engines.node` to `24.x`, matching `.nvmrc` and the runtime used for verification. A broad semver range can select Vercel's newer default instead; see [supported Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).
3. Keep the install command `npm ci`, build command `npm run build`, and framework/output defaults. `vercel.json` selects Next.js and Fluid Compute. No custom output directory or Edge runtime is used.
4. Set **AI_MODE=live** and **ANTHROPIC_API_KEY** in the Vercel environment settings for each environment that should use real AI (Production and/or Preview). Optionally set **ANTHROPIC_MODEL**; otherwise the app uses its existing default. Enter the key as a server-only environment variable, without a `NEXT_PUBLIC_` prefix. For a mock environment, set **AI_MODE=mock** and omit the key. Leave automatic system-environment exposure enabled so Vercel supplies `VERCEL=1`.
5. Deploy or redeploy after changing environment settings, then verify the actual target's `/api/health` returns the chosen mode and checkpoint `CP6`. Confirm the page's mode label, then use a fictional D1–D3 example to test drafting and explicitly start review. In live mode these operations make billable Anthropic requests.

When `VERCEL=1`, `AI_MODE` must be explicitly `mock` or `live`. Missing/invalid modes, or live mode without a usable key, return a safe configuration error before any provider request. Live failures never fall back to mock. Integration tests exercise the real health/draft/review routes and provider factory with a stubbed Anthropic transport; they do not prove deployed provider connectivity.

| Variable | Local | Vercel demo |
| --- | --- | --- |
| `AI_MODE` | `mock` by default; explicit `live` for provider work | Explicit `mock` or `live` required per environment |
| `ANTHROPIC_API_KEY` | Ignored `.env.local` / `.env`, server-only, required for live | Required for live; unset for mock |
| `ANTHROPIC_MODEL` | `claude-sonnet-5-5` default; frozen evaluation records actual served ID | Same default in live; optional override; unused in mock |
| `VERCEL` | Unset for normal local use | Platform-managed `1`; requires an explicit mode |

`.vercelignore` excludes local env files, evaluation observations, tests and held-out cases from deployment uploads. Browser code has no credential variables and no shared backend secret. The build uses bundled local fonts and logos; no external font service is required.

## Function duration and runtime

The draft/review handlers export `runtime = "nodejs"` and `maxDuration = 120`; source refresh and health use Node.js without a model call. The provider deadline is 60 seconds and browser timeout 70 seconds. App Router's named `maxDuration` export is the [supported configuration](https://vercel.com/docs/functions/configuring-functions/duration). The documented Fluid Compute Hobby limit is 300 seconds, so 120 seconds fits that published limit; the deployed account's actual settings have **not** been inspected. No deployment URL, active hosting protection or provisioned runtime is claimed verified until an authorized deployment is inspected.

## Live demo access

The app has no built-in authentication or per-user rate limit. Anyone with access to its live endpoints can trigger paid requests. For a restricted demo, configure [Vercel Deployment Protection](https://vercel.com/docs/deployment-protection) for the intended preview/production URLs and `/api/*`, then verify an unauthenticated request is denied. Account settings and access protection have not been inspected. Use fictional demo inputs.

## Local production verification

```sh
npm ci
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
AI_MODE=mock VERCEL=1 npm run build
AI_MODE=mock VERCEL=1 npm run start
```

The two Vercel flags simulate a hosted mock environment locally; they do not prove a real deployment is provisioned. To verify a live production build without making model calls, use `AI_MODE=live VERCEL=1 ANTHROPIC_API_KEY=test-only-build-secret npm run build`. Do not send draft/review requests with this placeholder key. `/api/health` is a configuration check, not a provider-connectivity or clinical-quality check.
