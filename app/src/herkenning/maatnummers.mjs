// Herkenning, maatnummer boven het begin van een regel (anker voor de maatnummering), in eigen code. Werkwijze:
// 1. Op het beeld zonder notenbalklijnen nemen we eenmaal de losse vormen (vormen.mjs) van het hele blad.
// 2. Per balk nemen we de vormen boven het begin van de balk: midden tussen een lijnafstand vóór balk.links en 6 lijnafstanden
//    erna, onderkant tussen stap -7 en stap -1 (stap 0 is de bovenste lijn, een stap is een halve lijnafstand), hoogte 1 tot
//    2,5 lijnafstanden. Een vorm binnen een kader of rondje (een repetitiecijfer) telt niet, en het kader zelf ook niet.
// 3. Vormen naast elkaar (opening hooguit 0,6 lijnafstand) vormen samen één getal (hoogstens drie cijfers); bij meer groepjes
//    nemen we het groepje dat het dichtst bij het begin van de balk ligt.
// 4. Elk cijfer vergelijken we met de sjablonen cijfer-0 tot cijfer-9; is de beste score minder dan 0,75, dan is er geen nummer.
// Uitkomst per balk: { nummer, links, rechts, boven, onder } of null.
import { vindVormen } from './vormen.mjs';
import { sjabloon, vergelijkVorm } from './sjablonen.mjs';

// Gaten in een vorm: wit binnen het kader dat niet met de rand verbonden is, minstens minGrootte pixels (zoals cijfers.mjs).
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

export function leesMaatnummers(kaal, raster, schaal) {
  const ia = schaal.lijnafstand;
  const { labels, vormen } = vindVormen(kaal, { minPixels: Math.max(2, Math.round(ia * ia * 0.04)) });
  const binnen = (a, b) => a !== b && a.links >= b.links && a.rechts <= b.rechts && a.boven >= b.boven && a.onder <= b.onder;
  // Vormen die in een andere vorm liggen of er een bevatten (kader of rondje met cijfer).
  const omkaderd = new Set();
  for (const a of vormen) {
    for (const b of vormen) {
      if (binnen(a, b)) { omkaderd.add(a); omkaderd.add(b); }
    }
  }
  return raster.balken.map((balk) => {
    const yOp = (stap, x) => balk.lijnen[0].a + balk.lijnen[0].b * x + (stap * ia) / 2;
    const kandidaten = vormen.filter((v) => {
      if (omkaderd.has(v)) return false;
      const midden = (v.links + v.rechts) / 2;
      const hoogte = (v.onder - v.boven + 1) / ia;
      return midden >= balk.links - ia && midden <= balk.links + 6 * ia
        && v.onder >= yOp(-7, midden) && v.onder <= yOp(-1, midden)
        && hoogte >= 1 && hoogte <= 2.5;
    }).sort((p, q) => p.links - q.links);
    const groepjes = [];
    for (const v of kandidaten) {
      const laatste = groepjes[groepjes.length - 1];
      if (laatste && v.links - laatste[laatste.length - 1].rechts - 1 <= ia * 0.6) laatste.push(v);
      else groepjes.push([v]);
    }
    let gekozen = null;
    for (const g of groepjes) {
      if (!gekozen || Math.abs(g[0].links - balk.links) < Math.abs(gekozen[0].links - balk.links)) gekozen = g;
    }
    if (!gekozen || gekozen.length > 3) return null;
    // Een getal dicht naast andere tekst of een noot (binnen een lijnafstand, op dezelfde hoogte) is geen maatnummer.
    const gLinks = gekozen[0].links;
    const gRechts = gekozen[gekozen.length - 1].rechts;
    const gBoven = Math.min(...gekozen.map((v) => v.boven));
    const gOnder = Math.max(...gekozen.map((v) => v.onder));
    const buur = vormen.some((v) => {
      if (gekozen.includes(v)) return false;
      const overlap = Math.min(v.onder, gOnder) - Math.max(v.boven, gBoven) + 1;
      if (overlap < 0.5 * Math.min(v.onder - v.boven + 1, gOnder - gBoven + 1)) return false;
      const opening = v.rechts < gLinks ? gLinks - v.rechts - 1 : v.links > gRechts ? v.links - gRechts - 1 : -1;
      return opening >= 0 && opening <= ia;
    });
    if (buur) return null;
    let tekst = '';
    for (const vorm of gekozen) {
      const isZwart = (x, y) => labels[y * kaal.breedte + x] === vorm.id;
      const gaten = gatenVan(isZwart, vorm, ia * ia * 0.1);
      let beste = -1;
      let cijfer = null;
      for (const n of BIJ_GATEN(gaten)) {
        const score = vergelijkVorm(isZwart, vorm, sjabloon('cijfer-' + n, ia));
        if (score > beste) { beste = score; cijfer = n; }
      }
      if (cijfer === null || beste < 0.75) return null;
      tekst += cijfer;
    }
    const laatste = gekozen[gekozen.length - 1];
    return {
      nummer: Number(tekst),
      links: gekozen[0].links,
      rechts: laatste.rechts,
      boven: Math.min(...gekozen.map((v) => v.boven)),
      onder: Math.max(...gekozen.map((v) => v.onder)),
    };
  });
}
