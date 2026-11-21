import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { POST } from "../../app/api/draft/route";
import { GET } from "../../app/api/health/route";
import { developmentCases } from "../../fixtures/development/cases";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
function request() {
  return new Request("http://localhost/api/draft", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId: crypto.randomUUID(), caseId: "D1", sourceRevision: 0, draftRevision: 0, input: developmentCases[0].input }) });
}
it.each(["live", undefined])("rejects Vercel mode %s before any provider fetch and shows a safe configuration error", async (mode) => {
  vi.stubEnv("VERCEL", "1"); vi.stubEnv("AI_MODE", mode); vi.stubEnv("ANTHROPIC_API_KEY", "test-only-deployment-secret");
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  const health = GET();
  expect(health.status).toBe(503);
  const response = await POST(request());
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("test-only-deployment-secret");
  expect(fetch).not.toHaveBeenCalled();
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
