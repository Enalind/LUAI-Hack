# Deployment readiness — CP6

No deployment is authorized by CP6 and none has been performed. This project is prepared for a **public mock demo**, not a hosted paid-model service.

## Vercel configuration

1. Import this repository as a Next.js project with the repository root as Root Directory.
2. Use Node.js **24.x**. Both package manifests pin `engines.node` to `24.x`, matching `.nvmrc` and the runtime used for verification. A broad semver range can select Vercel's newer default instead; see [supported Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).
3. Keep the install command `npm ci`, build command `npm run build`, and framework/output defaults. `vercel.json` selects Next.js and Fluid Compute. No custom output directory or Edge runtime is used.
4. Set **AI_MODE=mock** explicitly in Production and Preview environments. Do not add an Anthropic key to the public project. Leave automatic system-environment exposure enabled so Vercel supplies `VERCEL=1`.
5. Redeploy after changing environment settings, then verify the actual target's `/api/health` returns mode `mock`, checkpoint `CP6`. Confirm the page's prototype and mock labels and run the fictional D1–D3 flows.

The server fails closed when `VERCEL=1` and `AI_MODE` is missing or differs from `mock`. Health/UI return a safe configuration error and generation/review cannot select a live provider. This is an explicit deployment policy, not silent fallback after a live failure. Integration tests verify rejection before any provider fetch, including when a synthetic key is present. Local live mode remains available for opt-in fictional evaluation.

| Variable | Local | Vercel public demo |
| --- | --- | --- |
| `AI_MODE` | `mock` by default; explicit `live` for local provider work | Explicit `mock` required for both Preview and Production |
| `ANTHROPIC_API_KEY` | Ignored `.env.local` / `.env`, server-only, required for live | Unset |
| `ANTHROPIC_MODEL` | `claude-sonnet-5-5` default; frozen evaluation records actual served ID | Unused in mock mode |
| `VERCEL` | Unset for normal local use | Platform-managed `1`; used by the hosted mock-only guard |

`.vercelignore` excludes local env files, evaluation observations, tests and held-out cases from deployment uploads. Browser code has no credential variables and no shared backend secret. The build uses bundled local fonts and logos; no external font service is required.

## Function duration and runtime

The draft/review handlers export `runtime = "nodejs"` and `maxDuration = 120`; source refresh and health use Node.js without a model call. The provider deadline is 60 seconds and browser timeout 70 seconds. App Router's named `maxDuration` export is the [supported configuration](https://vercel.com/docs/functions/configuring-functions/duration). The documented Fluid Compute Hobby limit is 300 seconds, so 120 seconds fits that published limit; the deployed account's actual settings have **not** been inspected. No deployment URL, active hosting protection or provisioned runtime is claimed verified until an authorized deployment is inspected.

## If a hosted live preview is requested later

The present code intentionally rejects live mode on Vercel. Before changing that policy, explicitly authorize a protected live deployment, configure platform access protection for **all** intended preview/production URLs and `/api/*`, and verify an unauthenticated request is denied. Check [Vercel Deployment Protection](https://vercel.com/docs/deployment-protection) for the account's current options. Never assume a preview protection setting also protects every production domain. Do not put a shared secret in client JavaScript or add a custom login system for this prototype.

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

The two Vercel flags simulate the hosted mock-only policy locally; they do not prove a real deployment is provisioned. `/api/health` is a configuration check, not a provider-connectivity or clinical-quality check.
