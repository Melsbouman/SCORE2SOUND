// Herkenning, repetitiecijfers (een getal in een vierkant of rondje boven de balk, anker voor de maatnummering), in eigen code.
// Werkwijze:
// 1. Op het beeld zonder notenbalklijnen nemen we eenmaal de losse vormen (vormen.mjs) van het hele blad.
// 2. Per balk nemen we de vormen boven de balk: onderkant tussen stap -12 en stap 0,5 (stap 0 is de bovenste lijn, een stap is
//    een halve lijnafstand; een kader staat soms vlak op de balk of raakt hem) en het midden binnen de breedte van de balk.
// 3. Een kader is een vorm van 1,5 tot 5 lijnafstanden breed en hoog met een groot gat (wit binnen de vorm, niet met de rand
//    verbonden, minstens 40 procent van het kader). Op een scan is de rand van een rondje soms niet helemaal dicht: kleine
//    onderbrekingen (tot een paar pixels) tellen voor het gat als dicht, en ook wit dat links, rechts, boven en onder door de
//    vorm ingesloten is telt (een rondje dat de balk raakt, verliest bij het weghalen van de lijn een stuk van zijn rand). Zijn de vier hoeken van het kader zwart, dan is het een
//    'vierkant', anders een 'cirkel'.
// 4. De vormen die helemaal binnen het gat liggen, zijn de cijfers: van links naar rechts, elk vergeleken met de sjablonen van
//    de cijfers die bij de gaten in de vorm passen (gatenVan en BIJ_GATEN uit cijfers.mjs). Is een cijfer minder zeker dan
//    0,85 (of 0,78 met een duidelijke voorsprong; of is er geen cijfer), dan is de waarde null. Een teken dat lager is dan 0,43
//    keer het kader is een letter (A, B, C) en geen cijfer; een heel smal teken of een rechte staander is een 1.
// Uitkomst per balk: [{ x, links, rechts, boven, onder, kader: 'vierkant' | 'cirkel', waarde }] met x het midden en waarde een
// tekst zoals '12' of null.
import { vindVormen } from './vormen.mjs';
import { sjabloon, vergelijkVorm } from './sjablonen.mjs';
import { gatenVan, BIJ_GATEN } from './cijfers.mjs';

// Het aantal witte pixels dat door de vorm ingesloten is: in de rij staat links en rechts ervan zwart van de vorm, en in de kolom
// boven en onder. Zo telt een rondje waarvan de rand op een paar plekken open is (op een scan, of waar het weghalen van een
// notenbalklijn een stukje meenam) toch grotendeels als gat; een boog of haak niet.
function ingeslotenPixels(isZwart, k) {
  const w = k.rechts - k.links + 1;
  const h = k.onder - k.boven + 1;
  const rijVan = new Int32Array(h).fill(w);
  const rijTot = new Int32Array(h).fill(-1);
  const kolomVan = new Int32Array(w).fill(h);
  const kolomTot = new Int32Array(w).fill(-1);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (!isZwart(k.links + x, k.boven + y)) continue;
      if (x < rijVan[y]) rijVan[y] = x;
      if (x > rijTot[y]) rijTot[y] = x;
      if (y < kolomVan[x]) kolomVan[x] = y;
      if (y > kolomTot[x]) kolomTot[x] = y;
    }
  }
  let aantal = 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = rijVan[y] + 1; x < rijTot[y]; x += 1) {
      if (y > kolomVan[x] && y < kolomTot[x] && !isZwart(k.links + x, k.boven + y)) aantal += 1;
    }
  }
  return aantal;
}

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

// Of een teken een rechte staander is (een 1, ook zonder voet): in het stuk van 45 tot 85 procent van de hoogte is elke rij één
// smalle strook (hooguit de helft van de breedte), steeds op dezelfde plek (hooguit een tiende van de breedte verschoven; de
// schuine streep van een 7 schuift meer).
function isEen(isZwart, k) {
  const w = k.rechts - k.links + 1;
  const h = k.onder - k.boven + 1;
  const middens = [];
  for (let y = Math.round(k.boven + h * 0.45); y <= Math.round(k.boven + h * 0.85); y += 1) {
    let stroken = 0;
    let begin = -1;
    let breedte = 0;
    let midden = 0;
    for (let x = k.links; x <= k.rechts + 1; x += 1) {
      const z = x <= k.rechts && isZwart(x, y);
      if (z && begin < 0) begin = x;
      if (!z && begin >= 0) { stroken += 1; breedte = x - begin; midden = (begin + x - 1) / 2; begin = -1; }
    }
    if (stroken !== 1 || breedte > w * 0.5) return false;
    middens.push(midden);
  }
  return middens.length > 0 && Math.max(...middens) - Math.min(...middens) <= Math.max(1, w * 0.1);
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
      if (v.onder > yOp(0.5, midden) || v.onder < yOp(-12, midden)) continue;
      const breedte = (v.rechts - v.links + 1) / ia;
      const hoogte = (v.onder - v.boven + 1) / ia;
      if (breedte < 1.5 || breedte > 5 || hoogte < 1.5 || hoogte > 5) continue;
      const isZwart = isVorm(v);
      // Voor het gat: een pixel telt als zwart als er binnen 2 pixels een zwart pixel van de vorm is (kleine onderbrekingen dicht).
      const dicht = (x, y) => {
        for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) if (isZwart(x + dx, y + dy)) return true;
        return false;
      };
      const gat = Math.max(gatPixels(dicht, v), ingeslotenPixels(isZwart, v));
      if (gat < 0.4 * (v.rechts - v.links + 1) * (v.onder - v.boven + 1)) continue;
      // Hoeken: een zwarte pixel in het hoekvakje (2 pixels, of een vijfde lijnafstand bij een hoge resolutie), in alle vier de
      // hoeken.
      const hoekMaat = Math.max(2, Math.round(ia * 0.2));
      const hoek = (x0, y0, dx, dy) => {
        for (let j = 0; j < hoekMaat; j += 1) for (let i = 0; i < hoekMaat; i += 1) if (isZwart(x0 + dx * i, y0 + dy * j)) return true;
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
        // Een letter in een kader (A, B, C, ook I en F) is lager dan een cijfer, ten opzichte van het kader: op echte scans letters
        // 0,35 tot 0,39 van de hoogte van het kader, cijfers 0,46 tot 0,60. Een heel smal teken (onder 0,36) of een rechte staander
        // (zie isEen) is een 1: een 1 zonder voet, of met een vlaggetje, lijkt anders meer op de 2 of de 7 van het sjabloon.
        const verhouding = (c.rechts - c.links + 1) / (c.onder - c.boven + 1);
        if ((c.onder - c.boven + 1) < (v.onder - v.boven + 1) * 0.43) { tekst = ''; break; }
        if (verhouding < 0.36 || isEen(isC, c)) { tekst += '1'; continue; }
        let beste = -1;
        let cijfer = null;
        const gaten = gatenVan(isC, c, ia * ia * 0.1);
        // (In veel lettertypen is de 4 open, dus zonder gat.)
        const mogelijk = gaten.length ? BIJ_GATEN(gaten) : [1, 2, 3, 4, 5, 7];
        let tweede = -1;
        for (const n of mogelijk) {
          const score = vergelijkVorm(isC, c, sjabloon('cijfer-' + n, ia));
          if (score > beste) { tweede = beste; beste = score; cijfer = n; } else if (score > tweede) tweede = score;
        }
        if (process.env.RDBG) console.log('CIJFER', Math.round(midden), cijfer, beste.toFixed(3), tweede.toFixed(3));
        // Zeker genoeg: minstens 0,85, of minstens 0,78 met een duidelijke voorsprong op het volgende cijfer.
        if (cijfer === null || !(beste >= 0.85 || (beste >= 0.78 && beste - tweede >= 0.06))) { tekst = ''; break; }
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
