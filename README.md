# Wingspan Bird Dictionary

A lightweight static site that helps you look up translation of bird names from Latin or English inputs while showing Wikipedia image and extract when available.

## Setup

1. Run `npm run install`.
2. Start the server with `npm run start` and open `http://localhost:4173` in your browser.

Search tolerates partial words and fuzzy matches.

## Fonts

- Fonts used: **Cardenio Modern** (Font by Nils Cordes, nilscordes.com) and **ThirstyRoughLt** via <a href="http://www.onlinewebfonts.com">Web Fonts</a>.

## Translation contribution

All translations live inside `public/data/wingspan-dict.csv`. The two leading columns must continue to be Latin (column 1) and English (column 2), which power the fuzzy search.

1. When adding support for a new language, append the translation values as a new column at the end of `wingspan-dict.csv` and register the locale inside `public/src/languages.js` with the column's **zero-based** index assigned to `translationIndex`. This keeps every language pointing to the shared dictionary while letting the parser pick the correct column.
2. If you are improving an existing language, fill any empty cells in the existing translation column instead of adding a separate CSV so that users see accurate translations without duplication.
3. Bundle both the updated CSV and the languages entry in the same pull request so the dropdown can immediately load the new or corrected locale.
