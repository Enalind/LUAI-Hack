import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { deterministicReview, mergeReviewFindings } from "../../lib/review";
import { developmentCases } from "../../fixtures/development/cases";
import { MockProvider } from "../../lib/server/mock-provider";
import { createSourceSnapshot } from "../../lib/server/source-snapshot";
import { validateDraftOutput } from "../../lib/server/provider-output";

describe("deterministic review and deduplication", () => {
  it("does not classify an empty draft field as missing source information", async () => {
    const snapshot = createSourceSnapshot("D1", developmentCases[0].input);
    const { draft } = validateDraftOutput(snapshot, await new MockProvider().draft(snapshot));
    draft.sections[0].claims = [];
    expect(deterministicReview(snapshot, draft)[0]).toMatchObject({ category: "work_tasks", actionType: "unclear", proposedChange: null, question: expect.any(String) });
  });

  it("collapses exact duplicates but retains different problems within the same field/category", async () => {
    const snapshot = createSourceSnapshot("D2", developmentCases[1].input);
    const { draft } = validateDraftOutput(snapshot, await new MockProvider().draft(snapshot));
    const base = deterministicReview(snapshot, draft)[0];
    const other = { ...base, id: "other-problem", question: "Vilken arbetsställning krävs?", explanation: "Arbetsställningen behöver förtydligas." };
    const merged = mergeReviewFindings([], [base, { ...base, id: "duplicate" }, other], "test-request");
    expect(merged).toHaveLength(2);
    expect(new Set(merged.map(({ id }) => id)).size).toBe(2);
  });

  it("lets a specific model question replace generic emptiness while preserving integrity failures", async () => {
    const snapshot = createSourceSnapshot("D2", developmentCases[1].input);
    const { draft } = validateDraftOutput(snapshot, await new MockProvider().draft(snapshot));
    draft.sections[1].claims[0].evidenceRefs = [];
    const code = deterministicReview(snapshot, draft);
    const model = (await new MockProvider().review({ snapshot, draft })).findings;
    const merged = mergeReviewFindings(code, model, "request-1");
    expect(merged.some(({ explanation }) => explanation.startsWith("Intygsfältet saknar"))).toBe(false);
    expect(merged.some(({ explanation }) => explanation === "Påståendet saknar källhänvisning.")).toBe(true);
    expect(merged.filter(({ category, actionType }) => category === "work_tasks" && actionType === "source_information_missing")).toHaveLength(1);
  });
});
