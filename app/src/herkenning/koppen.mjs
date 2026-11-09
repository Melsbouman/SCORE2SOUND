// Herkenning, stap HEADS (naar het voorbeeld van Audiveris): nootkoppen zoeken met sjablonen uit een muzieklettertype, in
// eigen code. Werkwijze, in eigen woorden:
// 1. Op het beeld zonder notenbalklijnen (vormen.mjs) zoeken we per balk op elke lijn en tussenruimte, ook op de hulplijnen tot
//    vier lijnafstanden boven en onder de balk.
// 2. Een sjabloon (zwart, half of heel) vergelijken we op een plek met drie soorten pixels: de zwarte pixels van het teken
//    wegen 6, het gat binnenin (bij een halve of hele noot) 4, en een rand van wit eromheen 1. De score is het gewogen deel
//    dat klopt.
// 3. Alleen plekken waar het midden van de kop zwart is (zwarte kop) of de rand van de kop zwart is (halve of hele) proberen
//    we; dat scheelt veel rekenwerk.
// 4. Van treffers die elkaar overlappen houden we de beste.
// 5. Een blokje van een oude meermaatsrust (gevuld, smaller dan een kop, met rechte kanten op de tweede lijn en de middelste of
//    vierde lijn; rusten.mjs) lijkt op een zwarte kop, maar is er geen.
// Uitkomst per balk: [{ x, y, stap, soort, score }], met x en y het midden van de kop in pixels en stap de plek op de balk
// (0 = bovenste lijn, 8 = onderste lijn, oneven = tussenruimte, negatief = erboven).
import { sjabloon } from './sjablonen.mjs';

const SOORTEN = [['zwart', 'kop-zwart'], ['half', 'kop-half'], ['heel', 'kop-heel']];

// Een tweede kans voor een halve kop: een sjabloon waarvan alleen de buitenrand van het zwart telt. Lettertypen verschillen in
// hoe dik de rand van een open kop is (Bravura heeft een dikke, schuine rand, veel gravures een dunne), en op een lichte scan is
// de rand dun. De binnenrand telt dan niet mee, zwart of wit, en ook pixels op een weggehaalde notenbalklijn niet (`open`, zie
// maakKopScore). Zo'n sjabloon past ook op het rondje van een mol of het vakje van een herstellingsteken; daarom moet het gewone
// sjabloon op die plek ook redelijk passen (GEWOON_DREMPEL). Bij een hele kop gaf de buitenrand alleen te veel valse koppen.
const GEWOON_DREMPEL = 0.7;
// Hoe dicht een open kop bij de drempel moet komen om ook een paar pixels hoger en lager te proberen.
const BIJNA = 0.12;
function alleenBuitenrand(t) {
  const { breedte: w, hoogte: h } = t;
  const buiten = (x, y) => x < 0 || y < 0 || x >= w || y >= h || (!t.pixels[y * w + x] && !t.binnen[y * w + x]);
  const pixels = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = y * w + x;
      if (t.pixels[i] && (buiten(x - 1, y) || buiten(x + 1, y) || buiten(x, y - 1) || buiten(x, y + 1))) pixels[i] = 1;
    }
  }
  return { ...t, pixels };
}

// De score van een kopsjabloon met zijn ankerpunt op (ax, ay): zwarte pixels van het teken wegen 6, het gat binnenin 4, een
// rand wit eromheen 1. Ook gebruikt door kop.mjs (is er vlak na een voorteken een noot?).
// Met het beeld vóór het weghalen van de notenbalklijnen (zw) tellen bij een sjabloon met `t.open` pixels op een weggehaalde
// lijn niet mee: daar weten we niet of de kop zwart was. Een open kop met een dunne rand tussen twee lijnen raakt met zijn
// boven- en onderrand de lijnen, en die rand is met de lijn weggehaald.
export function maakKopScore(kaal, lijnafstand, zw = null) {
  const { breedte, hoogte, pixels } = kaal;
  const zwart = (x, y) => x >= 0 && x < breedte && y >= 0 && y < hoogte && pixels[y * breedte + x] === 1;
  const opLijn = zw ? (x, y) => x >= 0 && x < breedte && y >= 0 && y < hoogte && zw.pixels[y * breedte + x] === 1 && pixels[y * breedte + x] !== 1 : () => false;
  const rand = Math.max(1, Math.round(lijnafstand * 0.15));
  return (t, ax, ay) => {
    const x0 = ax - t.ankerX;
    const y0 = ay - t.ankerY;
    let goed = 0;
    let totaal = 0;
    for (let y = -rand; y < t.hoogte + rand; y += 1) {
      for (let x = -rand; x < t.breedte + rand; x += 1) {
        const binnenSjabloon = x >= 0 && x < t.breedte && y >= 0 && y < t.hoogte;
        const i = y * t.breedte + x;
        let gewicht;
        let wilZwart;
        if (binnenSjabloon && t.pixels[i]) { gewicht = 6; wilZwart = true; } else if (binnenSjabloon && t.binnen[i]) { gewicht = 4; wilZwart = false; } else if (!binnenSjabloon) { gewicht = 1; wilZwart = false; } else continue;
        if (t.open && opLijn(x0 + x, y0 + y)) continue;
        totaal += gewicht;
        if (zwart(x0 + x, y0 + y) === wilZwart) goed += gewicht;
      }
    }
    return goed / totaal;
  };
}

export function zoekNootkoppen(kaal, raster, schaal, { drempel = 0.78, balkkoppen = null, zw = null } = {}) {
  const { breedte, hoogte, pixels } = kaal;
  const ia = schaal.lijnafstand;
  const zwart = (x, y) => x >= 0 && x < breedte && y >= 0 && y < hoogte && pixels[y * breedte + x] === 1;
  const sjablonen = SOORTEN.map(([soort, naam]) => ({ soort, open: soort === 'heel', ...sjabloon(naam, ia) }));
  const halfGewoon = sjablonen.find((t) => t.soort === 'half');
  sjablonen.push({ ...alleenBuitenrand(halfGewoon), open: true, gewoon: { ...halfGewoon, open: true } });
  const score = maakKopScore(kaal, ia, zw);
  // Een dunne open kop op een scan is soms een paar pixels breder dan het sjabloon: bij het tweede halve sjabloon zoeken we de
  // randen in de voorkeuze met wat speling.
  const speling = Math.max(1, Math.round(ia * 0.15));
  const hoogteSpeling = Math.max(1, Math.round(ia * 0.2));
  const randZwart = (x, y, richting, ruim) => { for (let d = 0; d <= (ruim ? speling : 0); d += 1) if (zwart(x + d * richting, y)) return true; return false; };

  // Een kop ver buiten de balk (vanaf de tweede hulplijn) heeft hulplijnen tussen zich en de balk: dunne horizontale lijnen die
  // aan beide kanten wat buiten de kop uitsteken. Zonder die lijnen is het iets anders (een repetitiecijfer, een letter).
  const heeftHulplijnen = (balk, x, stap, kopBreedte) => {
    const richting = stap < 0 ? -1 : 1;
    const eerste = stap < 0 ? -2 : 10;
    const laatste = stap < 0 ? Math.ceil(stap / 2) * 2 : Math.floor(stap / 2) * 2;
    for (let lijn = eerste; richting < 0 ? lijn >= laatste : lijn <= laatste; lijn += 2 * richting) {
      const y = Math.round(balk.lijnen[0].a + balk.lijnen[0].b * x + (lijn * ia) / 2);
      let gevonden = false;
      for (let dy = -Math.ceil(schaal.lijndikte); dy <= Math.ceil(schaal.lijndikte) && !gevonden; dy += 1) {
        let l = Math.round(x);
        let r = Math.round(x);
        while (zwart(l - 1, y + dy) && x - l < ia * 2) l -= 1;
        while (zwart(r + 1, y + dy) && r - x < ia * 2) r += 1;
        if (r - l + 1 >= kopBreedte * 1.15) gevonden = true;
      }
      if (!gevonden) return false;
    }
    return true;
  };

  return raster.balken.map((balk, b) => {
    const treffers = [];
    const yOp = (stap, x) => balk.lijnen[0].a + balk.lijnen[0].b * x + (stap * ia) / 2;
    // Sleutel, voortekening en maatsoort staan aan het begin van de balk; daar staan geen noten (de onderste krul van een
    // vioolsleutel lijkt op een zwarte kop). Zonder gelezen balkkop (kop.mjs) slaan we de eerste drie lijnafstanden over.
    const kopEinde = balkkoppen?.[b]?.einde ?? balk.links + Math.round(ia * 3);
    const van = Math.max(0, Math.round(kopEinde));
    const tot = Math.min(breedte - 1, balk.rechts);
    // De cijfers van een maatsoortwissel midden in de regel (kop.mjs) zijn geen koppen.
    const wissels = balkkoppen?.[b]?.wissels ?? [];
    for (let stap = -8; stap <= 16; stap += 1) {
      for (let x = van; x <= tot; x += 1) {
        if (wissels.length && wissels.some((w) => x >= w.x && x <= w.rechts)) continue;
        const y = Math.round(yOp(stap, x));
        for (const t of sjablonen) {
          // Snelle voorkeuze: bij een zwarte kop moet het midden zwart zijn, bij een halve of hele de linker- en rechterrand.
          const midden = x - t.ankerX + Math.round(t.breedte / 2);
          if (t.soort === 'zwart' ? !zwart(midden, y) : !(randZwart(x - t.ankerX + 1, y, -1, !!t.gewoon) && randZwart(x - t.ankerX + t.breedte - 2, y, 1, !!t.gewoon))) continue;
          // Past het sjabloon op hoogte yy? (Bij het tweede halve sjabloon moet ook het gewone redelijk passen.)
          const past = (yy) => {
            const v = score(t, x, yy);
            return { v, ja: v >= drempel && (!t.gewoon || score(t.gewoon, x, yy) >= GEWOON_DREMPEL) };
          };
          let beste = past(y);
          let ky = y;
          // Een open kop die net niet past, staat op een scan soms een paar pixels boven of onder zijn plek op de balk (tot
          // ongeveer een vijfde lijnafstand). Bij zwarte koppen niet: die worden al goed gevonden, en met speling schuiven ze
          // naar een buurplek.
          if (!beste.ja && t.soort !== 'zwart' && beste.v >= drempel - BIJNA) {
            for (let d = 1; d <= hoogteSpeling; d += 1) {
              for (const dy of [-d, d]) {
                const p = past(y + dy);
                if (p.ja && (!beste.ja || p.v > beste.v)) { beste = p; ky = y + dy; }
              }
            }
          }
          if (beste.ja && (stap > -2 && stap < 10 || heeftHulplijnen(balk, x - t.ankerX + t.breedte / 2, stap, t.breedte))) treffers.push({ x: x - t.ankerX + t.breedte / 2, y: ky, stap, soort: t.soort, score: beste.v, breedte: t.breedte, hoogte: t.hoogte, tweedeKans: !!t.gewoon });
        }
      }
    }
    // De beste per plek: overlappende treffers (meer dan een derde van de kleinste) vallen weg. Het tweede halve sjabloon (alleen
    // de buitenrand) is een tweede kans: het vult alleen plekken waar geen gewoon sjabloon past (de buitenrand van een hele
    // kop past er ook op).
    treffers.sort((a, b) => (a.tweedeKans - b.tweedeKans) || (b.score - a.score));
    const gekozen = [];
    for (const kandidaat of treffers) {
      const overlapt = gekozen.some((ander) => {
        const ox = Math.min(kandidaat.x + kandidaat.breedte / 2, ander.x + ander.breedte / 2) - Math.max(kandidaat.x - kandidaat.breedte / 2, ander.x - ander.breedte / 2);
        const oy = Math.min(kandidaat.y + kandidaat.hoogte / 2, ander.y + ander.hoogte / 2) - Math.max(kandidaat.y - kandidaat.hoogte / 2, ander.y - ander.hoogte / 2);
        return ox > 0 && oy > 0 && ox * oy > Math.min(kandidaat.breedte * kandidaat.hoogte, ander.breedte * ander.hoogte) / 3;
      });
      if (!overlapt) gekozen.push(kandidaat);
    }
    // Een blokje van een oude meermaatsrust: vanuit het midden van de kop de zwarte strook naar links, rechts, boven en onder.
    const isBlokje = (kop) => {
      const x = Math.round(kop.x);
      const y = Math.round(kop.y);
      if (!zwart(x, y)) return false;
      let l = x; while (zwart(l - 1, y) && x - l < ia) l -= 1;
      let r = x; while (zwart(r + 1, y) && r - x < ia) r += 1;
      let o = y; while (zwart(x, o - 1) && y - o < ia * 2) o -= 1;
      let n = y; while (zwart(x, n + 1) && n - y < ia * 2) n += 1;
      // (Dezelfde breedte als een blokje in rusten.mjs.)
      if (r - l + 1 > ia * 0.9 || r - l + 1 < ia * 0.3) return false;
      const bovenStap = (o - yOp(0, x)) / (ia / 2);
      const onderStap = (n - yOp(0, x)) / (ia / 2);
      if (Math.abs(bovenStap - 2) > 0.6 || (Math.abs(onderStap - 4) > 0.6 && Math.abs(onderStap - 6) > 0.6)) return false;
      let vol = 0;
      for (let yy = o; yy <= n; yy += 1) for (let xx = l; xx <= r; xx += 1) if (zwart(xx, yy)) vol += 1;
      return vol >= (r - l + 1) * (n - o + 1) * 0.88;
    };
    return gekozen.filter((kop) => kop.soort !== 'zwart' || !isBlokje(kop))
      .sort((a, b) => a.x - b.x).map(({ x, y, stap, soort, score: s }) => ({ x: Math.round(x), y, stap, soort, score: Math.round(s * 1000) / 1000 }));
  });
}
