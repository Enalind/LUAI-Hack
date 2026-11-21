# Fictional development fixtures

D1–D3 are entirely fictional Swedish development cases. `answer-keys.ts` contains independently written expected facts, forbidden inferences, findings and unchanged clinician decisions. The mock provider does not import these answer keys. The rubric is developer-authored and has not been clinically validated.

- D1 includes occupation, lifting demands, attributed patient symptoms, explicit clinician reasoning and planned treatment. Tests remove duties and reasoning from a copy of the draft to exercise source-supported additions.
- D2 deliberately omits occupation, tasks, assessment and decisions. Review should ask focused questions without supplying those facts.
- D3 distinguishes a patient's denial from an unanswered doctor's question. Tests corrupt the denial and add a false examination finding to check review contracts.

Mock output is a prepared demonstration. Its reviewer compares fixture templates, so it does not assess clinical meaning or reliably recognize paraphrases. Text changes to the fixture sources require a new prepared mock, and unsupported source combinations fail explicitly. Clinician decision changes and source revision changes are supported without changing the prepared narrative facts.

No held-out H1–H3 cases were authored or inspected during CP1. They remain reserved for the later live evaluation, with frozen prompts and separately written answer keys. Deterministic mock passes are not evidence of live model quality.
