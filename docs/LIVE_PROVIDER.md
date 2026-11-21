# Live draft provider

Implemented in CP3 on 21 November 2026. Actual live smoke: NOT RUN, since no Anthropic key was available in the server environment or local env files. Do not describe live model behavior as demo-ready or clinically evaluated from the deterministic tests.

## Configuration and flow

Default `AI_MODE=mock` needs no credentials. Explicit `AI_MODE=live` requires `ANTHROPIC_API_KEY`; `ANTHROPIC_MODEL` defaults to `claude-sonnet-5-5`. Keep credentials in ignored `.env.local` or server environment settings, then restart the local server. The live UI displays its mode and explains that fictional source text goes to Anthropic and generation may incur a cost.

`LiveProvider` uses `createAnthropic({ apiKey })` and a direct model instance. The application sends no tools, enables no native citations, and does not use a gateway. Generation uses `generateText` with `Output.object` and the shared narrative schema, matching the installed `ai@7.0.179` / `@ai-sdk/anthropic@4.0.107` APIs and [official structured-output documentation](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) and [direct Anthropic provider documentation](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic).

Prompt identifier: `swedish-draft-v1` in `lib/server/prompts.ts`. Source passages are serialized as JSON in one user message, separate from the system instructions. The prompt asks for attributed Swedish narrative text, preserved negation/uncertainty, exact source IDs/quotes, focused gap questions, and no fabricated clinical decisions. Typed clinician decisions are omitted from the model prompt and copied directly from the immutable source snapshot into the application response. These instructions are not proof of semantic support or complete injection resistance.

The provider validates the structured result and every citation. Empty sections must have information gaps. Refusals, unexpected finish reasons and truncation remain failures, including when returned text happens to be valid JSON. A live draft with missing, foreign or mismatched evidence is rejected with `INVALID_MODEL_OUTPUT`. No successful empty review or mock fallback is substituted. Live review remains an explicit unavailable operation until CP4.

## Runtime limits and errors

- Maximum output: 6,000 tokens, including any model reasoning charged within the output budget.
- One shared 60-second generation deadline covers attempts and retry waits. SDK retries are disabled; the application makes at most one extra attempt for HTTP 429/5xx. Abort signals are passed through, and an outer deadline still returns a safe timeout if a transport ignores cancellation.
- `Retry-After` seconds, HTTP dates and `retry-after-ms` are respected. A delay over 5 seconds, or one that cannot fit the remaining budget with a 1-second reserve, returns a retryable error immediately. Without a usable header, the initial retry wait is 750 ms. Longer requested waits are never shortened.
- Authentication/model-access 4xx errors are not retried. Unknown errors and raw SDK/provider error bodies are not returned. No source/model prose is logged by application code. SDK telemetry and input/output recording are disabled, and raw request/response retention is explicitly disabled.
- The browser timeout is 70 seconds, allowing the server's safe error to return. Cancellation is best effort and does not guarantee provider billing stops.
- The Node.js route exports `maxDuration = 120`, using the [documented Next.js App Router configuration](https://vercel.com/docs/functions/configuring-functions/duration). Hosting-plan compatibility and access protection have not been verified; deployment is outside CP3.

Success metadata contains explicit live mode, the provider-reported model ID (falling back to configured ID), prompt version, measured latency, and SDK-reported input/output/total/reasoning tokens. Missing usage values remain null. Failed-call usage is not exposed by the error contract and must not be assumed to be zero. No raw provider body, source text, prompt or credential is added to error responses.

## Explicit smoke command

Run `npm run smoke:live` only when a live test is intended. The wrapper announces **one potentially billable draft call, zero review calls and no retries** before launching it. It uses fictional Swedish D1 and opts into live mode for that command, independently of the app's mock default. Ordinary `npm test` and `test:e2e` never run this test or load real credentials.

Without a key, the wrapper prints NOT RUN, makes zero calls and exits 2. With a key, it records a sanitized `.local/live-smoke-result.json`; `.local/` is ignored. The report contains model/prompt identifiers, time, usage, counts and contract/reference checks, or a safe failure code. It contains no source text, model prose or credentials. It is a contract/reference smoke test, not a clinical review or held-out evaluation. `npm run eval:live` remains reserved for CP6.
