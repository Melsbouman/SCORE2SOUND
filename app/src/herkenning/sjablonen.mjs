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

// Hoe goed past een vorm op een sjabloon, beide op hetzelfde kader geschaald (lettertypen verschillen in de details, niet in de
// grote lijn). `isZwart(x, y)` zegt of een pixel van het blad bij de vorm hoort; `kader` is { links, rechts, boven, onder }.
// Dunne lijnen (een achtste rust) vallen na het schalen net naast elkaar; daarom telt een pixel als raak als de ander binnen
// één pixel ligt. De score is het gemiddelde van beide kanten: hoeveel van de vorm bij het sjabloon past, en hoeveel van het
// sjabloon bij de vorm.
export function vergelijkVorm(isZwart, kader, t, { streng = false } = {}) {
  const w = kader.rechts - kader.links + 1;
  const h = kader.onder - kader.boven + 1;
  if (w <= 0 || h <= 0) return 0;
  const v = new Uint8Array(w * h);
  const s = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    const ty = Math.min(t.hoogte - 1, Math.floor(((y + 0.5) * t.hoogte) / h));
    for (let x = 0; x < w; x += 1) {
      const tx = Math.min(t.breedte - 1, Math.floor(((x + 0.5) * t.breedte) / w));
      v[y * w + x] = isZwart(kader.links + x, kader.boven + y) ? 1 : 0;
      s[y * w + x] = t.pixels[ty * t.breedte + tx];
    }
  }
  // Streng: het deel van alle zwarte pixels (van vorm en sjabloon samen) dat in beide zwart is, zonder speling. Zo zijn
  // tekens die veel op elkaar lijken (een 3 en een 9) beter uit elkaar te houden.
  if (streng) {
    let beide = 0; let een = 0;
    for (let i = 0; i < w * h; i += 1) { if (v[i] && s[i]) beide += 1; if (v[i] || s[i]) een += 1; }
    return een ? beide / een : 0;
  }
  const dichtbij = (masker, x, y) => {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const px = x + dx;
        const py = y + dy;
        if (px >= 0 && px < w && py >= 0 && py < h && masker[py * w + px]) return true;
      }
    }
    return false;
  };
  let vormRaak = 0; let vormAlle = 0; let sjabloonRaak = 0; let sjabloonAlle = 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (v[y * w + x]) { vormAlle += 1; if (dichtbij(s, x, y)) vormRaak += 1; }
      if (s[y * w + x]) { sjabloonAlle += 1; if (dichtbij(v, x, y)) sjabloonRaak += 1; }
    }
  }
  return vormAlle && sjabloonAlle ? (vormRaak / vormAlle + sjabloonRaak / sjabloonAlle) / 2 : 0;
}
