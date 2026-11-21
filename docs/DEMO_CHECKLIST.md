# Local demo acceptance — CP6

Run `AI_MODE=mock npm run dev`; use fictional D1–D3. Vercel supports explicit mock or live mode; see [deployment settings](DEPLOYMENT.md) for live credentials and verification. The reproducible journeys below use mock mode. There is no deployment or certificate transmission.

## Reproducible journeys

1. **A — Useful addition:** D1 → generate → inspect a source → review a deliberately omitted lifting claim (browser test injects the omission) → accept → stale status → recheck → copy field 3. Copied text equals the visible claim text. Passed at desktop and 375 px widths.
2. **B — Genuine gap:** D2 → generate/review → missing work/assessment stays absent → enter explicit clinician facts through the supplement form → update source/recheck while preserving manual draft wording → accept supported addition → recheck. The request count proves there is only one draft-generation request; source refresh is deterministic. Null clinician decisions remain null.
3. **C — Failure and recovery:** D3 → generate → injected review timeout → text retained → explicit retry succeeds → delay a later review → edit while pending → old response cannot overwrite the edit or appear current. Passed as one combined journey, with no production fault endpoint.

The omission/timeout/delay are Playwright route injections, not patient or model configuration switches. The normal D1 prepared draft is complete under its template and may return no findings; a mock pass is not clinical validation.

## Checklist verified on 21 November 2026

- [x] Prototype and explicit mock/live labels are visible.
- [x] All three fictional fixtures load locally; external datasets are not fetched.
- [x] Every generated source chip in D1–D3 focuses/highlights its exact immutable snapshot passage.
- [x] Patient statements, clinician assessment and clinician decisions are visually separated.
- [x] Missing source facts produce questions; no diagnosis or leave decision is silently filled.
- [x] Omitted available content can be proposed and accepted explicitly.
- [x] Manual changes survive failures, source refresh and stale responses.
- [x] Field copying has incomplete/stale confirmation and selectable fallback.
- [x] Refresh/case-switch behavior is explained; reload clears browser memory.
- [x] Keyboard skip link, panel tabs, source/claim focus and Enter acceptance pass; desktop/narrow screenshots inspected without horizontal overflow.
- [x] Mock mode works with an empty key, including a simulated Vercel production runtime.
- [x] Separate mock operation is available if the provider fails; there is no silent live-to-mock fallback.
- [x] Live latency/usage is recorded in the evaluation report; no speed, FK approval or clinical-effectiveness promise appears in the app.

All 29 browser acceptance tests passed. Independent human/clinical review is NOT RUN. The in-app preview host was unavailable during the earlier brand handoff; CP6 browser QA uses Playwright and inspected screenshots. A real Vercel deployment/account is not claimed inspected or provisioned.
