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

const CIJFERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

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
    let tekst = '';
    for (const vorm of gekozen) {
      const isZwart = (x, y) => labels[y * kaal.breedte + x] === vorm.id;
      let beste = -1;
      let cijfer = null;
      for (const n of CIJFERS) {
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
