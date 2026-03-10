# Wingspan Dictionary HR

Jednostavna statička stranica koja ti pomaže pronaći hrvatska imena ptica na temelju latinskih ili
engleskih naziva.

## Upute

1. Pokreni `npm run install` da provjeriš je li `wingspan-dict.csv` na pravom mjestu (nema dodatnih ovisnosti).
2. Startaj server s `npm run start` i otvori `http://localhost:4173` u pregledniku.
3. Zamijeni sadržaj `public/assets/wingspan-dict.csv` svojim kompletni rječnikom; stranica će ga automatski učitati.

Pretraživanje je tolerantno na djelomične unose i manje razlike u pisanju, a pri prvom rezultatu pokušava prikazati
sliku s Wikipedije ako je dostupna.

## Footer i fontovi

- Stranica prikazuje statični podnožje s tekstom © 2026 mmatasic i navođenjem autora fontova izvezena iz
	`public/index.html`.
- Fontovi koji se koriste: **Cardenio Modern** (Font by Nils Cordes, nilscordes.com) i **ThirstyRoughLt** putem
	<a href="http://www.onlinewebfonts.com">Web Fonts</a>.

## Language picker

- The hero now exposes a language picker that renders the flag + ISO code for each entry defined in the
	`languages` array at the top of `public/app.js`.
- To add another dictionary, drop the new CSV into `public/assets`, register it in the array with its `csvUrl`,
	`translationIndex`, `code`, and `flag`, and the picker will automatically load that language and re-run the
	search logic without touching the rest of the app.
