import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { developmentCases } from "../../fixtures/development/cases";
import { loadFrozenCases, runEvaluation, type EvaluationCase } from "../../evals/run";
import { MockProvider } from "../../lib/server/mock-provider";
import type { CertificateProvider } from "../../lib/server/provider";
import { ApplicationError } from "../../lib/server/errors";
import { createSourceSnapshot } from "../../lib/server/source-snapshot";

// Synthetic runner cases reuse development data; no held-out model outputs are used for tuning.
const fixtures: EvaluationCase[] = developmentCases.map((fixture, index) => ({ id: `H${index + 1}` as EvaluationCase["id"],
  adequate: index === 0, label: "Synthetic runner test", input: structuredClone(fixture.input) }));
// MockProvider identifies consultation/assessment content, not the synthetic evaluation ID.
describe("bounded evaluation runner", () => {
  it("runs exactly one draft and one review per case, reporting refs and decisions", async () => {
    const provider = new MockProvider();
    const draft = vi.spyOn(provider, "draft"), review = vi.spyOn(provider, "review");
    const result = await runEvaluation(fixtures, provider);
    expect(draft).toHaveBeenCalledTimes(3); expect(review).toHaveBeenCalledTimes(3);
    expect(result.operationAttempts).toBe(6);
    expect(result.results.every((row) => row.draft.status === "PASSED" && row.review.status === "PASSED")).toBe(true);
    for (const row of result.results) if (row.draft.status === "PASSED") {
      expect(row.draft.exactReferences.correct).toBe(row.draft.exactReferences.total);
      expect(row.draft.decisionsPreserved).toBe(true);
      expect(Object.values(row.draft.decisionInvariantViolations)).toEqual([0, 0, 0, 0, 0]);
    }
  });

  it("retains failed cases without retrying or reviewing a failed draft", async () => {
    const provider = new MockProvider();
    const draft = vi.spyOn(provider, "draft").mockRejectedValueOnce(new ApplicationError("REQUEST_TIMEOUT", "Safe timeout", 504));
    const review = vi.spyOn(provider, "review");
    const result = await runEvaluation(fixtures, provider);
    expect(result.results).toHaveLength(3);
    expect(result.results[0]).toMatchObject({ draft: { status: "FAILED", code: "REQUEST_TIMEOUT", metadata: null }, review: { status: "NOT RUN" } });
    expect(draft).toHaveBeenCalledTimes(3); expect(review).toHaveBeenCalledTimes(2);
    expect(result.operationAttempts).toBe(5);
  });

  it("keeps draft evidence when review fails and masks unknown exception text", async () => {
    const provider = new MockProvider();
    vi.spyOn(provider, "review").mockRejectedValue(new Error("test-only-secret raw provider body"));
    const result = await runEvaluation(fixtures.slice(0, 1), provider);
    expect(result.results[0]).toMatchObject({ draft: { status: "PASSED" }, review: { status: "FAILED", code: "EVALUATION_FAILED", metadata: null } });
    expect(JSON.stringify(result)).not.toContain("test-only-secret");
  });

  it("does not count invalid citations as a successful draft", async () => {
    const provider = new MockProvider();
    const raw = await provider.draft(createSourceSnapshot("synthetic", fixtures[0].input));
    raw.sections[0].claims[0].evidenceRefs[0].exactQuote = "Foreign quote.";
    const invalid: CertificateProvider = { draft: vi.fn().mockResolvedValue(raw), review: vi.fn() };
    const result = await runEvaluation(fixtures.slice(0, 1), invalid);
    expect(result.results[0].draft.status).toBe("FAILED");
    expect(invalid.review).not.toHaveBeenCalled();
  });

  it.each([0, 4, 1.5, Number.NaN])("rejects unsafe case limit %s before I/O/model selection", async (limit) => {
    await expect(loadFrozenCases(limit, "/nonexistent")).rejects.toThrow("case limit");
  });

  it("refuses a changed frozen prompt before reading any fixture", async () => {
    const { mkdtemp, mkdir, writeFile, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const root = await mkdtemp(`${tmpdir()}/luai-eval-test-`);
    try {
      await mkdir(`${root}/evals`);
      await writeFile(`${root}/evals/prompt-freeze.json`, JSON.stringify({ promptFile: "prompt.txt", sha256: "wrong" }));
      await writeFile(`${root}/prompt.txt`, "Changed prompt");
      await expect(loadFrozenCases(1, root)).rejects.toThrow("Frozen prompts changed");
    } finally { await rm(root, { recursive: true }); }
  });
});
