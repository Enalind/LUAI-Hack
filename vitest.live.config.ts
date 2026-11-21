import { defineConfig } from "vitest/config";

// Explicit opt-in only. This file is never included by npm test.
export default defineConfig({
  test: { environment: "node", include: ["tests/live/**/*.live.ts"], testTimeout: 70_000, fileParallelism: false },
});
