// Herkenning, aantal maten boven meermaatsrusten (deel van de stap SYMBOLS bij Audiveris), in eigen code. Werkwijze:
// 1. Op het beeld zonder notenbalklijnen nemen we eenmaal de losse vormen (vormen.mjs) van het hele blad.
// 2. Per meermaatsrust (uit rusten.mjs) nemen we de vormen boven de balk: onderkant tussen stap -6 en stap 0,5, bovenkant niet
//    hoger dan stap -9, hoogte tussen 1,2 en 3 lijnafstanden, en het midden tussen de uiteinden van de rust.
// 3. Cijfers naast elkaar (opening hooguit 0,6 lijnafstand) vormen samen één getal; bij meer groepjes nemen we het groepje
//    dat het dichtst bij het midden van de rust ligt.
// 4. Per cijfer bepalen we de gaten (wit binnen het kader, niet met de rand verbonden) en vergelijken het alleen met de
//    sjablonen die bij die gaten passen; de beste telt als score minstens 0,75 is. Meer dan drie cijfers is geen aantal maten.
// Uitkomst per balk: [{ x, links, rechts, aantal }] in de volgorde van de meermaatsrusten, met aantal een getal of null.
import { vindVormen } from './vormen.mjs';
import { sjabloon, vergelijkVorm } from './sjablonen.mjs';

// Gaten in een vorm: wit binnen het kader dat niet met de rand verbonden is, minstens minGrootte pixels.
export function gatenVan(isZwart, k, minGrootte) {
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
export const BIJ_GATEN = (gaten) => {
  if (gaten.length >= 2) return [8];
  if (gaten.length === 0) return [1, 2, 3, 5, 7];
  return gaten[0] < 0.4 ? [4, 9, 0] : gaten[0] > 0.6 ? [4, 6, 0] : [0, 4, 6, 9];
};

export function leesMeermaatsAantallen(kaal, raster, schaal, rusten) {
  const ia = schaal.lijnafstand;
  const { labels, vormen } = vindVormen(kaal, { minPixels: Math.max(2, Math.round(ia * ia * 0.04)) });
  return raster.balken.map((balk, b) => {
    const yOp = (stap, x) => balk.lijnen[0].a + balk.lijnen[0].b * x + (stap * ia) / 2;
    return (rusten[b] || []).filter((rust) => rust.soort === 'meermaats').map((rust) => {
      const kandidaten = vormen.filter((v) => {
        const midden = (v.links + v.rechts) / 2;
        const hoogte = (v.onder - v.boven + 1) / ia;
        return v.onder <= yOp(0.5, midden) && v.onder >= yOp(-6, midden) && v.boven >= yOp(-9, midden)
          && hoogte >= 1.2 && hoogte <= 3 && midden >= rust.links && midden <= rust.rechts;
      }).sort((p, q) => p.links - q.links);
      // Groepjes van cijfers naast elkaar.
      const groepjes = [];
      for (const v of kandidaten) {
        const laatste = groepjes[groepjes.length - 1];
        if (laatste && v.links - laatste[laatste.length - 1].rechts - 1 <= ia * 0.6) laatste.push(v);
        else groepjes.push([v]);
      }
      const middenVan = (g) => (g[0].links + g[g.length - 1].rechts) / 2;
      let gekozen = null;
      for (const g of groepjes) {
        if (!gekozen || Math.abs(middenVan(g) - rust.x) < Math.abs(middenVan(gekozen) - rust.x)) gekozen = g;
      }
      let aantal = null;
      if (gekozen && gekozen.length <= 3) {
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
          if (cijfer === null || beste < 0.75) { tekst = ''; break; }
          tekst += cijfer;
        }
        if (tekst) aantal = Number(tekst);
      }
      return { x: rust.x, links: rust.links, rechts: rust.rechts, aantal };
    });
  });
}
