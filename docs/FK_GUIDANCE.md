# Försäkringskassan guidance layer

Application ruleset: **fk7804-2026-11-21.v1**, source manually checked **21 November 2026**.

Primary source: Försäkringskassan, [Intyg för sjukpenning](https://www.forsakringskassan.se/halso-och-sjukvarden/sjukdom-och-skada/intyg-for-sjukpenning). The registry in `lib/fk-guidance.ts` contains application-authored Swedish paraphrases and review instructions, with the exact source section for each rule. These are not verbatim excerpts or an official machine-readable FK ruleset. The source page's step-by-step FK7804 headings identify the field numbers; examples elsewhere on the page can use different numbering.

| Rule | Source section / scope |
| --- | --- |
| fk3-occupation | Field 3: current occupation/situation and the applicable basis of assessment; concrete tasks when employed |
| fk5-function | Field 5: individual functional impairment and documented severity |
| fk5-basis | Field 5 and the explanation of impairment/activity: basis of the doctor's assessment, attribution of patient history versus professional assessment |
| fk6-activity | Field 6: concrete activity limitations and their severity |
| fk6-work | Field 6, related to field 3: how the limitations affect work or other relevant occupation |
| fk7-treatment | Field 7: ongoing/planned measures, purpose and, where possible, timing and responsible unit |
| fk-dfa | FAQ about common reasons for supplementary information: coherent diagnosis–impairment–activity–work relationship |

## Runtime behavior

Both live system prompts unconditionally include the same pinned ruleset; no model tool call is needed to obtain it. Its instructions remain outside the untrusted source-data message. The existing clinician diagnosis is provided as read-only draft context for the DFA relationship. Leave extent/dates remain outside the draft context; all decisions are copied from the validated snapshot by application code. Diagnosis catalogue lookup is separate from this guidance.

The live draft model writes literal `textParts` with reference indices. Application code joins them and derives exact phrase anchors, so the model does not repeat a claim and separately copy its highlights. No text, quote or citation is repaired or fuzzy-matched. The public draft/claim contract remains unchanged.

Drafting must use documented facts and ask specific `informationGaps` questions when needed information is unavailable. Guidance never authorizes new clinical findings, severity gradings, causal links, diagnoses or treatment advice. Physical examination is not a universal prerequisite: the official instructions also permit history and other assessment material. Conditional treatment timing/responsibility is not converted into an absolute requirement. Non-employed patients are not automatically assessed against an invented job.

Live review must return one `guidelineChecks` status for each of the seven rules. `no_issue_identified` is limited wording, not a medical pass. `needs_review` and `not_assessable` require findings linked to the corresponding rule; unassessable rules need a concrete question without an automatic change. Each live finding requires allowlisted `guidelineRuleIds` applicable to its field. Existing short exact phrase targets are retained; absent information highlights the field heading.

Application code rejects missing/duplicate/unknown rule checks, rule/field mismatches, inconsistent statuses, missing questions for unassessable rules, and an absent/stale guidance version. Existing exact patient-source quotation/target checks remain independent: an FK rule is not a patient evidence source. Code-detected empty fields survive an empty model result and adjust the returned checklist to `needs_review`. Invalid provider output yields an explicitly incomplete review, preserving code findings and editable text. There are no automatic format retries or silent mock fallback.

Review hovers and findings display the linked rule's application summary and official source link. All labels, requirements and URLs are resolved from the registry, never supplied by the model. Metadata records `guidanceVersion` alongside model and prompt version; review history/report exports retain metadata, rule IDs and checks; the versioned registry resolves their source links. Prepared mock examples demonstrate these links but do not claim a model assessment or supply a completed rule checklist.

## Boundaries and maintenance

This covers narrative fields **3, 5, 6 and 7**, not the whole certificate, entitlement law, signature/submission requirements, full rehabilitation-chain adjudication or diagnosis-specific Socialstyrelsen insurance-medicine recommendations. Semantic adequacy and citation entailment are model judgments, not deterministic guarantees. Independent clinical validation is still required.

The source is pinned, not fetched live or automatically refreshed. To update: inspect the official source and form; revise paraphrases/applications and source sections; bump the ruleset version and verification date; bump affected prompt versions; update contract/negative tests; run lint/typecheck, deterministic and browser checks, and explicit opt-in live probes. Keep old versions recoverable in version control and record evaluation results against their actual prompt/guidance version. Historical held-out results do not validate this new ruleset.


## Verification — 21 November 2026

- 258 unit/integration tests, 39 Chromium browser flows, lint, typecheck, production build and whitespace checks passed. Desktop/mobile FK hovers were visually inspected.
- Live D1 draft: `swedish-draft-v5-fk-parts`, 22,015 ms, 7 claims, 15 references, 17 phrase spans, no alignment errors and unchanged clinician decisions. Reported usage: 17,396 input + 3,103 output = 20,499 tokens.
- Live review of a prepared D1 with a deliberately omitted work-duty claim: `swedish-review-v3-fk-guidance`, medium effort, 14,422 ms, 5 rule-linked findings, 4 phrase targets, complete seven-rule coverage and expected omission detected. Reported usage: 20,938 input + 2,078 output = 23,016 tokens.
- Four explicit live probes total, no automatic retries. The initial review with default effort timed out at 60 seconds; review now sets medium effort. The initial v4 draft returned an invalid phrase anchor; v5 replaced duplicate text/anchor generation with literal text-part assembly. Both failures remain recorded in ignored local reports, alongside the successful final probes.
- The first browser run had 38/39 passes because the new display test forged a live-mode response into a mock-mode workspace, which correctly rejected it. The test fixture was corrected; the final full run passed 39/39. Generated `.next-e2e` files are excluded from lint, and the editor uses a standard linked accessible description.

These are software/contract and one known-omission checks. Semantic adequacy, false-positive/missed-gap rates and clinical safety of the new guidance prompts have not been independently established. The frozen held-out cases were neither changed nor rerun.
