# Wingspan Bird Dictionary

A lightweight static site that helps you look up translation of bird names from Latin or English inputs while showing Wikipedia image and extract when available.

## Setup

1. Run `npm run install`.
2. Start the server with `npm run start` and open `http://localhost:4173` in your browser.

Search tolerates partial words and fuzzy matches.

## Fonts

- Fonts used: **Cardenio Modern** (Font by Nils Cordes, nilscordes.com) and **ThirstyRoughLt** via <a href="http://www.onlinewebfonts.com">Web Fonts</a>.

## Translation contribution

All translations live inside `public/data/wingspan-dict-xx.csv`, where each supported language or language group gets its own split dictionary. The first five columns (Scientific Name, en, species_code, macaulay_asset_code, wingspan_bird) must stay untouched so the parser can reuse the shared base entries and compute the correct column offset for every locale.

1. When adding support for a new language, create a new `wingspan-dict-xx.csv` (or extend an existing language group file), append the translation column(s) for that locale, and register the locale inside `public/src/languages.js` with the zero-based `translationIndex` that points to the column you just added. This keeps the parser pointed at the correct column inside the split dictionary.
2. If you are improving an existing language, edit the appropriate translation column inside its split CSV rather than introducing another CSV; keep the translation column aligned with the shared schema so the picker continues to load the correct values for that locale.
3. Bundle both the updated CSV and the languages entry in the same pull request so the dropdown can immediately load the new or corrected locale.
