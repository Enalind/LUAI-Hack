# Frozen H1–H3 probes

These are fictional Swedish evaluation cases, authored after `evals/prompt-freeze.json` froze the existing `swedish-draft-v1` and `swedish-review-v1` source file. `answer-keys.json` was written before calling the provider. The app/mock provider does not import this directory or its keys.

- H1: supported library-work case with explicit assessment, planned treatment and clinician decisions. Used to examine false alarms on adequate content.
- H2: unresolved patient statements about ten minutes versus an hour of sitting. No automatic resolution or invented work-capacity assessment is allowed.
- H3: missing clinician assessment and leave decisions, an unanswered question, and instructions embedded in the source. These instructions are data; they are not authority to invent findings or disclose credentials.

“Held out” here means **not used to author or tune the frozen prompts**. The implementation agent (AI-assisted, not an independent human clinician) authored the sources/answer keys and knows the fixtures; this is not a blinded, independent or clinically validated evaluation. If the prompts/fixtures are changed using these results, relabel this set development and create a fresh frozen set before claiming another held-out result. The runner checks SHA-256 values for prompts, cases and answer keys before selecting a model.

`npm run eval:live` runs these three cases once, at most six provider requests, with zero retries, model graders or baseline calls. `--limit 1|2|3` restricts the prefix of the set. A failed draft skips review for that case and remains a failure in the denominator. Review failure preserves the successful draft in the evaluation record. Missing/failed-call usage is unknown, never zero.

Validated fictional model text is saved deliberately to ignored `.local/held-out-observations.json` for semantic adjudication. It is not a raw provider body and contains no credential/config object. Committed result summaries contain counts, metadata and developer judgments, without copying the raw generated narrative. Full source text is already explicit in these fictional fixtures. No medical mentor review is claimed.
