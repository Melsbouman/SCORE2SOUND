// Herkenning, repetitiecijfers (een getal in een vierkant of rondje boven de balk, anker voor de maatnummering), in eigen code.
// Werkwijze:
// 1. Op het beeld zonder notenbalklijnen nemen we eenmaal de losse vormen (vormen.mjs) van het hele blad.
// 2. Per balk nemen we de vormen boven de balk: onderkant tussen stap -12 en stap -1 (stap 0 is de bovenste lijn, een stap is een
//    halve lijnafstand) en het midden binnen de breedte van de balk.
// 3. Een kader is een vorm van 1,5 tot 4 lijnafstanden breed en hoog met een groot gat (wit binnen de vorm, niet met de rand
//    verbonden, minstens 40 procent van het kader). Zijn de vier hoeken van het kader zwart, dan is het een 'vierkant', anders
//    een 'cirkel'.
// 4. De vormen die helemaal binnen het gat liggen, zijn de cijfers: van links naar rechts, elk vergeleken met de sjablonen
//    cijfer-0 tot cijfer-9. Is een cijfer minder zeker dan 0,75 (of is er geen cijfer), dan is de waarde null.
// Uitkomst per balk: [{ x, links, rechts, boven, onder, kader: 'vierkant' | 'cirkel', waarde }] met x het midden en waarde een
// tekst zoals '12' of null.
import { vindVormen } from './vormen.mjs';
import { sjabloon, vergelijkVorm } from './sjablonen.mjs';

// Het aantal witte pixels binnen het kader van een vorm dat niet met de rand verbonden is.
function gatPixels(isZwart, k) {
  const w = k.rechts - k.links + 3;
  const h = k.onder - k.boven + 3;
  const zwart = (x, y) => x > 0 && y > 0 && x < w - 1 && y < h - 1 && isZwart(k.links - 1 + x, k.boven - 1 + y);
  const gezien = new Uint8Array(w * h);
  const stapel = [0, 0];
  let buiten = 0;
  while (stapel.length) {
    const y = stapel.pop();
    const x = stapel.pop();
    if (x < 0 || y < 0 || x >= w || y >= h || gezien[y * w + x] || zwart(x, y)) continue;
    gezien[y * w + x] = 1;
    buiten += 1;
    stapel.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }
  let zwartTotaal = 0;
  for (let y = 1; y < h - 1; y += 1) for (let x = 1; x < w - 1; x += 1) if (zwart(x, y)) zwartTotaal += 1;
  const binnen = (w - 2) * (h - 2);
  // Wit binnen het kader = kader min zwart min het witte deel dat met de rand verbonden is (buiten de rand van het kader).
  const buitenInKader = buiten - (w * h - binnen);
  return binnen - zwartTotaal - buitenInKader;
}

export function zoekRepetitiecijfers(kaal, raster, schaal) {
  const ia = schaal.lijnafstand;
  const { labels, vormen } = vindVormen(kaal, { minPixels: Math.max(2, Math.round(ia * ia * 0.04)) });
  const isVorm = (vorm) => (x, y) => labels[y * kaal.breedte + x] === vorm.id;
  return raster.balken.map((balk) => {
    const yOp = (stap, x) => balk.lijnen[0].a + balk.lijnen[0].b * x + (stap * ia) / 2;
    const resultaat = [];
    for (const v of vormen) {
      const midden = (v.links + v.rechts) / 2;
      if (balk.links !== undefined && midden < balk.links) continue;
      if (balk.rechts !== undefined && midden > balk.rechts) continue;
      if (v.onder > yOp(-1, midden) || v.onder < yOp(-12, midden)) continue;
      const breedte = (v.rechts - v.links + 1) / ia;
      const hoogte = (v.onder - v.boven + 1) / ia;
      if (breedte < 1.5 || breedte > 4 || hoogte < 1.5 || hoogte > 4) continue;
      const isZwart = isVorm(v);
      const gat = gatPixels(isZwart, v);
      if (gat < 0.4 * (v.rechts - v.links + 1) * (v.onder - v.boven + 1)) continue;
      // Hoeken: een zwarte pixel in het hoekvakje van 2 bij 2 pixels, in alle vier de hoeken.
      const hoek = (x0, y0, dx, dy) => {
        for (let j = 0; j < 2; j += 1) for (let i = 0; i < 2; i += 1) if (isZwart(x0 + dx * i, y0 + dy * j)) return true;
        return false;
      };
      const vierkant = hoek(v.links, v.boven, 1, 1) && hoek(v.rechts, v.boven, -1, 1)
        && hoek(v.links, v.onder, 1, -1) && hoek(v.rechts, v.onder, -1, -1);
      // Cijfers: vormen helemaal binnen het kader.
      const cijfers = vormen.filter((c) => c !== v && c.links > v.links && c.rechts < v.rechts && c.boven > v.boven && c.onder < v.onder)
        .sort((p, q) => p.links - q.links);
      let tekst = '';
      for (const c of cijfers) {
        const isC = isVorm(c);
        let beste = -1;
        let cijfer = null;
        for (let n = 0; n <= 9; n += 1) {
          const score = vergelijkVorm(isC, c, sjabloon('cijfer-' + n, ia));
          if (score > beste) { beste = score; cijfer = n; }
        }
        if (cijfer === null || beste < 0.75) { tekst = ''; break; }
        tekst += cijfer;
      }
      resultaat.push({
        x: midden, links: v.links, rechts: v.rechts, boven: v.boven, onder: v.onder,
        kader: vierkant ? 'vierkant' : 'cirkel', waarde: tekst || null,
      });
    }
    return resultaat.sort((p, q) => p.x - q.x);
  });
}
