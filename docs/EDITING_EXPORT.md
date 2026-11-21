# Editing, revisions and export — CP5

The workspace keeps edits, snapshots, review history and dispositions in browser memory. Reloading clears them. There is no database, automatic save, certificate transmission or deployment.

## Accept and dismiss

Only a complete review matching the current source/draft revisions can be acted on. A pending generation, source refresh or review disables these actions. Finding IDs are server-assigned and review-request scoped. The reducer looks up the stored finding rather than accepting a caller-supplied proposal.

Acceptance rechecks proposal structure, field/claim ownership and exact source references at application time. Add creates one new claim in the specified field; replace changes only the target claim; delete removes only that claim. Explicit clinician decisions remain unchanged. Acceptance increments draftRevision, records the disposition against the original review request/revisions and makes that review stale. Recheck before acting on another old suggestion.

Dismissal records an optional clinician note against the same review scope. It changes neither text, revision numbers nor support status. Dismissed findings are still unresolved for copying purposes. A subsequent review gets new finding IDs and does not inherit an earlier dismissal. Accepted/dismissed records and completed/incomplete review responses remain in the report history until the case is switched or the page reloads.

## Add clinician facts and recheck

The supplement form appends explicit clinician input to the assessment source, scoped to an intended certificate field. Multiline input retains its wording with a clinician-supplement prefix on each line. This is source data, not an instruction to the provider. Diagnosis, code, leave extent and dates are still exclusively the separate clinician-entered decision values.

After any source/decision edit, **Granska** first calls `/api/sources`. This endpoint validates the same bounded request envelope as `/api/draft` and creates an immutable snapshot without importing or selecting a provider. The client preserves all manual claim text. Only an unchanged passage at the same origin/position (or same decision field) receives a remapped reference; changed passages keep their old, invalid references for explicit integrity review. All claim support becomes stale. The current clinician decisions are copied into the draft.

The client then requests one review of that draft and new snapshot. There is no draft generation, automatic retry or automatic acceptance. The existing **Ersätt med nytt utkast** action deliberately replaces edits. Edits/case changes cancel pending work and invalidate request IDs/revisions. A late source response cannot trigger a review even if its network request ignores cancellation.

The prepared mock supports original D1–D3 sources plus supplements entered through this form. It copies supplied text literally with clinician attribution and exact evidence. Its field-gap suppression is a demonstration convention, not medical judgment about completeness. Arbitrary rewritten sources still fail explicitly in mock mode. Live review retains the existing prompt and one-attempt behavior.

## Copy and report

Each field copies only its current nonblank claim texts, in order, separated by blank lines. Wording and whitespace within a claim are preserved. Placeholders, field titles, source chips, review labels and decision defaults are never inserted into copied clinical text.

Copy requires explicit in-app confirmation if review is missing, pending, stale or incomplete, source revisions differ, the field has gaps/findings (including dismissed findings), or evidence needs checking. Any workspace state change invalidates an open confirmation. Clipboard failure exposes a read-only textarea that selects its contents on focus. Clipboard completion from an earlier state cannot display a current-state success message.

The separate JSON report includes current field text/claims, explicit clinician decisions, source IDs and revisions, findings, dispositions, review history and mock/live/model/prompt metadata. It clearly reports incomplete/stale review. Original source inputs, passage text and exact quotes are excluded by default. The user must check **Inkludera fiktivt källunderlag och källcitat i rapporten** to include them, including older source snapshots and current unsnapshotted input. Current draft text, finding explanations and proposed text can themselves contain fictional clinical facts; the report is not an anonymization feature.

Report downloads are deliberate local exports. No provider key is available to these client components. The mock/browser tests exercise the workflow without real model calls; clinical and held-out evaluation remain CP6 work.
