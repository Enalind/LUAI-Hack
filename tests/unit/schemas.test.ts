import { describe, expect, it } from "vitest";
import {
  draftDocumentSchema, draftRequestSchema, evidenceRefSchema, explicitDecisionSchema,
  findingSchema, providerDraftOutputSchema, providerReviewOutputSchema, reviewDispositionSchema,
  reviewResultSchema, sourceInputSchema, sourceSnapshotSchema,
} from "../../lib/schemas";
import { emptySourceInput } from "../../lib/workspace-state";

const source = { ...emptySourceInput(), consultationText: "Patient: Jag har ont i nacken." };
const decision = source.explicitDecision;
const context = { requestId: "d3faee2b-b031-4c54-8bdc-d572a17d19b1", sourceRevision: 0, draftRevision: 2 };
const metadata = { mode: "mock", modelId: "test-provider", promptVersion: "test-v1", latencyMs: 0, usage: null };
const sections = ["3", "5", "6", "7"].map((fieldId) => ({ fieldId, claims: [], informationGaps: ["Underlag saknas."] }));
const questionFinding = {
  id: "missing-tasks", category: "work_tasks", actionType: "source_information_missing", priority: "clarification",
  targetClaimId: null, fieldId: "3", explanation: "Arbetsuppgifter saknas.", evidenceRefs: [], proposedChange: null,
  question: "Vilka arbetsuppgifter har patienten?",
};

describe("source and clinician-decision contracts", () => {
  it("preserves Swedish characters, line breaks and empty optional clinician fields", () => {
    const input = {
      ...source, consultationText: "  Återkommande smärta, ömhet och trötthet.\r\nFråga: Hur mår du?\n",
      explicitDecision: { ...decision, diagnosisText: "", diagnosisCode: "" },
    };
    expect(sourceInputSchema.parse(input)).toEqual(input);
  });

  it("allows an assessment without a consultation and does not require a leave decision", () => {
    expect(sourceInputSchema.parse({ ...source, consultationText: "", clinicianAssessmentText: "Osäker bedömning." }).explicitDecision).toEqual(decision);
  });

  it.each(["", "  \n\t\r\n"])("rejects absent narrative sources even when a decision exists (%j)", (text) => {
    expect(sourceInputSchema.safeParse({ ...source, consultationText: text, clinicianAssessmentText: text, explicitDecision: { ...decision, diagnosisText: "Nacksmärta" } }).success).toBe(false);
  });

  it("enforces each free-text limit and the aggregate source limit including decision text", () => {
    expect(sourceInputSchema.safeParse({ ...source, consultationText: "å".repeat(30_001) }).success).toBe(false);
    expect(sourceInputSchema.safeParse({ ...source, clinicianAssessmentText: "ö".repeat(30_001) }).success).toBe(false);
    const atLimit = { ...source, consultationText: "å".repeat(30_000), clinicianAssessmentText: "ö".repeat(30_000) };
    expect(sourceInputSchema.safeParse(atLimit).success).toBe(true);
    expect(sourceInputSchema.safeParse({ ...atLimit, explicitDecision: { ...decision, diagnosisCode: "X" } }).success).toBe(false);
    expect(explicitDecisionSchema.safeParse({ ...decision, diagnosisText: "x".repeat(30_001) }).success).toBe(false);
  });

  it.each(["2026-02-29", "2024-02-30", "2026-11-31", "2026-13-01", "0000-01-01", "2026-1-01", "2026-11-21T00:00:00Z", "invalid"])("rejects invalid calendar date %s", (startDate) => {
    expect(explicitDecisionSchema.safeParse({ ...decision, startDate }).success).toBe(false);
  });

  it("allows leap days, partial date decisions and equal start/end dates", () => {
    expect(explicitDecisionSchema.parse({ ...decision, startDate: "2024-02-29" }).endDate).toBeNull();
    expect(explicitDecisionSchema.safeParse({ ...decision, endDate: "2026-12-01" }).success).toBe(true);
    expect(explicitDecisionSchema.safeParse({ ...decision, startDate: "2026-12-01", endDate: "2026-12-01" }).success).toBe(true);
  });

  it("rejects reversed dates", () => {
    expect(explicitDecisionSchema.safeParse({ ...decision, startDate: "2026-12-02", endDate: "2026-12-01" }).success).toBe(false);
  });

  it.each([0, 20, 33, 60, 101, "50", true])("rejects invalid leave extent %j", (leaveExtent) => {
    expect(explicitDecisionSchema.safeParse({ ...decision, leaveExtent }).success).toBe(false);
  });

  it.each([null, 25, 50, 75, 100])("allows explicit leave extent %j without defaults", (leaveExtent) => {
    expect(explicitDecisionSchema.parse({ ...decision, leaveExtent }).leaveExtent).toBe(leaveExtent);
  });

  it("requires explicit nulls and rejects extra clinical-decision properties", () => {
    expect(explicitDecisionSchema.safeParse({}).success).toBe(false);
    expect(explicitDecisionSchema.safeParse({ ...decision, recommendation: "100%" }).success).toBe(false);
  });
});

describe("draft, review and revision contracts", () => {
  it("rejects mismatched revisions, malformed request IDs and negative revisions", () => {
    expect(draftRequestSchema.safeParse({ ...context, input: source, caseId: "D2" }).success).toBe(true);
    expect(draftRequestSchema.safeParse({ ...context, sourceRevision: 1, input: source, caseId: "D2" }).success).toBe(false);
    expect(draftRequestSchema.safeParse({ ...context, requestId: "anything", input: source, caseId: "D2" }).success).toBe(false);
    expect(draftRequestSchema.safeParse({ ...context, draftRevision: -1, input: source, caseId: "D2" }).success).toBe(false);
  });

  it("rejects missing/duplicate fields, duplicate claims across fields and misplaced claims", () => {
    const claim = { id: "duplicate", fieldId: "3", text: "Patienten uppger smärta.", evidenceRefs: [] };
    expect(providerDraftOutputSchema.safeParse({ sections: sections.slice(1), metadata }).success).toBe(false);
    expect(providerDraftOutputSchema.safeParse({ sections: [sections[0], sections[0], sections[2], sections[3]], metadata }).success).toBe(false);
    expect(providerDraftOutputSchema.safeParse({ sections: sections.map((section, i) => ({ ...section, claims: i < 2 ? [{ ...claim, fieldId: section.fieldId }] : [] })), metadata }).success).toBe(false);
    expect(providerDraftOutputSchema.safeParse({ sections: sections.map((section, i) => ({ ...section, claims: i === 1 ? [claim] : [] })), metadata }).success).toBe(false);
  });

  it("supports manual unverified claims and stale support as explicit states", () => {
    const parsed = draftDocumentSchema.parse({ sections: sections.map((section, i) => ({ ...section, claims: i === 0 ? [{ id: "manual", fieldId: "3", text: "Manuellt ändrad uppgift.", evidenceRefs: [], integrityStatus: "unverified", supportStatus: "stale" }] : [] })), explicitDecision: decision });
    expect(parsed.sections[0].claims[0].supportStatus).toBe("stale");
  });

  it("rejects empty/whitespace quotes without normalizing the supplied text", () => {
    expect(evidenceRefSchema.safeParse({ sourceId: "source-1", exactQuote: "" }).success).toBe(false);
    expect(evidenceRefSchema.safeParse({ sourceId: "source-1", exactQuote: " \n " }).success).toBe(false);
    expect(evidenceRefSchema.parse({ sourceId: "source-1", exactQuote: " å " }).exactQuote).toBe(" å ");
  });

  it("rejects duplicate source IDs", () => {
    const passage = { id: "source-1", origin: "consultation", text: "Patienten uppger nackvärk.", decisionField: null };
    expect(sourceSnapshotSchema.safeParse({ id: "snapshot", caseId: "D2", sourceRevision: 0, input: source, passages: [passage, passage] }).success).toBe(false);
  });

  it("allows source-missing questions with no evidence or suggestions and rejects invented completions", () => {
    expect(findingSchema.parse(questionFinding).evidenceRefs).toEqual([]);
    expect(findingSchema.safeParse({ ...questionFinding, question: null }).success).toBe(false);
    expect(findingSchema.safeParse({ ...questionFinding, proposedChange: { operation: "add", targetClaimId: null, text: "Arbetar som lärare.", evidenceRefs: [{ sourceId: "x", exactQuote: "x" }] } }).success).toBe(false);
    expect(findingSchema.safeParse({ ...questionFinding, actionType: "available_but_missing" }).success).toBe(false);
  });

  it("rejects duplicate finding IDs and mismatched change targets", () => {
    expect(providerReviewOutputSchema.safeParse({ metadata, findings: [questionFinding, questionFinding] }).success).toBe(false);
    expect(findingSchema.safeParse({ ...questionFinding, actionType: "unsupported_or_conflicting", targetClaimId: "first", proposedChange: { operation: "delete", targetClaimId: "second", text: null, evidenceRefs: [] } }).success).toBe(false);
  });

  it("distinguishes a completed empty review from a failed/incomplete check", () => {
    expect(reviewResultSchema.parse({ ...context, findings: [], completionStatus: "complete", metadata, error: null }).findings).toEqual([]);
    expect(reviewResultSchema.safeParse({ ...context, findings: [], completionStatus: "complete", metadata: null, error: null }).success).toBe(false);
    expect(reviewResultSchema.safeParse({ ...context, findings: [], completionStatus: "incomplete", metadata: null, error: null }).success).toBe(false);
    expect(reviewResultSchema.parse({ ...context, findings: [], completionStatus: "incomplete", metadata: null, error: { code: "REQUEST_TIMEOUT", requestId: context.requestId, retryable: true, message: "Granskningen avbröts." } }).completionStatus).toBe("incomplete");
  });

  it("scopes accepted/dismissed dispositions to both revisions", () => {
    expect(reviewDispositionSchema.parse({ findingId: "finding-1", status: "dismissed", clinicianNote: "Bedömt av läkaren.", sourceRevision: 1, draftRevision: 3 })).toMatchObject({ sourceRevision: 1, draftRevision: 3 });
    expect(reviewDispositionSchema.safeParse({ findingId: "finding-1", status: "verified", clinicianNote: null, sourceRevision: 1, draftRevision: 3 }).success).toBe(false);
  });
});
