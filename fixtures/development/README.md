# Fictional development examples

The three JSON files are the canonical source for the examples shown in the app. `cases.ts` validates them and maps their dated journal entries into typed reference material. All dialogue, notes and decisions are synthetic; the examples are not clinical records or clinically validated recommendations.

| Example | Transcript | Journal material | Clinician-selected code | Review focus |
| --- | --- | --- | --- | --- |
| D1 | 65 timestamped turns, about 1,400 words | Triage and current remote visit | M54.5 Lumbago; diagnosis explicitly preliminary | Specific lifting demands, corrected work-attempt date, untested adaptations, and assessment based on reported symptoms rather than a physical examination |
| D2 | 60 timestamped turns, about 1,300 words | Booking and incomplete telephone note | M54.2 Cervikalgi | A long symptom history still does not establish occupation, work capacity, examination findings, treatment plan or leave decisions |
| D3 | 58 timestamped turns, about 1,350 words | Historical examination and incomplete current contact | M54.2 Cervikalgi | Preserve a denial; distinguish self-rated pain from findings; do not turn an unanswered weakness question or an older normal status into a current finding |

The transcripts include normal conversational detail, uncertainty and clarification rather than repeated filler. Each case has two journal entries, documented chronology and an explicit code that exists in the bundled ICD-10-SE 2026 catalogue. D2 and D3 leave the leave percentage and period empty deliberately.

`answer-keys.ts` records expected facts, forbidden inferences and clinician decisions for the current development scenarios. It is developer-authored and has not been independently clinically validated. The prepared mock does not import these keys. It resolves citations by exact source content rather than fixed transcript line numbers, allowing natural dialogue and multiple supporting passages per statement. Relevant journal passages can also be cited. Mock review compares prepared wording and is not a semantic medical review.

Field-scoped clinician supplements are still copied literally, attributed and cited without generating a new draft. Arbitrary unprepared narratives are supported in live mode; mock mode returns an explicit error for combinations for which it has no prepared answer.

The frozen H1–H3 evaluation set is separate and unchanged. Earlier live evaluations used earlier example and prompt versions; no earlier result is claimed as validation of this longer development pack.
