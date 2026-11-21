import { z } from "zod";

export const MAX_TEXT_CHARACTERS = 30_000;
export const MAX_SOURCE_CHARACTERS = 60_000;
export const MAX_REQUEST_BYTES = 256 * 1024;
export const FIELD_IDS = ["3", "5", "6", "7"] as const;
export const DECISION_FIELDS = [
  "diagnosisText", "diagnosisCode", "leaveExtent", "startDate", "endDate",
] as const;

const idSchema = z.string().min(1).max(180).regex(/^[a-zA-Z0-9][a-zA-Z0-9_.:-]*$/);
const revisionSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const textSchema = z.string().max(MAX_TEXT_CHARACTERS);
const nonemptyTextSchema = textSchema.refine((text) => text.trim().length > 0, "Text får inte vara tom.");
export const fieldIdSchema = z.enum(FIELD_IDS);

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const dateSchema = z.string().refine(isCalendarDate, "Ange ett giltigt datum som ÅÅÅÅ-MM-DD.");
export const explicitDecisionSchema = z.strictObject({
  diagnosisText: textSchema.nullable(),
  diagnosisCode: textSchema.nullable(),
  leaveExtent: z.union([z.literal(25), z.literal(50), z.literal(75), z.literal(100)]).nullable(),
  startDate: dateSchema.nullable(),
  endDate: dateSchema.nullable(),
}).superRefine((decision, ctx) => {
  if (decision.startDate && decision.endDate && decision.startDate > decision.endDate) {
    ctx.addIssue({ code: "custom", path: ["endDate"], message: "Slutdatum får inte vara före startdatum." });
  }
});

export const sourceInputSchema = z.strictObject({
  consultationText: textSchema,
  clinicianAssessmentText: textSchema,
  explicitDecision: explicitDecisionSchema,
  sourceRevision: revisionSchema,
}).superRefine((input, ctx) => {
  if (!input.consultationText.trim() && !input.clinicianAssessmentText.trim()) {
    ctx.addIssue({ code: "custom", message: "Besöksunderlag eller läkarens bedömning måste innehålla text." });
  }
  const decisionText = DECISION_FIELDS.map((key) => input.explicitDecision[key])
    .filter((value): value is string => typeof value === "string").join("");
  if (input.consultationText.length + input.clinicianAssessmentText.length + decisionText.length > MAX_SOURCE_CHARACTERS) {
    ctx.addIssue({ code: "custom", message: "Underlaget får sammanlagt innehålla högst 60 000 tecken." });
  }
});

export const sourcePassageSchema = z.strictObject({
  id: idSchema,
  origin: z.enum(["consultation", "clinician_assessment", "clinician_decision"]),
  text: nonemptyTextSchema,
  decisionField: z.enum(DECISION_FIELDS).nullable(),
}).superRefine((passage, ctx) => {
  if ((passage.origin === "clinician_decision") !== (passage.decisionField !== null)) {
    ctx.addIssue({ code: "custom", message: "Beslutsfält och källtyp stämmer inte överens." });
  }
});

function checkUnique(values: string[], ctx: z.RefinementCtx, label: string) {
  if (new Set(values).size !== values.length) {
    ctx.addIssue({ code: "custom", message: `${label} måste vara unika.` });
  }
}

export const sourceSnapshotSchema = z.strictObject({
  id: idSchema,
  caseId: idSchema,
  sourceRevision: revisionSchema,
  input: sourceInputSchema,
  passages: z.array(sourcePassageSchema).min(1).max(60_005),
}).superRefine((snapshot, ctx) => {
  checkUnique(snapshot.passages.map(({ id }) => id), ctx, "Käll-ID:n");
  if (snapshot.sourceRevision !== snapshot.input.sourceRevision) {
    ctx.addIssue({ code: "custom", message: "Källrevisionerna stämmer inte överens." });
  }
});

export const evidenceRefSchema = z.strictObject({ sourceId: idSchema, exactQuote: nonemptyTextSchema });
const evidenceRefsSchema = z.array(evidenceRefSchema).max(20);
const informationGapsSchema = z.array(nonemptyTextSchema).max(20);

// Provider contracts deliberately contain no decision fields or verification statuses.
export const providerClaimSchema = z.strictObject({
  id: idSchema,
  fieldId: fieldIdSchema,
  text: nonemptyTextSchema,
  evidenceRefs: evidenceRefsSchema,
});
export const draftClaimSchema = providerClaimSchema.extend({
  integrityStatus: z.enum(["valid", "invalid", "missing", "unverified"]),
  supportStatus: z.enum(["unreviewed", "reviewed", "needs_review", "stale"]),
});
export const providerSectionSchema = z.strictObject({
  fieldId: fieldIdSchema,
  claims: z.array(providerClaimSchema).max(100),
  informationGaps: informationGapsSchema,
});
export const draftSectionSchema = providerSectionSchema.extend({ claims: z.array(draftClaimSchema).max(100) });

function checkSections(
  sections: { fieldId: string; claims: { id: string; fieldId: string }[] }[],
  ctx: z.RefinementCtx,
) {
  checkUnique(sections.map(({ fieldId }) => fieldId), ctx, "Intygsfält");
  checkUnique(sections.flatMap(({ claims }) => claims.map(({ id }) => id)), ctx, "Påstående-ID:n");
  sections.forEach((section, index) => {
    if (section.claims.some((claim) => claim.fieldId !== section.fieldId)) {
      ctx.addIssue({ code: "custom", path: [index, "claims"], message: "Påståendet tillhör fel intygsfält." });
    }
  });
}

const providerSectionsSchema = z.array(providerSectionSchema).length(4).superRefine(checkSections);
export const draftSectionsSchema = z.array(draftSectionSchema).length(4).superRefine(checkSections);
export const draftDocumentSchema = z.strictObject({
  sections: draftSectionsSchema,
  explicitDecision: explicitDecisionSchema,
});

const replacementShape = { text: nonemptyTextSchema, evidenceRefs: evidenceRefsSchema.min(1) };
export const proposedChangeSchema = z.discriminatedUnion("operation", [
  z.strictObject({ operation: z.literal("add"), targetClaimId: z.null(), ...replacementShape }),
  z.strictObject({ operation: z.literal("replace"), targetClaimId: idSchema, ...replacementShape }),
  z.strictObject({ operation: z.literal("delete"), targetClaimId: idSchema, text: z.null(), evidenceRefs: evidenceRefsSchema }),
]);

export const findingSchema = z.strictObject({
  id: idSchema,
  category: z.enum(["work_tasks", "work_relationship", "assessment_basis", "support_and_contradictions"]),
  actionType: z.enum(["available_but_missing", "source_information_missing", "unsupported_or_conflicting", "unclear"]),
  priority: z.enum(["needs_review", "clarification"]),
  targetClaimId: idSchema.nullable(),
  fieldId: fieldIdSchema,
  explanation: nonemptyTextSchema,
  evidenceRefs: evidenceRefsSchema,
  proposedChange: proposedChangeSchema.nullable(),
  question: nonemptyTextSchema.nullable(),
}).superRefine((finding, ctx) => {
  const change = finding.proposedChange;
  if (change && change.targetClaimId !== finding.targetClaimId) {
    ctx.addIssue({ code: "custom", message: "Förslag och fynd måste avse samma påstående." });
  }
  if (finding.actionType === "available_but_missing" && change?.operation !== "add") {
    ctx.addIssue({ code: "custom", message: "Utelämnad källinformation kräver ett källanknutet tillägg." });
  }
  if (change?.operation === "add" && finding.actionType !== "available_but_missing") {
    ctx.addIssue({ code: "custom", message: "Tillägg kräver information som finns i källan men saknas i utkastet." });
  }
  if (finding.actionType === "source_information_missing" || finding.actionType === "unclear") {
    if (change !== null || finding.question === null) {
      ctx.addIssue({ code: "custom", message: "Saknad eller oklar information kräver en fråga utan automatiskt ändringsförslag." });
    }
  }
});

const findingsSchema = z.array(findingSchema).max(1_000).superRefine((findings, ctx) => {
  checkUnique(findings.map(({ id }) => id), ctx, "Fynd-ID:n");
});
export const providerMetadataSchema = z.strictObject({
  mode: z.enum(["mock", "live"]),
  modelId: z.string().min(1).max(200),
  promptVersion: z.string().min(1).max(100),
  latencyMs: z.number().nonnegative(),
  usage: z.strictObject({
    inputTokens: z.number().int().nonnegative().nullable(),
    outputTokens: z.number().int().nonnegative().nullable(),
    reasoningTokens: z.number().int().nonnegative().nullable(),
    totalTokens: z.number().int().nonnegative().nullable(),
  }).nullable(),
});
export const providerDraftOutputSchema = z.strictObject({ sections: providerSectionsSchema, metadata: providerMetadataSchema });
export const providerReviewOutputSchema = z.strictObject({ findings: findingsSchema.max(200), metadata: providerMetadataSchema });

export const requestContextSchema = z.strictObject({
  requestId: z.string().uuid(), sourceRevision: revisionSchema, draftRevision: revisionSchema,
});
export const draftRequestSchema = requestContextSchema.extend({ caseId: idSchema, input: sourceInputSchema })
  .superRefine((request, ctx) => {
    if (request.sourceRevision !== request.input.sourceRevision) {
      ctx.addIssue({ code: "custom", message: "Källrevisionerna stämmer inte överens." });
    }
  });

export function decisionsEqual(left: ExplicitDecision, right: ExplicitDecision): boolean {
  return DECISION_FIELDS.every((key) => left[key] === right[key]);
}

export const reviewRequestSchema = requestContextSchema.extend({
  snapshot: sourceSnapshotSchema,
  draft: draftDocumentSchema,
  explicitDecision: explicitDecisionSchema,
}).superRefine((request, ctx) => {
  if (request.sourceRevision !== request.snapshot.sourceRevision) {
    ctx.addIssue({ code: "custom", message: "Källrevisionerna stämmer inte överens." });
  }
  if (!decisionsEqual(request.explicitDecision, request.snapshot.input.explicitDecision)
    || !decisionsEqual(request.draft.explicitDecision, request.explicitDecision)) {
    ctx.addIssue({ code: "custom", message: "Läkarens beslut måste motsvara källversionen." });
  }
});

export const apiErrorSchema = z.strictObject({
  code: z.enum(["INVALID_INPUT", "INPUT_TOO_LARGE", "PROVIDER_UNAVAILABLE", "PROVIDER_RATE_LIMITED", "GENERATION_FAILED", "INVALID_MODEL_OUTPUT", "REQUEST_TIMEOUT"]),
  message: nonemptyTextSchema,
  requestId: z.string().uuid(),
  retryable: z.boolean(),
});
export const reviewDispositionSchema = z.strictObject({
  findingId: idSchema,
  status: z.enum(["open", "accepted", "dismissed"]),
  clinicianNote: textSchema.nullable(),
  sourceRevision: revisionSchema,
  draftRevision: revisionSchema,
});
export const scopedDispositionSchema = reviewDispositionSchema.extend({ reviewRequestId: z.string().uuid() });
export const sourceSnapshotResponseSchema = requestContextSchema.extend({ snapshot: sourceSnapshotSchema }).superRefine((result, ctx) => {
  if (result.sourceRevision !== result.snapshot.sourceRevision) {
    ctx.addIssue({ code: "custom", message: "Källrevisionerna stämmer inte överens." });
  }
});
export const reviewResultSchema = requestContextSchema.extend({
  findings: findingsSchema,
  completionStatus: z.enum(["complete", "incomplete"]),
  metadata: providerMetadataSchema.nullable(),
  error: apiErrorSchema.nullable(),
}).superRefine((result, ctx) => {
  if (result.completionStatus === "complete" && (!result.metadata || result.error)) {
    ctx.addIssue({ code: "custom", message: "En slutförd kontroll kräver metadata och får inte innehålla ett fel." });
  }
  if (result.completionStatus === "incomplete" && !result.error) {
    ctx.addIssue({ code: "custom", message: "En ofullständig kontroll måste innehålla ett fel." });
  }
  if (result.error && result.error.requestId !== result.requestId) {
    ctx.addIssue({ code: "custom", message: "Felet avser en annan förfrågan." });
  }
});
export const draftResponseSchema = requestContextSchema.extend({
  snapshot: sourceSnapshotSchema,
  draft: draftDocumentSchema,
  validationFindings: findingsSchema,
  metadata: providerMetadataSchema,
}).superRefine((result, ctx) => {
  if (result.sourceRevision !== result.snapshot.sourceRevision
    || !decisionsEqual(result.draft.explicitDecision, result.snapshot.input.explicitDecision)) {
    ctx.addIssue({ code: "custom", message: "Utkastet måste behålla källrevisionen och läkarens beslut." });
  }
});

type DeepReadonly<T> = T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;
export type FieldId = z.infer<typeof fieldIdSchema>;
export type ExplicitDecision = z.infer<typeof explicitDecisionSchema>;
export type SourceInput = z.infer<typeof sourceInputSchema>;
export type SourcePassage = z.infer<typeof sourcePassageSchema>;
export type SourceSnapshot = DeepReadonly<z.infer<typeof sourceSnapshotSchema>>;
export type EvidenceRef = z.infer<typeof evidenceRefSchema>;
export type DraftClaim = z.infer<typeof draftClaimSchema>;
export type DraftSection = z.infer<typeof draftSectionSchema>;
export type DraftDocument = z.infer<typeof draftDocumentSchema>;
export type Finding = z.infer<typeof findingSchema>;
export type ProposedChange = z.infer<typeof proposedChangeSchema>;
export type ReviewDisposition = z.infer<typeof reviewDispositionSchema>;
export type ScopedDisposition = z.infer<typeof scopedDispositionSchema>;
export type SourceSnapshotResponse = z.infer<typeof sourceSnapshotResponseSchema>;
export type ProviderDraftOutput = z.infer<typeof providerDraftOutputSchema>;
export type ProviderReviewOutput = z.infer<typeof providerReviewOutputSchema>;
export type ProviderMetadata = z.infer<typeof providerMetadataSchema>;
export type RequestContext = z.infer<typeof requestContextSchema>;
export type DraftRequest = z.infer<typeof draftRequestSchema>;
export type ReviewRequest = z.infer<typeof reviewRequestSchema>;
export type DraftResponse = z.infer<typeof draftResponseSchema>;
export type ReviewResult = z.infer<typeof reviewResultSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
