# Wingspan Dictionary HR

Jednostavna statička stranica koja ti pomaže pronaći hrvatska imena ptica na temelju latinskih ili
engleskih naziva.

## Upute

1. Pokreni `npm run install` da provjeriš je li `wingspan-dict.csv` na pravom mjestu (nema dodatnih ovisnosti).
2. Startaj server s `npm run start` i otvori `http://localhost:4173` u pregledniku.
3. Zamijeni sadržaj `public/assets/wingspan-dict.csv` svojim kompletni rječnikom; stranica će ga automatski učitati.

Pretraživanje je tolerantno na djelomične unose i manje razlike u pisanju, a pri prvom rezultatu pokušava prikazati
sliku s Wikipedije ako je dostupna.
