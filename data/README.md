# ICD-10-SE 2026

`icd-10-se-2026.json` is a server-only search index imported from the official **Hela klassifikationen ICD-10-SE, giltig från 2026-01-01** TSV, published by Socialstyrelsen and distributed by E-hälsomyndigheten. It contains 38,631 individual code records, including national extensions. Chapters and code ranges are excluded. Source URL, release and file SHA-256 are recorded in the JSON.

Authority download page: https://samarbetsyta.ehalsomyndigheten.se/spaces/IR2/pages/451267009

Download the 2026 TSV from that page and run `python3 scripts/import-diagnosis-codes.py /path/to/icd-10-se.tsv` to reproduce the index. The 2027 catalogue is published in advance; it must not replace the active release before its effective date. Release upgrades require a new import and validation.

Search and exact lookup run locally on the server. Patient information is not sent to a coding website. The draft model has a bounded `search_diagnosis_codes` lookup tool; tool output is terminology data, never clinical evidence. Only the clinician selects the diagnosis and code. Draft and review endpoints reject unknown codes, unspecific category codes with children, and codes marked unsuitable as the primary diagnosis. Catalogue validity does not establish clinical appropriateness. This index supplies code titles and primary-code restrictions, not the complete coding instructions, inclusion and exclusion notes.
