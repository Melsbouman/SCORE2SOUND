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

// Gaten in een vorm: wit binnen het kader dat niet met de rand verbonden is, minstens minGrootte pixels (zoals in cijfers.mjs).
function gatenVan(isZwart, k, minGrootte) {
  const w = k.rechts - k.links + 3;
  const h = k.onder - k.boven + 3;
  const zwart = (x, y) => x > 0 && y > 0 && x < w - 1 && y < h - 1 && isZwart(k.links - 1 + x, k.boven - 1 + y);
  const gezien = new Uint8Array(w * h);
  const gaten = [];
  let eerste = true;
  for (let y0 = 0; y0 < h; y0 += 1) {
    for (let x0 = 0; x0 < w; x0 += 1) {
      if (gezien[y0 * w + x0] || zwart(x0, y0)) continue;
      const stapel = [x0, y0];
      let aantal = 0;
      let somY = 0;
      while (stapel.length) {
        const y = stapel.pop();
        const x = stapel.pop();
        if (x < 0 || y < 0 || x >= w || y >= h || gezien[y * w + x] || zwart(x, y)) continue;
        gezien[y * w + x] = 1;
        aantal += 1;
        somY += y;
        stapel.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
      }
      if (!eerste && aantal >= minGrootte) gaten.push((somY / aantal - 1) / (h - 2));
      eerste = false;
    }
  }
  return gaten;
}
const BIJ_GATEN = (gaten) => {
  if (gaten.length >= 2) return [8];
  if (gaten.length === 0) return [1, 2, 3, 5, 7];
  return gaten[0] < 0.4 ? [4, 9, 0] : gaten[0] > 0.6 ? [4, 6, 0] : [0, 4, 6, 9];
};

// Verdikt het zwart met r pixels (vierkant), zodat een rand met kleine onderbrekingen weer dicht is.
function sluit(beeld, r) {
  const { breedte, hoogte, pixels } = beeld;
  const tussen = new Uint8Array(breedte * hoogte);
  for (let y = 0; y < hoogte; y += 1) {
    for (let x = 0; x < breedte; x += 1) {
      if (pixels[y * breedte + x] !== 1) continue;
      for (let k = Math.max(0, x - r); k <= Math.min(breedte - 1, x + r); k += 1) tussen[y * breedte + k] = 1;
    }
  }
  const uit = new Uint8Array(breedte * hoogte);
  for (let x = 0; x < breedte; x += 1) {
    for (let y = 0; y < hoogte; y += 1) {
      if (tussen[y * breedte + x] !== 1) continue;
      for (let k = Math.max(0, y - r); k <= Math.min(hoogte - 1, y + r); k += 1) uit[k * breedte + x] = 1;
    }
  }
  return { breedte, hoogte, pixels: uit };
}

export function zoekRepetitiecijfers(kaal, raster, schaal) {
  const ia = schaal.lijnafstand;
  const minPixels = Math.max(2, Math.round(ia * ia * 0.04));
  const { labels, vormen } = vindVormen(kaal, { minPixels });
  const isVorm = (vorm) => (x, y) => labels[y * kaal.breedte + x] === vorm.id;
  // Kaders zoeken we op het beeld na een kleine sluiting, want een rondje op een scan is vaak niet helemaal dicht.
  const dicht = vindVormen(sluit(kaal, Math.max(1, Math.round(ia * 0.05))), { minPixels });
  const kaders = dicht.vormen;
  // Een vorm is deel van het kader als zijn pixels na de sluiting bij het kader horen (een stuk rand, geen cijfer).
  const isDeelVan = (c, v) => {
    for (let y = c.boven; y <= c.onder; y += 1) {
      for (let x = c.links; x <= c.rechts; x += 1) {
        if (labels[y * kaal.breedte + x] === c.id) return dicht.labels[y * kaal.breedte + x] === v.id;
      }
    }
    return false;
  };
  return raster.balken.map((balk) => {
    const yOp = (stap, x) => balk.lijnen[0].a + balk.lijnen[0].b * x + (stap * ia) / 2;
    const resultaat = [];
    for (const v of kaders) {
      const midden = (v.links + v.rechts) / 2;
      if (balk.links !== undefined && midden < balk.links) continue;
      if (balk.rechts !== undefined && midden > balk.rechts) continue;
      if (v.onder > yOp(-1, midden) || v.onder < yOp(-12, midden)) continue;
      const breedte = (v.rechts - v.links + 1) / ia;
      const hoogte = (v.onder - v.boven + 1) / ia;
      if (breedte < 1.5 || breedte > 4 || hoogte < 1.5 || hoogte > 4) continue;
      const isZwart = (x, y) => dicht.labels[y * kaal.breedte + x] === v.id;
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
      const cijfers = vormen.filter((c) => c.links > v.links && c.rechts < v.rechts && c.boven > v.boven && c.onder < v.onder && !isDeelVan(c, v))
        .sort((p, q) => p.links - q.links);
      let tekst = '';
      for (const c of cijfers) {
        const isC = isVorm(c);
        const gaten = gatenVan(isC, c, ia * ia * 0.015);
        let beste = -1;
        let cijfer = null;
        for (const n of BIJ_GATEN(gaten)) {
          const score = vergelijkVorm(isC, c, sjabloon('cijfer-' + n, ia));
          if (score > beste) { beste = score; cijfer = n; }
        }
        if (cijfer === null || beste < 0.85) { tekst = ''; break; }
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
