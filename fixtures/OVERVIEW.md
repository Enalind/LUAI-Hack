# Fictional case material

The app's development examples are `development/D1.json`, `D2.json` and `D3.json`. `development/cases.ts` imports these same files for the selector and prepared mock. They now contain long, timestamped Swedish transcripts, two dated journal entries each and clinician-selected ICD-10-SE codes.

See [the development guide](development/README.md) for the scenarios, expected gaps and limitations. The JSON files contain `consultationText`, `clinicianAssessmentText`, `journalEntries` and `explicitDecision`; reference documents retain their title, type and exact text in source snapshots. They replace the earlier, disconnected JSON development pack and the short inline examples.

The `held-out/` directory contains the separate, frozen H1–H3 evaluation probes. They have not been expanded or changed in this update, preserving the recorded hashes and historical results. See [the evaluation guide](held-out/README.md).

All patient material is fictional. A correct code or matching source quote is not clinical validation.
