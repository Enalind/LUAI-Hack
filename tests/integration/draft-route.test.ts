import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { POST } from "../../app/api/draft/route";
import { developmentCases } from "../../fixtures/development/cases";
import { apiErrorSchema, draftResponseSchema, MAX_REQUEST_BYTES } from "../../lib/schemas";
import { createDraftHandler } from "../../lib/server/draft-service";
import { MockProvider } from "../../lib/server/mock-provider";
import { LiveProvider } from "../../lib/server/live-provider";
import { ApplicationError } from "../../lib/server/errors";

const context = { requestId: "d3faee2b-b031-4c54-8bdc-d572a17d19b1", sourceRevision: 0, draftRevision: 4 };
const validBody = { ...context, caseId: "D1", input: developmentCases[0].input };
function request(body: unknown) {
  return new Request("http://localhost/api/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("POST /api/draft", () => {
  it.each(developmentCases)("returns the original source snapshot and structured mock draft for $id without a key", async (fixture) => {
    vi.stubEnv("AI_MODE", "mock");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const response = await POST(request({ ...context, caseId: fixture.id, input: fixture.input }));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = draftResponseSchema.parse(await response.json());
    expect(body).toMatchObject(context);
    expect(body.snapshot.caseId).toBe(fixture.id);
    expect(body.snapshot.input).toEqual(fixture.input);
    expect(body.draft.explicitDecision).toEqual(fixture.input.explicitDecision);
    expect(body.metadata.mode).toBe("mock");
  });

  it.each([
    {},
    { ...validBody, input: { ...validBody.input, consultationText: " ", clinicianAssessmentText: "\n" } },
    { ...validBody, input: { ...validBody.input, consultationText: "x".repeat(30_001) } },
    { ...validBody, input: { ...validBody.input, explicitDecision: { ...validBody.input.explicitDecision, leaveExtent: 60 } } },
    { ...validBody, input: { ...validBody.input, explicitDecision: { ...validBody.input.explicitDecision, startDate: "2026-02-30" } } },
    { ...validBody, sourceRevision: 1 },
  ])("rejects invalid input before even selecting a provider", async (body) => {
    const factory = vi.fn(() => new MockProvider());
    const response = await createDraftHandler(factory)(request(body));
    expect(response.status).toBe(400);
    expect(apiErrorSchema.parse(await response.json()).code).toBe("INVALID_INPUT");
    expect(factory).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON and an oversized request without calling a provider", async () => {
    const provider = new MockProvider();
    const draft = vi.spyOn(provider, "draft");
    const handler = createDraftHandler(() => provider);
    const malformed = new Request("http://localhost/api/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
    expect((await handler(malformed)).status).toBe(400);
    const oversized = new Request("http://localhost/api/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: " ".repeat(MAX_REQUEST_BYTES + 1) });
    const response = await handler(oversized);
    expect(response.status).toBe(413);
    expect(apiErrorSchema.parse(await response.json()).code).toBe("INPUT_TOO_LARGE");
    expect(draft).not.toHaveBeenCalled();
  });

  it("never falls back to mock in live mode, with or without a key", async () => {
    const draft = vi.spyOn(MockProvider.prototype, "draft");
    const live = vi.spyOn(LiveProvider.prototype, "draft").mockRejectedValue(new ApplicationError("PROVIDER_UNAVAILABLE", "Modelltjänsten är otillgänglig.", 503, true));
    vi.stubEnv("AI_MODE", "live");
    for (const key of ["", "test-only-secret"]) {
      vi.stubEnv("ANTHROPIC_API_KEY", key);
      const response = await POST(request(validBody));
      expect(response.status).toBe(503);
      const body = await response.json();
      expect(apiErrorSchema.parse(body).code).toBe("PROVIDER_UNAVAILABLE");
      expect(body.requestId).toBe(context.requestId);
      expect(JSON.stringify(body)).not.toContain("test-only-secret");
    }
    expect(draft).not.toHaveBeenCalled();
    expect(live).toHaveBeenCalledOnce();
  });

  it("masks unexpected provider errors and retains the request ID", async () => {
    const provider = new MockProvider();
    vi.spyOn(provider, "draft").mockRejectedValue(new Error("test-only-secret RAW PROVIDER BODY"));
    const response = await createDraftHandler(() => provider)(request(validBody));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(apiErrorSchema.parse(body)).toMatchObject({ requestId: context.requestId, code: "GENERATION_FAILED", retryable: true });
    expect(JSON.stringify(body)).not.toMatch(/test-only-secret|RAW PROVIDER BODY/);
  });

  it("returns a clear failure for source text that has no prepared mock", async () => {
    const handler = createDraftHandler(() => new MockProvider());
    const response = await handler(request({ ...validBody, input: { ...validBody.input, consultationText: "Annat fiktivt besöksunderlag." } }));
    expect(response.status).toBe(422);
    expect(apiErrorSchema.parse(await response.json())).toMatchObject({ code: "GENERATION_FAILED", retryable: false });
  });

  it("surfaces citation integrity findings and removes unusable references from returned claims", async () => {
    const provider = new MockProvider();
    const original = provider.draft.bind(provider);
    vi.spyOn(provider, "draft").mockImplementation(async (snapshot) => {
      const raw = await original(snapshot);
      raw.sections[0].claims[0].evidenceRefs[0].sourceId = "source-from-another-case";
      return raw;
    });
    const response = await createDraftHandler(() => provider)(request(validBody));
    expect(response.status).toBe(200);
    const body = draftResponseSchema.parse(await response.json());
    expect(body.validationFindings).toHaveLength(1);
    expect(body.draft.sections[0].claims[0]).toMatchObject({ integrityStatus: "invalid", evidenceRefs: [] });
  });
});
