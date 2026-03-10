# Wingspan Dictionary HR

A lightweight static site that helps you look up translation of bird names from Latin or English inputs while showing Wikipedia image and extract when available.

## Setup

1. Run `npm run install`.
2. Start the server with `npm run start` and open `http://localhost:4173` in your browser.

Search tolerates partial words and fuzzy matches.

## Fonts

- Fonts used: **Cardenio Modern** (Font by Nils Cordes, nilscordes.com) and **ThirstyRoughLt** via <a href="http://www.onlinewebfonts.com">Web Fonts</a>.

## Translation contribution

- To add another dictionary or translation:
  1. Drop the new CSV under `public/i18n` (e.g., `public/i18n/wingspan-dict-xx.csv`).
  2. Register the language in `public/i18n/languages.js` with the required properties (`id`, `label`, `nativeLabel`, `code`, `flag`, `csvUrl`, and `translationIndex`).
  3. The csv must in first and second column contain english and latin names (used for fuzzy search)
  3. Provide a translation column index that matches the CSV layout so the parser can pick the correct column.
  4. Submit the CSV and the languages file changes so the dropdown automatically loads the new locale.
