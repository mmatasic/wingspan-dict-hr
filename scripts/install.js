import { existsSync } from "node:fs";
import path from "node:path";

const csvPath = path.resolve("public/assets/wingspan-dict.csv");

if (!existsSync(csvPath)) {
  console.warn("Datoteka wingspan-dict.csv nije pronađena u public/assets.");
  console.warn("Postavi svoj CSV tamo prije pokretanja servera.");
}

console.log("Nema dodatnih ovisnosti. Pokreni npm run start kad si spreman.");
