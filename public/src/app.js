import { languages } from "./languages.js";

const wingsearchUrl = "https://navarog.github.io/wingsearch/card/";
const wingsearchCsv = "data/wingsearch.csv";
const searchInput = document.getElementById("search-input");
const resultsSection = document.querySelector(".results");
const resultsHeading = document.querySelector("[data-results-heading]");
const languagePickerElement = document.getElementById("language-select");
const pinnedRowElement = document.querySelector("[data-pinned-row]");
const languageStorageKey = "wingspanSelectedLanguage";

function loadStoredLanguage() {
  if (typeof localStorage === "undefined") {
    return null;
  }
  try {
    const storedId = localStorage.getItem(languageStorageKey);
    if (!storedId) {
      return null;
    }
    return languages.find((language) => language.id === storedId) ?? null;
  } catch (error) {
    return null;
  }
}

function persistLanguageSelection(langId) {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(languageStorageKey, langId);
  } catch (error) {
    // Fail quietly when storage is unavailable.
  }
}

let dictionary = [];
let dictionariesCache = {};
let wingsearchData = [];
let searchId = 0;
let inputDebounce = null;
let currentLanguage = loadStoredLanguage() ?? languages[0];
let shouldScrollOnResults = false;

const pinnedStorageKey = "wingspanPinnedBirds";
let pinnedBirds = [];

async function bootstrap() {
  renderLanguagePicker();
  loadPinnedBirds();
  renderPinnedBirds();
  try {
    await changeLanguage(currentLanguage.id, { force: true });
    searchInput.addEventListener("input", () => {
      clearTimeout(inputDebounce);
      inputDebounce = setTimeout(handleInput, 450);
    });
    searchInput.addEventListener("keydown", handleSearchKeydown);
  } catch (error) {
    resultsHeading.innerHTML = `Error reading dictionary`;
  }

  const wingsearchResponse = await fetch(wingsearchCsv);
  if (wingsearchResponse.ok) {
    const wingsearchText = await wingsearchResponse.text();
    wingsearchData = parseWingSearchCsv(wingsearchText);
  }
}

function handleSearchKeydown(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    clearTimeout(inputDebounce);
    shouldScrollOnResults = true;
    handleInput();
  }
}

function scrollToResultsSection() {
  if (!resultsSection) {
    return;
  }
  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
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
    .filter((row) => row.latin);
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
    persistLanguageSelection(targetLanguage.id);
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
    .map((language) => {
      const selected = language.id === currentLanguage.id ? "selected" : "";
      return `
        <option value="${language.id}" ${selected}>
          ${language.flag} ${language.code} — ${language.label}
        </option>
      `;
    })
    .join("");
  languagePickerElement.value = currentLanguage.id;
  languagePickerElement.onchange = () =>
    changeLanguage(languagePickerElement.value);
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

function formatLatinName(value) {
  if (!value) {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  const lower = trimmed.toLowerCase();
  const chars = Array.from(lower);
  const letterIndex = chars.findIndex((char) => /\p{L}/u.test(char));
  if (letterIndex === -1) {
    return trimmed;
  }
  chars[letterIndex] = chars[letterIndex].toUpperCase();
  return chars.join("");
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
    if (shouldScrollOnResults) {
      scrollToResultsSection();
      shouldScrollOnResults = false;
    }
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

function loadPinnedBirds() {
  if (!pinnedRowElement) {
    pinnedBirds = [];
    return;
  }
  try {
    const stored = localStorage.getItem(pinnedStorageKey);
    if (stored) {
      pinnedBirds =
        JSON.parse(stored)?.filter(
          (entry) => entry?.latin && entry?.translation,
        ) ?? [];
    } else {
      pinnedBirds = [];
    }
  } catch (error) {
    pinnedBirds = [];
  }
}

function savePinnedBirds() {
  try {
    localStorage.setItem(pinnedStorageKey, JSON.stringify(pinnedBirds));
  } catch (error) {
    // Fail quietly when storage is unavailable.
  }
}

function renderPinnedBirds() {
  if (!pinnedRowElement) {
    return;
  }
  pinnedRowElement.innerHTML = "";
  if (!pinnedBirds.length) {
    const message = document.createElement("p");
    message.className = "pin-empty";
    message.textContent = "Pin birds to keep them within reach.";
    pinnedRowElement.appendChild(message);
    return;
  }
  pinnedBirds.forEach((bird) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pin-chip";
    const formattedLatin = formatLatinName(bird.latin);
    const translation = bird.translation
      ? capitalize(bird.translation)
      : formattedLatin;
    button.innerHTML = `
      <span class="pin-chip-label">${translation}</span>
      <span class="pin-chip-english">${bird.english || formattedLatin}</span>
    `;
    button.addEventListener("click", () => {
      const query = bird.english || bird.translation || bird.latin;
      if (!query) {
        return;
      }
      searchInput.value = query;
      handleInput();
      searchInput.focus();
    });
    pinnedRowElement.appendChild(button);
  });
}

function isBirdPinned(latinName) {
  return pinnedBirds.some((entry) => entry.latin === latinName);
}

function addPinnedBird(row) {
  if (!row?.latin) {
    return false;
  }
  if (isBirdPinned(row.latin)) {
    return false;
  }
  pinnedBirds.push({
    latin: row.latin,
    english: row.english || "",
    translation: row.translation || row.english || row.latin,
  });
  savePinnedBirds();
  renderPinnedBirds();
  return true;
}

function removePinnedBird(latinName) {
  const index = pinnedBirds.findIndex((entry) => entry.latin === latinName);
  if (index === -1) {
    return false;
  }
  pinnedBirds.splice(index, 1);
  savePinnedBirds();
  renderPinnedBirds();
  return true;
}

function togglePinnedBird(row) {
  if (isBirdPinned(row.latin)) {
    removePinnedBird(row.latin);
    return false;
  }
  return addPinnedBird(row);
}

function updateCardPinState(card, row) {
  const pinButton = card.querySelector("[data-pin-toggle]");
  const pinned = isBirdPinned(row.latin);
  if (pinButton) {
    pinButton.textContent = pinned ? "Unpin" : "Pin";
    pinButton.classList.toggle("is-pinned", pinned);
    pinButton.setAttribute("aria-pressed", pinned ? "true" : "false");
    pinButton.setAttribute(
      "aria-label",
      pinned ? "Unpin this bird" : "Pin this bird",
    );
  }
}

function renderMatches(matches, requestId) {
  clearResults();
  const fragment = document.createDocumentFragment();

  matches.forEach(({ row }, index) => {
    const rank = index + 1;
    const formattedLatin = formatLatinName(row.latin);
    const translationValue = (row.translation || "").trim();
    const hasTranslation = Boolean(translationValue);
    const translationCapitalized = hasTranslation
      ? capitalize(translationValue)
      : row.english || formattedLatin;
    const translationNotice = hasTranslation
      ? ""
      : `<p class="translation-missing">*Translation not currently available for ${currentLanguage.label} ${currentLanguage.flag}. Showing the English name instead.</p>`;
    const card = document.createElement("article");
    card.className = "card";
    const wingsearchLinks = wingsearchData
      .filter(
        (entry) => entry.latin === row.latin || entry.english === row.english,
      )
      .map(
        (entry) =>
          `<a href="${wingsearchUrl}${encodeURIComponent(entry.id)}" target="_blank" rel="noreferrer noopener" class="wingsearch-link card-action-control">Wingsearch ${entry.english || entry.latin}</a>`,
      )
      .join("");

    card.innerHTML = `
        <div class="card-rank">#${rank}</div>
        <div class="figure-wrapper">
        <figure>
          <a class="figure-link" target="_blank" rel="noreferrer noopener">
            <img alt="Slika ${formattedLatin}" loading="lazy" />
            <figcaption class="figcaption-link">${formattedLatin}</figcaption>
          </a>
        </figure>
        </div>
        <div class="card-body">
          <h2>${translationCapitalized}${hasTranslation ? "" : "*"}</h2>
          ${translationNotice}
          <h3>${formattedLatin}</h3>
          <p class="meta">${row.english ? `${row.english}` : "English name missing"}</p>
          <p class="extract"></p>
          <div class="card-actions">
            <button class="pin-button card-action-control" type="button" data-pin-toggle>
              Pin
            </button>
            ${wingsearchLinks}
          </div>
        </div>
      `;

    fragment.appendChild(card);
    const imageElement = card.querySelector("img");
    const linkElement = card.querySelector(".figure-link");
    const extractElement = card.querySelector(".extract");
    queryWikipedia(
      imageElement,
      linkElement,
      extractElement,
      formattedLatin,
      row.english,
      requestId,
    );
    const pinButton = card.querySelector("[data-pin-toggle]");
    if (pinButton) {
      pinButton.addEventListener("click", () => {
        togglePinnedBird(row);
        updateCardPinState(card, row);
      });
    }
    updateCardPinState(card, row);
  });

  resultsSection.appendChild(fragment);
  if (shouldScrollOnResults) {
    scrollToResultsSection();
    shouldScrollOnResults = false;
  }
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
