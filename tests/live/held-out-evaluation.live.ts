import { mkdir, writeFile } from "node:fs/promises";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { loadFrozenCases, runEvaluation } from "../../evals/run";
import { getServerConfig } from "../../lib/server/config";
import { LiveProvider } from "../../lib/server/live-provider";

it.skipIf(!process.env.ANTHROPIC_API_KEY?.trim())("bounded frozen held-out evaluation, no retries or model grading", async () => {
  const limit = Number(process.env.LUAI_EVAL_LIMIT);
  const frozen = await loadFrozenCases(limit);
  const config = getServerConfig({ ...process.env, AI_MODE: "live" });
  if (config.mode !== "live") throw new Error("Live configuration unavailable.");
  let httpRequests = 0;
  const boundedFetch: typeof fetch = async (input, init) => {
    if (httpRequests >= limit * 2) throw new Error("Evaluation call limit reached.");
    httpRequests++;
    return fetch(input, init);
  };
  const started = new Date().toISOString();
  const result = await runEvaluation(frozen.cases, new LiveProvider(config, { maxRetries: 0, fetch: boundedFetch }));
  const report = { started, finished: new Date().toISOString(), mode: "live", configuredModel: config.model,
    promptSha256: frozen.promptSha256, fixtureSha256: frozen.fixtureSha256, httpRequests, retries: 0,
    semanticAdjudication: "PENDING developer review; not clinically validated", ...result };
  await mkdir(".local", { recursive: true });
  await writeFile(".local/held-out-observations.json", JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
  console.info(`Evaluation recorded: ${httpRequests} model HTTP requests; ${result.results.filter((row) => row.draft.status === "PASSED" && row.review.status === "PASSED").length}/${limit} cases completed. See ignored .local/held-out-observations.json.`);
  expect(result.results).toHaveLength(limit);
  expect(httpRequests).toBeLessThanOrEqual(limit * 2);
  expect(result.results.every((row) => row.draft.status === "PASSED" && row.review.status === "PASSED"), "Incomplete cases remain in the local report; no automatic rerun.").toBe(true);
}, 370_000);
