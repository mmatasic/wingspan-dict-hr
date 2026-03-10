const wingsearchUrl = "https://navarog.github.io/wingsearch/card/";
const wingsearchCsv = "assets/wingsearch.csv";
const searchInput = document.getElementById("search-input");
const resultsSection = document.querySelector(".results");
const resultsHeading = document.querySelector("[data-results-heading]");
const languagePickerElement = document.querySelector("[data-language-picker]");

const languages = [
  {
    id: "hr",
    label: "Croatian",
    nativeLabel: "Hrvatski",
    code: "HR",
    flag: "🇭🇷",
    csvUrl: "assets/i18n/wingspan-dict-hr.csv",
    translationIndex: 2,
  },
  {
    id: "pt",
    label: "Portugese",
    nativeLabel: "Português",
    code: "PT",
    flag: "🇵🇹",
    csvUrl: "assets/i18n/wingspan-dict-pt.csv",
    translationIndex: 2,
  },
  // Add new dictionary entries here with their CSV path and translation column index.
];

let dictionary = [];
let dictionariesCache = {};
let wingsearchData = [];
let searchId = 0;
let inputDebounce = null;
let currentLanguage = languages[0];

async function bootstrap() {
  renderLanguagePicker();
  try {
    await changeLanguage(currentLanguage.id, { force: true });
    searchInput.addEventListener("input", () => {
      clearTimeout(inputDebounce);
      inputDebounce = setTimeout(handleInput, 450);
    });
  } catch (error) {
    resultsHeading.innerHTML = `Error reading dictionary`;
  }

  const wingsearchResponse = await fetch(wingsearchCsv);
  if (wingsearchResponse.ok) {
    const wingsearchText = await wingsearchResponse.text();
    wingsearchData = parseWingSearchCsv(wingsearchText);
  }
}

function parseCsv(text, language) {
  const translationIndex =
    typeof language.translationIndex === "number"
      ? language.translationIndex
      : 2;
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(1)
    .map((line) => {
      const columns = line.split(",").map((value) => value.trim());
      const latin = columns[0] || "";
      const english = columns[1] || "";
      const translation = columns[translationIndex] || "";
      return {
        latin,
        english,
        translation,
      };
    })
    .filter((row) => row.latin && row.translation);
}

function parseWingSearchCsv(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(1)
    .map((line) => {
      const [id, english, latin] = line.split(",").map((value) => value.trim());
      return { id: id || "", english: english || "", latin: latin || "" };
    });
}

async function loadDictionary(language) {
  if (dictionariesCache[language.id]) {
    return dictionariesCache[language.id];
  }
  const response = await fetch(language.csvUrl);
  if (!response.ok) {
    throw new Error(`Failed to load ${language.label} dictionary`);
  }
  const text = await response.text();
  const parsed = parseCsv(text, language);
  dictionariesCache[language.id] = parsed;
  return parsed;
}

async function changeLanguage(langId, { force = false } = {}) {
  const targetLanguage = languages.find((language) => language.id === langId);
  if (!targetLanguage) {
    return;
  }
  if (!force && currentLanguage.id === targetLanguage.id) {
    renderLanguagePicker();
    return;
  }
  resultsHeading.innerHTML = `<p>Loading ${targetLanguage.label} dictionary...</p>`;
  clearResults();
  try {
    const rows = await loadDictionary(targetLanguage);
    dictionary = rows;
    currentLanguage = targetLanguage;
    renderLanguagePicker();
    searchInput.value = "";
    resetResults();
  } catch (error) {
    resultsHeading.innerHTML = `<p>Error loading ${targetLanguage.label} dictionary.</p>`;
  }
}

function renderLanguagePicker() {
  if (!languagePickerElement) {
    return;
  }
  languagePickerElement.innerHTML = languages
    .map(
      (language) => `
        <button
          type="button"
          class="language-option ${language.id === currentLanguage.id ? "is-active" : ""}"
          data-language="${language.id}"
          aria-label="${language.nativeLabel} dictionary"
        >
          <span class="language-flag" aria-hidden="true">${language.flag}</span>
          <span class="language-code">${language.code}</span>
        </button>
      `,
    )
    .join("");
  languagePickerElement.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () =>
      changeLanguage(button.dataset.language),
    );
  });
}

function renderEmptyState() {
  const translationLabel = currentLanguage?.label?.toLowerCase() ?? "local";
  resultsHeading.innerHTML = `<p>Enter a bird name to see the ${translationLabel} translation.</p>`;
}

function capitalize(value) {
  if (!value) {
    return "";
  }
  return (
    value
      .toLowerCase()
      //just first letter of first word
      .replace(/^\S/, (match) => match.toUpperCase())
  );
}

function handleInput() {
  const query = searchInput.value.trim();
  if (!query) {
    resetResults();
    return;
  }

  const normalizedQuery = query.toLowerCase();
  const scoreThreshold = Math.max(normalizedQuery.length, 5);
  const currentSearchId = ++searchId;

  const matches = dictionary
    .map((row) => {
      const normalizedLatin = row.latin.toLowerCase();
      const normalizedEnglish = row.english.toLowerCase();
      const latinDistance = closestDistance(normalizedLatin, normalizedQuery);
      const englishDistance = row.english
        ? closestDistance(normalizedEnglish, normalizedQuery)
        : Infinity;
      const bestDistance = Math.min(latinDistance, englishDistance);
      const hasSubstring =
        normalizedLatin.includes(normalizedQuery) ||
        normalizedEnglish.includes(normalizedQuery);
      const score = hasSubstring ? bestDistance * 0.5 : bestDistance;
      return { row, score };
    })
    .filter((candidate) => candidate.score <= scoreThreshold)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  if (!matches.length) {
    resultsHeading.innerHTML = `<p>No results found for "${query}". Try a different entry.</p>`;
    clearResults();
    return;
  }

  resultsHeading.innerHTML = "Best matches";
  renderMatches(matches, currentSearchId);
}

function resetResults() {
  clearResults();
  renderEmptyState();
}

function clearResults() {
  resultsSection.querySelectorAll(".card").forEach((card) => card.remove());
}

function renderMatches(matches, requestId) {
  clearResults();
  const fragment = document.createDocumentFragment();

  matches.forEach(({ row }, index) => {
    const rank = index + 1;
    const translationCapitalized = capitalize(row.translation);
    const card = document.createElement("article");
    card.className = "card";

    card.innerHTML = `
        <div class="card-rank">#${rank}</div>
        <figure>
          <a class="figure-link" target="_blank" rel="noreferrer noopener">
            <img alt="Slika ${row.latin}" loading="lazy" />
            <figcaption class="figcaption-link">${row.latin}</figcaption>
          </a>
        </figure>
        <div class="card-body">
          <h2>${translationCapitalized}</h2>
          <h3>${row.latin}</h3>
          <p class="meta">${row.english ? `${row.english}` : "English name missing"}</p>
          <p class="extract"><\p>
        </div>
          <!--add link to wingsearch if english or latin name matches-->
          ${wingsearchData
            .filter(
              (entry) =>
                entry.latin === row.latin || entry.english === row.english,
            )
            .map(
              (entry) =>
                `<a href="${wingsearchUrl}${encodeURIComponent(entry.id)}" target="_blank" rel="noreferrer noopener" class="wingsearch-link">Wingsearch ${entry.english} </a>`,
            )
            .join("<br>")}

      `;

    fragment.appendChild(card);
    const imageElement = card.querySelector("img");
    const linkElement = card.querySelector(".figure-link");
    const extractElement = card.querySelector(".extract");
    queryWikipedia(
      imageElement,
      linkElement,
      extractElement,
      row.latin,
      row.english,
      requestId,
    );
  });

  resultsSection.appendChild(fragment);
}

async function queryWikipedia(
  imgElement,
  linkElement,
  extractElement,
  title,
  titleEnglish,
  requestId,
) {
  let summary = await fetchBirdImage(title.toLowerCase());
  if (!summary) {
    summary = await fetchBirdImage(titleEnglish.toLowerCase());
  }
  if (requestId !== searchId) {
    return;
  }

  if (summary?.thumbnail) {
    imgElement.src = summary.thumbnail;
  } else {
    imgElement.closest("figure")?.classList.add("no-image");
  }

  if (summary?.page) {
    linkElement.href = summary.page;
  } else {
    linkElement.removeAttribute("href");
  }

  if (summary?.extract) {
    extractElement.textContent = summary.extract;
  } else {
    extractElement.textContent = "No summary available.";
  }
}

async function fetchBirdImage(title) {
  try {
    const endpoint = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const response = await fetch(endpoint);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    const thumbnail =
      data.thumbnail?.source || data.originalimage?.source || null;
    const page =
      data.content_urls?.desktop?.page ||
      data.content_urls?.mobile?.page ||
      null;
    const extract = data.extract || null;
    return { thumbnail, page, extract };
  } catch (error) {
    return null;
  }
}

function closestDistance(name, query) {
  const tokens = name.split(/[\s-]+/).filter(Boolean);
  if (!tokens.length) {
    return levenshtein(query, name);
  }
  const distances = tokens.map((token) => levenshtein(query, token));
  distances.push(levenshtein(query, name));
  return Math.min(...distances);
}

function levenshtein(a, b) {
  if (!a) return b.length;
  if (!b) return a.length;

  const matrix = Array.from({ length: b.length + 1 }, (_, row) => [row]);
  for (let col = 0; col <= a.length; col += 1) {
    matrix[0][col] = col;
  }

  for (let row = 1; row <= b.length; row += 1) {
    for (let col = 1; col <= a.length; col += 1) {
      const cost = a[col - 1] === b[row - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost,
      );
    }
  }

  return matrix[b.length][a.length];
}

bootstrap();
