# Asteria UI identity

Implemented 21 November 2026 from the supplied `../asteria-brand-kit/`. The identity guide and clinical workspace concept informed the application styling; the functional source → draft → review → edit → recheck → copy flow remains intact.

## Assets and tokens

- `public/brand/asteria-wordmark-forest.svg` is the supplied outlined primary wordmark, used directly in the header. The SVG is not recreated as text or altered. It renders at 174 px with its proportions and surrounding clear space preserved. Reversed wordmark and monogram variants are included alongside it.
- `app/icon.svg` and `public/favicon.ico` are the supplied favicon assets. The ICO is served directly from `public/` because Next's image decoder rejects its embedded PNG format; the SVG uses Next's file-based icon metadata convention.
- `public/fonts/` contains the supplied variable WOFF2 fonts and complete Manrope/Newsreader SIL Open Font License files. `next/font/local` self-hosts them, exposing interface/display variables on the root layout. No font service or external asset request is needed.
- `app/brand-tokens.css` transcribes the supplied palette, 8 px spacing unit, 6 px control corners and 8 px card corners. The original token JSON is retained at `public/brand/asteria.tokens.json`.

## UI application

Newsreader is used for the main headline and workspace panel headings; Manrope is used for editable clinical text, controls, labels and review findings. The Asteria master brand is paired with the task descriptor “Intygsstöd”. Page metadata and footer use the new name. Original research/planning documents retain their historical project title.

Forest anchors actions and headings; oat is the canvas, off-white the working surface, and stone the quiet source/status surface. Clay and olive are accents. Source buttons retain underlined, explicit source labels. Information gaps use amber text/background; unsupported/conflicting findings receive a red accent as well as their existing explanatory labels. No state is communicated solely by color. The prototype and mock/live labels remain visible.

Interactive controls have at least 44 px height where practical. Focus uses the identity's 2 px forest ring with a 2 px offset. Working text is 16 px with 1.5 line height; regular labels/help text are at least 14 px. Narrow screens retain keyboard-accessible workspace tabs and readable, single-column panels.

## Verification

After merging incoming fixture updates, all 203 deterministic tests passed and CP5 was pushed to `origin/main` at `bb6ac55` (CP5 commit `eda0d5e` plus the upstream fixture merge). The Asteria update passed lint, typecheck, all 27 existing mock Chromium workflow tests and a production build. Desktop/narrow source and finding screenshots were inspected. Browser verification used mock mode with an empty provider key; zero live model requests were made. No dependency or live prompt changes, deployment or certificate transmission occurred.
