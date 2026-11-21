import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const review = process.argv.length === 3 && process.argv[2] === "--review";
if (process.argv.length > 2 && !review) {
  console.error("Use the draft smoke command or --review. No model calls.");
  process.exitCode = 2;
} else if (!process.env.ANTHROPIC_API_KEY?.trim()) {
  console.error("NOT RUN: ANTHROPIC_API_KEY is unavailable in the server environment/local env files. 0 model calls.");
  process.exitCode = 2;
} else {
  console.info(review ? "Explicit review smoke: 1 review call, 0 live draft calls, no retries, prepared fictional D1. This call may be billable."
    : "Explicit live smoke: 1 draft call, 0 reviews, no retries, fictional D1. This call may be billable.");
  const cli = fileURLToPath(new URL("../node_modules/vitest/vitest.mjs", import.meta.url));
  const file = review ? "tests/live/review-smoke.live.ts" : "tests/live/draft-smoke.live.ts";
  const child = spawn(process.execPath, [cli, "run", "--config", "vitest.live.config.ts", file], { stdio: "inherit", env: process.env });
  child.on("error", () => { console.error("Live smoke runner could not start."); process.exitCode = 1; });
  child.on("exit", (code) => { process.exitCode = code ?? 1; });
}
