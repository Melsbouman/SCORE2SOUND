// Sjablonen voor de herkenning, getekend uit het muzieklettertype Bravura (automatisering/maak-sjablonen.py maakt
// sjablonen.json). Hier worden ze geschaald naar de lijnafstand van een blad. Per sjabloon ook welke witte pixels binnen het
// teken liggen (het gat van een halve of hele noot) en welke erbuiten: die wegen anders bij het vergelijken.
import gegevens from './sjablonen.json' with { type: 'json' };

const cache = new Map();

// Witte pixels die niet via wit met de rand verbonden zijn, liggen binnen het teken (het gat van een halve noot).
function binnenkant(pixels, breedte, hoogte) {
  const buiten = new Uint8Array(breedte * hoogte);
  const stapel = [];
  for (let x = 0; x < breedte; x += 1) stapel.push(x, (hoogte - 1) * breedte + x);
  for (let y = 0; y < hoogte; y += 1) stapel.push(y * breedte, y * breedte + breedte - 1);
  while (stapel.length) {
    const i = stapel.pop();
    if (buiten[i] || pixels[i]) continue;
    buiten[i] = 1;
    const x = i % breedte;
    const y = (i - x) / breedte;
    if (x > 0) stapel.push(i - 1);
    if (x < breedte - 1) stapel.push(i + 1);
    if (y > 0) stapel.push(i - breedte);
    if (y < hoogte - 1) stapel.push(i + breedte);
  }
  const binnen = new Uint8Array(breedte * hoogte);
  for (let i = 0; i < binnen.length; i += 1) binnen[i] = !pixels[i] && !buiten[i] ? 1 : 0;
  return binnen;
}

// Een sjabloon op een lijnafstand: { breedte, hoogte, pixels (1 = zwart), binnen (1 = wit binnen het teken), ankerX, ankerY }.
export function sjabloon(naam, lijnafstand) {
  const sleutel = `${naam}@${lijnafstand.toFixed(2)}`;
  if (cache.has(sleutel)) return cache.get(sleutel);
  const bron = gegevens.sjablonen[naam];
  if (!bron) throw new Error(`Onbekend sjabloon: ${naam}`);
  const factor = lijnafstand / gegevens.lijnafstand;
  const bronBreedte = bron.rijen[0].length;
  const bronHoogte = bron.rijen.length;
  const breedte = Math.max(1, Math.round(bronBreedte * factor));
  const hoogte = Math.max(1, Math.round(bronHoogte * factor));
  const pixels = new Uint8Array(breedte * hoogte);
  for (let y = 0; y < hoogte; y += 1) {
    const by = Math.min(bronHoogte - 1, Math.floor((y + 0.5) / factor));
    for (let x = 0; x < breedte; x += 1) {
      const bx = Math.min(bronBreedte - 1, Math.floor((x + 0.5) / factor));
      pixels[y * breedte + x] = bron.rijen[by][bx] === '#' ? 1 : 0;
    }
  }
  const uit = {
    naam, breedte, hoogte, pixels, binnen: binnenkant(pixels, breedte, hoogte),
    ankerX: Math.round(bron.ankerX * factor), ankerY: Math.round(bron.ankerY * factor),
  };
  cache.set(sleutel, uit);
  return uit;
}

export const SJABLOONNAMEN = Object.keys(gegevens.sjablonen);
