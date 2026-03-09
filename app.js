const csvUrl = "assets/wingspan-dict.csv";
const searchInput = document.getElementById("search-input");
const resultsSection = document.querySelector(".results");
const resultsHeading = document.querySelector("[data-results-heading]");

let dictionary = [];
let searchId = 0;

async function bootstrap() {
  try {
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error("Failed to load dictionary");
    }
    const text = await response.text();
    dictionary = parseCsv(text);
    searchInput.addEventListener("input", handleInput);
  } catch (error) {
    resultsHeading.innerHTML = `<p>Problem s učitavanjem rječnika. Provjeri je li <strong>wingspan-dict.csv</strong> dostupan.</p>`;
  }
}

function parseCsv(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(1)
    .map((line) => {
      const [latin, english, croatian] = line.split(",").map((value) => value.trim());
      return { latin: latin || "", english: english || "", croatian: croatian || "" };
    })
    .filter((row) => row.latin && row.croatian);
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
      const englishDistance = row.english ? closestDistance(normalizedEnglish, normalizedQuery) : Infinity;
      const bestDistance = Math.min(latinDistance, englishDistance);
      const hasSubstring =
        normalizedLatin.includes(normalizedQuery) || normalizedEnglish.includes(normalizedQuery);
      const score = hasSubstring ? bestDistance * 0.5 : bestDistance;
      return { row, score };
    })
    .filter((candidate) => candidate.score <= scoreThreshold)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  if (!matches.length) {
    resultsHeading.innerHTML = `<p>Za "${query}" nema rezultata. Pokušaj s drugim zapisom.</p>`;
    clearResults();
    return;
  }

  resultsHeading.innerHTML = "Najbolja podudaranja";
  renderMatches(matches, currentSearchId);
}

function resetResults() {
  clearResults();
}

function clearResults() {
  resultsSection.querySelectorAll(".card").forEach((card) => card.remove());
}

function renderMatches(matches, requestId) {
  clearResults();
  const fragment = document.createDocumentFragment();

  matches.forEach(({ row }, index) => {
    const rank = index + 1;
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
          <h2>${row.croatian}</h2>
          <p class="meta">${row.english ? `Engleski: ${row.english}` : "Englesko ime nedostaje"}</p>
        </div>
      `;

    fragment.appendChild(card);
    const imageElement = card.querySelector("img");
    const linkElement = card.querySelector(".figure-link");
    attachImage(imageElement, linkElement, row.latin, row.english, requestId);
  });

  resultsSection.appendChild(fragment);
}

async function attachImage(imgElement, linkElement, title, titleEnglish, requestId) {
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
}

async function fetchBirdImage(title) {
  try {
    const endpoint = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const response = await fetch(endpoint);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    const thumbnail = data.thumbnail?.source || data.originalimage?.source || null;
    const page = data.content_urls?.desktop?.page || data.content_urls?.mobile?.page || null;
    return { thumbnail, page };
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
        matrix[row - 1][col - 1] + cost
      );
    }
  }

  return matrix[b.length][a.length];
}

bootstrap();
