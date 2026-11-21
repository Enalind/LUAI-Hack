import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { GET } from "../../app/api/diagnosis-codes/route";
import { lookupDiagnosisCode, searchDiagnosisCodes, validateDiagnosisCode } from "../../lib/server/diagnosis-codes";
import { createDraftHandler } from "../../lib/server/draft-service";
import { developmentCases } from "../../fixtures/development/cases";

describe("official ICD-10-SE lookup", () => {
  it("returns Swedish national extensions and canonicalizes dotted and undotted codes", () => {
    expect(lookupDiagnosisCode(" f438a ")).toMatchObject({ code: "F43.8A", title: "Utmattningssyndrom", selectable: true, notPrimary: false });
    expect(searchDiagnosisCodes("lumbago")).toEqual(expect.arrayContaining([expect.objectContaining({ code: "M54.5", title: "Lumbago" })]));
    expect(searchDiagnosisCodes("F43.8A")[0].code).toBe("F43.8A");
    expect(searchDiagnosisCodes("utmat" )[0].code).toBe("F43.8A");
  });
  it("rejects invented, unspecific and forbidden primary codes without altering the input", () => {
    for (const code of ["A99.99", "M54", "V01.0"]) expect(() => validateDiagnosisCode(code)).toThrow();
    expect(lookupDiagnosisCode("A99.99")).toBeNull();
    expect(() => validateDiagnosisCode("M54.5")).not.toThrow();
    expect(() => validateDiagnosisCode(null)).not.toThrow();
  });
  it("limits results and returns pinned source provenance", async () => {
    const response = GET(new Request("http://localhost/api/diagnosis-codes?q=M54&code=M545"));
    const body = await response.json();
    expect(body.results.length).toBeLessThanOrEqual(12);
    expect(body.match).toMatchObject({ code: "M54.5", title: "Lumbago" });
    expect(body.catalogue).toMatchObject({ system: "ICD-10-SE", version: "2026-01-01" });
    expect(body.catalogue.sourceUrl).toContain("ehalsomyndigheten.se");
    expect(GET(new Request(`http://localhost/api/diagnosis-codes?q=${"a".repeat(151)}`)).status).toBe(400);
    expect(searchDiagnosisCodes("")).toEqual([]);
  });
  it("prevents invalid codes from reaching the draft provider", async () => {
    const factory = vi.fn();
    const fixture = developmentCases[0];
    const response = await createDraftHandler(factory)(new Request("http://localhost/api/draft", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: crypto.randomUUID(), caseId: fixture.id, sourceRevision: 0, draftRevision: 0,
        input: { ...fixture.input, explicitDecision: { ...fixture.input.explicitDecision, diagnosisCode: "A99.99" } } }) }));
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("INVALID_INPUT");
    expect(factory).not.toHaveBeenCalled();
  });
});
