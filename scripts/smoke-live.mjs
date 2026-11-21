import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
if (!process.env.ANTHROPIC_API_KEY?.trim()) {
  console.error("NOT RUN: ANTHROPIC_API_KEY is unavailable in the server environment/local env files. 0 model calls.");
  process.exitCode = 2;
} else {
  console.info("Explicit live smoke: 1 draft call, 0 reviews, no retries, fictional D1. This call may be billable.");
  const cli = fileURLToPath(new URL("../node_modules/vitest/vitest.mjs", import.meta.url));
  const child = spawn(process.execPath, [cli, "run", "--config", "vitest.live.config.ts"], { stdio: "inherit", env: process.env });
  child.on("error", () => { console.error("Live smoke runner could not start."); process.exitCode = 1; });
  child.on("exit", (code) => { process.exitCode = code ?? 1; });
}
