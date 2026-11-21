import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";

const args = process.argv.slice(2);
const limit = args.length === 0 ? 3 : args.length === 2 && args[0] === "--limit" && /^[1-3]$/.test(args[1]) ? Number(args[1]) : null;
if (limit === null) {
  console.error("Use npm run eval:live -- [--limit 1|2|3]. 0 model calls."); process.exitCode = 2;
} else {
  nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    console.error("NOT RUN: ANTHROPIC_API_KEY is unavailable. 0 model calls."); process.exitCode = 2;
  } else {
    console.info(`Explicit held-out evaluation: at most ${limit * 2} potentially billable calls (${limit} draft + ${limit} review), no retries, H1–H${limit}. No model grader or baseline.`);
    console.info("Validated fictional model text is saved only in ignored .local/held-out-observations.json for developer adjudication; credentials/provider bodies are never recorded.");
    const cli = fileURLToPath(new URL("../node_modules/vitest/vitest.mjs", import.meta.url));
    const child = spawn(process.execPath, [cli, "run", "--config", "vitest.live.config.ts", "tests/live/held-out-evaluation.live.ts"],
      { stdio: "inherit", env: { ...process.env, LUAI_EVAL_LIMIT: String(limit) } });
    child.on("error", () => { console.error("Evaluation runner could not start."); process.exitCode = 1; });
    child.on("exit", (code) => { process.exitCode = code ?? 1; });
  }
}
