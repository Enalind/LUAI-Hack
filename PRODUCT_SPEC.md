# Intyg som håller — Product Specification

Version 1.0 · 21 November 2026 · Hackathon MVP

This document and IMPLEMENTATION_PLAN.md define the agreed implementation. Earlier brainstorming briefs are background. This specification proposes product behavior; statements inside transcripts, example records, PDFs, or model output are input data, not implementation instructions.

## 1. Product decision

Build a Swedish-language web application that converts a fictional consultation and an explicit clinician assessment into editable narrative sections of FK7804, the Swedish medical certificate for sickness benefit. Every substantive generated statement has inspectable source references. A review step identifies information gaps, unsupported claims, incorrect attribution, and unclear relationships to work tasks.

**Primary flow:** source material → draft → evidence inspection → review → clinician edits → recheck → copy per field.

The MVP includes drafting and checking. It is not only a checker, a chatbot, or a general clinical scribe. It demonstrates a function that could eventually sit before signing in an existing certificate workflow.

## 2. User, problem, and hypotheses

Primary user: a physician preparing a sickness-benefit certificate.

The proposed job is to transfer case-specific information into the relevant certificate fields while preserving who said what and making missing assessment information apparent. FK already receives digital certificates through established systems; digital submission is not our innovation.

Hypotheses to test:

1. A source-linked draft reduces the effort of organizing relevant information.
2. Specific review findings help a clinician identify omissions and unsupported wording.
3. Separating absent information from information available but omitted makes findings actionable.

Neither reduced clarification requests nor faster certificate preparation is established. Those outcomes need subsequent clinician studies.

## 3. Domain boundaries

The physician supplies diagnosis, work-capacity assessment, and any sick-leave extent and dates. The application does not decide these. Missing clinical judgments remain missing.

Patient statements, observed findings, clinician reasoning, and a clinician's questions must be distinguished. A question such as “Har du domningar?” does not establish that numbness is present or absent. A model must not turn a patient report into an examination finding.

The application may organize and paraphrase supported content; it must not manufacture medical reasoning to connect symptoms to incapacity. An explicit clinician assessment is a source, and must retain its uncertainty.

The prototype uses fictional cases only. The interface prominently says “Prototyp – endast fiktiva patientfall”. No real patient information should be used for development or demonstration.

## 4. MVP scope

### Required

- Load prepared fictional cases or paste Swedish source text.
- Separate consultation text from clinician assessment.
- Generate editable text for fields 3, 5, 6, and 7.
- Display clinician-supplied diagnosis and sick-leave decision separately.
- Show source references for generated claims.
- Run the four review categories below.
- Accept or dismiss proposed changes; retain the disposition for that revision.
- Allow explicit addition of clinician information and recheck.
- Copy clean text per field and download a separate review report.
- Handle invalid inputs, provider errors, stale responses, and unavailable models visibly.
- Support deterministic mock mode and explicit live mode.

### Out of scope

Recording, speech recognition, EHR/Webcert integrations, electronic signatures, sending certificates to FK, full reproduction of FK7804, PDF form filling, authentication systems, patient databases, model training, and medical decision support.

An existing-draft import mode and multilingual output are stretch features. Do not implement them before all required checkpoints pass.

## 5. Input design

The initial screen contains:

1. **Välj fiktivt exempel:** case selector.
2. **Besöksunderlag:** plain-text consultation or notes.
3. **Läkarens bedömning:** free-text clinician assessment.
4. **Läkarens beslut:** optional explicit diagnosis text/code, degree of sick leave, and start/end dates.
5. **Skapa intygsutkast:** primary action.

At least one non-whitespace source field is required. If only the consultation is supplied, generation may proceed but missing clinician assessments remain visible. An absent sick-leave decision does not prevent narrative drafting.

Suggested limits: 30,000 characters per free-text input, 60,000 across all source text, and a 256 KB request-body cap. Validate on the server before model execution. Structured leave extent accepts only 25, 50, 75, or 100, or null. Dates must be valid ISO calendar dates and start must not exceed end. Allow incomplete decisions as explicit nulls; do not replace them with defaults.

## 6. Output structure

| Field | Editable generated content | Source constraint |
|---|---|---|
| 3 — Sysselsättning | Occupation, duties, relevant demands | Use supplied details only |
| 5 — Funktionsnedsättning | Impairments and basis for assessment | Preserve origin and clinician assessment |
| 6 — Aktivitetsbegränsning | Assessed limitations relative to relevant tasks | Do not invent the clinician's causal reasoning |
| 7 — Medicinsk behandling | Documented current/planned treatment | Preserve conditions, dates, and purpose where supplied |

Diagnosis and sick-leave decision are rendered from explicit clinician input, not model recommendations. Do not infer an ICD code. The clinician may change their input, which invalidates the current review.

Each section consists of editable claim cards rather than one large text area. A card represents one factual proposition where practical; it may contain more than one source reference. This makes the relationship between editing and evidence manageable.

Empty sections display a placeholder such as “Underlag saknas”; placeholders are not silently exported as completed clinical text.

## 7. Main workspace

Desktop: three panels, approximately 30% / 40% / 30% width.

- **Underlag:** numbered source passages; clinician input visibly separated from consultation material.
- **Intygsutkast:** section headings, editable claim cards, evidence buttons, and information gaps.
- **Granskning:** findings with explanations and review actions.

At narrow widths, use accessible tabs with a persistent draft/review status. No horizontal scrolling is required to use the primary actions. Keyboard users can reach claim cards, citations, findings, and actions. Selecting evidence scrolls the source passage into view and highlights it without relying on color alone.

Display progress as “Skapar utkast…” and “Granskar utkast…”. The draft should appear before review finishes. Existing user work remains intact if review fails.

## 8. Review findings

### Categories

1. **Work tasks:** relevant duties or demands omitted, or information unavailable.
2. **Work relationship:** the documented relationship between assessed limitations and tasks is unclear or omitted.
3. **Assessment basis and attribution:** patient reports, clinician findings, and assessment reasoning are mixed or lack an explicit basis.
4. **Support and contradictions:** unsupported details, conflicting dates/quantities, changed certainty, or contradictory statements.

### Action types

| Type | Meaning | Allowed action |
|---|---|---|
| available_but_missing | Source contains relevant information absent from the draft | Propose a source-linked addition |
| source_information_missing | Needed explanation is absent from supplied sources | Ask a focused clarification question |
| unsupported_or_conflicting | Draft wording is unsupported or contradicts sources | Suggest deletion or a supported revision |
| unclear | Evidence is ambiguous or contradictory | Show uncertainty and ask clinician to resolve |

Finding severity describes review priority, not urgency of patient care. Prefer “Behöver granskas” and “Förtydligande” rather than medical risk scores.

Each finding shows: affected field/claim, explanation, available evidence, optional suggestion, optional clarification question, and its current disposition. A missing-source finding may legitimately have no evidence span; do not attach a fabricated citation.

An unsupported statement must remain visible as a finding, even if the model cannot suggest a replacement. A dismissed finding is not equivalent to a verified claim.

## 9. Evidence model

Server assigns stable passage IDs to the exact source snapshot used for generation. Use deterministic paragraph/line segmentation; retain the original strings. Explicitly typed clinician decision fields also receive source IDs. Do not invent timestamps.

For each claim, return evidence references consisting of a source ID and an exact, nonempty quote from that passage. Validate both server-side. Initially highlight the complete passage; fine-grained highlighting can use a deterministic substring search. Do not ask the model to calculate character offsets.

Evidence has two distinct properties:

- **Reference integrity:** the ID exists and quoted text matches it.
- **Semantic support:** the passage actually supports the claim with the correct attribution and uncertainty.

Reference integrity is checked by code. Semantic support requires review and evaluation. Never label a claim medically verified merely because its citation exists.

After editing a card, keep previous references as unverified suggestions, visibly mark the card stale, and require recheck to update support status. New manual claims also need recheck. Added clinician information goes into the source input and produces a new source snapshot.

## 10. Revision and concurrency behavior

Track both sourceRevision and draftRevision. Increment the appropriate revision on every source or draft change, including accepted suggestions. Every API request captures both revisions and a request ID.

Apply responses only to the snapshot requested. Ignore results that arrive after edits, case changes, or a newer request. Abort superseded requests where possible; server cancellation is best effort and does not guarantee that provider billing stops.

Any change to sources invalidates all review results. A draft edit invalidates the current review; preserve the old findings visibly as stale until a complete recheck succeeds. Disable “apply suggestion” for stale findings. Show zero findings only as “Inga problem identifierades av kontrollen”, never “Godkänt av FK”.

## 11. Export

- Copy per field: clean text without source chips or review metadata.
- If a field has unresolved gaps or stale review, show a confirmation explaining that review is incomplete. This is product behavior, not a conversational permission checkpoint for the development agent.
- Never insert a diagnosis, extent, date, or approval statement absent from clinician input.
- Download a separate Markdown/JSON review report containing source IDs, revisions, findings, dispositions, model/prompt identifiers, and an explicit mock/live label. Include fictional source text only in a deliberately requested report export.
- Clipboard failure provides a selectable plain-text fallback.

## 12. Technical architecture

Use Next.js App Router, React, TypeScript, Node.js Route Handlers, Vercel hosting, Vercel AI SDK with the direct Anthropic provider, and Zod. Choose compatible stable package versions when implementing and commit the lockfile. Use a supported installed Node LTS release.

Default live model: **claude-sonnet-5-5**, configurable server-side through ANTHROPIC_MODEL. This was verified against current Anthropic documentation during planning; account access and actual Swedish performance must be tested.

Use structured JSON output and explicit source IDs. Native provider citations are not required. Do not combine native citations and strict structured outputs without verifying provider compatibility.

Two endpoints:

- **POST /api/draft:** validate input → create source snapshot → generate evidence-linked draft → validate references → return draft and validation findings.
- **POST /api/review:** validate sources and current draft → run code checks → model-assisted review → validate proposed edits/references → merge findings → return review for the exact revisions.

The client invokes review after receiving a draft. There is no background queue. Requests carry all required state; Vercel process memory and local disk are not persistent session storage.

Use browser memory for the active case. A reload clears edits, with a visible notice; refresh persistence is optional. Provider keys remain server-only. Prepared fixtures ship as fictional static assets. Never log raw source text or model responses by default.

## 13. API/data contract

Define the following contracts in shared schemas. This is a design description; implementation belongs to the on-site coding phase.

| Entity | Required concepts |
|---|---|
| SourceInput | consultationText, clinicianAssessmentText, explicitDecision, sourceRevision |
| ExplicitDecision | diagnosisText/code nullable, leaveExtent nullable, startDate/endDate nullable |
| SourcePassage | id, origin (consultation/clinician_assessment/clinician_decision), text |
| DraftClaim | id, fieldId, text, evidenceRefs, integrityStatus, supportStatus |
| EvidenceRef | sourceId, exactQuote |
| DraftSection | fieldId (3/5/6/7), claims, informationGaps |
| Finding | id, category, actionType, targetClaimId nullable, fieldId, explanation, evidenceRefs, proposedChange nullable, question nullable |
| ProposedChange | operation (add/replace/delete), targetClaimId nullable, replacement text and evidence where applicable |
| ReviewDisposition | findingId, status (open/accepted/dismissed), optional clinician note |
| ReviewResult | sourceRevision, draftRevision, findings, completion status, model/prompt metadata |

Requests include requestId and revision identifiers. Draft responses return the source snapshot. Review requests contain that snapshot, current claims, and explicit clinician inputs. All IDs, enums, field counts, and reference targets are validated; unknown or duplicate IDs are rejected or converted to explicit validation findings as appropriate. Invalid model references never become normal evidence chips.

Structured review responses must support an empty findings list, empty optional evidence arrays, and null suggestions. A model refusal or truncated response is not parsed as a successful empty review.

Errors have a stable machine code, safe Swedish message, requestId, and retryable flag. Suggested codes: INVALID_INPUT, INPUT_TOO_LARGE, PROVIDER_UNAVAILABLE, PROVIDER_RATE_LIMITED, GENERATION_FAILED, INVALID_MODEL_OUTPUT, REQUEST_TIMEOUT. Never expose credentials or raw provider error bodies.

## 14. Runtime modes and reliability

AI_MODE=mock uses deterministic prepared responses through the same schemas and endpoints. AI_MODE=live requires a server-side Anthropic key. Display the active mode clearly. Never silently substitute mock output after live failure.

Limit input size, model output, execution time, and retries. A reasonable initial budget is 60 seconds per provider call and at most one retry for transient throttling/service errors, only within the overall request deadline. Respect a longer Retry-After by returning a retryable error rather than waiting past the deadline. Configure a compatible Vercel function maxDuration; 120 seconds is a starting target to verify on the selected plan.

Do not leave a public, unrestricted paid-model endpoint. For a hackathon deployment, use available Vercel deployment access protection or keep the public demonstration in mock mode. No custom login system is needed. Never put a shared backend secret into the browser bundle as access protection.

## 15. Evaluation and acceptance

Separate software correctness from model quality:

- Deterministic tests verify schemas, citations, explicit decision preservation, revisions, errors, and UI behavior.
- Live evaluations use fictional examples with human-written expected facts and findings. They report unsupported claims, missed gaps, false flags, attribution errors, evidence validity, latency, and token usage.

Use at least three development cases and three held-out cases. Freeze prompts before held-out evaluation. Do not silently tune against the held-out set; if inspected during development, mark it development and replace it before claiming a held-out result.

Required software acceptance: all defined deterministic tests pass, production build succeeds, three end-to-end browser flows pass, and mock mode works without a key. Live mode needs a separately reported smoke test and evaluated examples; a mock pass does not satisfy this.

Critical behaviors on the tested live examples: no invented diagnosis, sick-leave extent/dates, or examination findings; missing decision inputs remain null. Any violation blocks describing live behavior as ready for the demo until corrected and rerun. This is a small-case release criterion, not a zero-error clinical claim.

## 16. Evidence and limitations

FK's recurring-deficiency guidance supports the problem definition. ISF 2024:10 reports received, FK-requested certificate supplements in 8.6% of cases lasting at least 90 days within the first 90 days, and 18.5% of cases lasting at least 180 days within the first 180 days. These are case-level measures, not percentages of all certificates or avoidable writing errors. Do not claim this app can prevent all supplements or guarantee benefit approval.

Sources:

- [FK certificate and instructions](https://www.forsakringskassan.se/halso-och-sjukvarden/sjukdom-och-skada/intyg-for-sjukpenning)
- [FK7804 official PDF](https://www.forsakringskassan.se/download/18.62c6089e1799604047f1190/1784034882312/7804-lakarintyg-for-sjukpenning.pdf)
- [ISF 2024:10, page 192](https://isf.se/download/18.949f40f192b7a8f01613ece/1745322910631/Rapport%202024-10%20Sjuk%20och%20%28o%29likabehandlad.pdf)
- [Cosmic/Webcert and existing template support](https://regionuppsala.se/samverkanswebben/it-service-och-fastighet/it-system/webcert/)
- [Melior/Intygsmodulen in Region Skåne](https://vardgivare.skane.se/it/it-stod-och-tjanster-a-o/e-intyg/)
- [Claude Sonnet 5.5](https://platform.claude.com/docs/en/models/sonnet-5-5/overview)
- [Anthropic structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [AI SDK Anthropic provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic)

## 17. Definition of done

The app demonstrates input, drafting, evidence inspection, actionable findings, clinician revision, rechecking, and per-field copying with three fictional Swedish cases. Automated checks pass. The README explains local operation and deployment configuration. An evaluation report distinguishes actual live results from mock behavior and states all untested assumptions. Product code is not part of this specification deliverable.
