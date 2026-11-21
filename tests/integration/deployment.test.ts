import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { POST } from "../../app/api/draft/route";
import { POST as review } from "../../app/api/review/route";
import { GET } from "../../app/api/health/route";
import { developmentCases } from "../../fixtures/development/cases";
import { FK_RULE_IDS } from "../../lib/fk-guidance";
import { draftResponseSchema, reviewResultSchema } from "../../lib/schemas";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
function request() {
  return new Request("http://localhost/api/draft", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId: crypto.randomUUID(), caseId: "D1", sourceRevision: 0, draftRevision: 0, input: developmentCases[0].input }) });
}
it.each([
  { mode: undefined, key: "test-only-deployment-secret" },
  { mode: "invalid", key: "test-only-deployment-secret" },
  { mode: "live", key: "" },
  { mode: "live", key: "  " },
])("rejects invalid Vercel configuration $mode / '$key' before any provider fetch", async ({ mode, key }) => {
  vi.stubEnv("VERCEL", "1"); vi.stubEnv("AI_MODE", mode); vi.stubEnv("ANTHROPIC_API_KEY", key);
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  const health = GET();
  expect(health.status).toBe(503);
  const response = await POST(request());
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("test-only-deployment-secret");
  expect(fetch).not.toHaveBeenCalled();
});
it("serves live Vercel health, drafting and review through the real provider factory with stubbed transport", async () => {
  vi.stubEnv("VERCEL", "1"); vi.stubEnv("AI_MODE", "live");
  vi.stubEnv("ANTHROPIC_API_KEY", "test-only-deployment-secret"); vi.stubEnv("ANTHROPIC_MODEL", "deployment-test-model");
  const response = (value: unknown) => Response.json({
    id: "msg_deployment", type: "message", role: "assistant", model: "deployment-test-model",
    content: [{ type: "text", text: JSON.stringify(value) }], stop_reason: "end_turn", stop_sequence: null,
    usage: { input_tokens: 20, output_tokens: 15 },
  });
  const fetch = vi.fn<typeof globalThis.fetch>()
    .mockImplementationOnce(async () => response({ sections: ["3", "5", "6", "7"].map((fieldId) => ({
      fieldId, claims: [], informationGaps: ["Vilka uppgifter behöver kompletteras?"],
    })) }))
    .mockImplementationOnce(async () => response({ findings: [], guidelineChecks: FK_RULE_IDS.map((ruleId) => ({
      ruleId, status: "no_issue_identified",
    })) }));
  vi.stubGlobal("fetch", fetch);
  const health = GET();
  expect(health.status).toBe(200);
  expect(await health.json()).toMatchObject({ status: "ok", mode: "live" });
  expect(fetch).not.toHaveBeenCalled();
  const draftResponse = await POST(request());
  expect(draftResponse.status).toBe(200);
  const draft = draftResponseSchema.parse(await draftResponse.json());
  expect(draft.metadata).toMatchObject({ mode: "live", modelId: "deployment-test-model" });
  const reviewResponse = await review(new Request("http://localhost/api/review", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      requestId: crypto.randomUUID(), sourceRevision: 0, draftRevision: 0,
      snapshot: draft.snapshot, draft: draft.draft, explicitDecision: draft.draft.explicitDecision,
    }),
  }));
  expect(reviewResponse.status).toBe(200);
  const reviewed = reviewResultSchema.parse(await reviewResponse.json());
  expect(reviewed).toMatchObject({ completionStatus: "complete", error: null, metadata: { mode: "live", modelId: "deployment-test-model" } });
  expect(fetch).toHaveBeenCalledTimes(2);
  for (const [url, init] of fetch.mock.calls) {
    expect(String(url)).toBe("https://api.anthropic.com/v1/messages");
    expect(new Headers(init?.headers).get("x-api-key")).toBe("test-only-deployment-secret");
    expect(JSON.parse(String(init?.body)).model).toBe("deployment-test-model");
  }
  expect(JSON.stringify({ draft, reviewed })).not.toContain("test-only-deployment-secret");
});
it("serves the explicit mock Vercel demo with no key or outbound requests", async () => {
  vi.stubEnv("VERCEL", "1"); vi.stubEnv("AI_MODE", "mock"); vi.stubEnv("ANTHROPIC_API_KEY", "");
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  expect(GET().status).toBe(200);
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect((await response.json()).metadata.mode).toBe("mock");
  expect(fetch).not.toHaveBeenCalled();
});
