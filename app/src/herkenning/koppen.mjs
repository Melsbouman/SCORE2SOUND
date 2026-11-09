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
// Uitkomst per balk: [{ x, y, stap, soort, score }], met x en y het midden van de kop in pixels en stap de plek op de balk
// (0 = bovenste lijn, 8 = onderste lijn, oneven = tussenruimte, negatief = erboven).
import { sjabloon } from './sjablonen.mjs';

const SOORTEN = [['zwart', 'kop-zwart'], ['half', 'kop-half'], ['heel', 'kop-heel']];

// De score van een kopsjabloon met zijn ankerpunt op (ax, ay): zwarte pixels van het teken wegen 6, het gat binnenin 4, een
// rand wit eromheen 1. Ook gebruikt door kop.mjs (is er vlak na een voorteken een noot?).
export function maakKopScore(kaal, lijnafstand) {
  const { breedte, hoogte, pixels } = kaal;
  const zwart = (x, y) => x >= 0 && x < breedte && y >= 0 && y < hoogte && pixels[y * breedte + x] === 1;
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
        totaal += gewicht;
        if (zwart(x0 + x, y0 + y) === wilZwart) goed += gewicht;
      }
    }
    return goed / totaal;
  };
}

export function zoekNootkoppen(kaal, raster, schaal, { drempel = 0.78, balkkoppen = null } = {}) {
  const { breedte, hoogte, pixels } = kaal;
  const ia = schaal.lijnafstand;
  const zwart = (x, y) => x >= 0 && x < breedte && y >= 0 && y < hoogte && pixels[y * breedte + x] === 1;
  const sjablonen = SOORTEN.map(([soort, naam]) => ({ soort, ...sjabloon(naam, ia) }));
  const score = maakKopScore(kaal, ia);

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
    for (let stap = -8; stap <= 16; stap += 1) {
      for (let x = van; x <= tot; x += 1) {
        const y = Math.round(yOp(stap, x));
        for (const t of sjablonen) {
          // Snelle voorkeuze: bij een zwarte kop moet het midden zwart zijn, bij een halve of hele de linker- en rechterrand.
          const midden = x - t.ankerX + Math.round(t.breedte / 2);
          if (t.soort === 'zwart' ? !zwart(midden, y) : !(zwart(x - t.ankerX + 1, y) && zwart(x - t.ankerX + t.breedte - 2, y))) continue;
          const s = score(t, x, y);
          if (s >= drempel && (stap > -2 && stap < 10 || heeftHulplijnen(balk, x - t.ankerX + t.breedte / 2, stap, t.breedte))) treffers.push({ x: x - t.ankerX + t.breedte / 2, y, stap, soort: t.soort, score: s, breedte: t.breedte, hoogte: t.hoogte });
        }
      }
    }
    // De beste per plek: overlappende treffers (meer dan een derde van de kleinste) vallen weg.
    treffers.sort((a, b) => b.score - a.score);
    const gekozen = [];
    for (const kandidaat of treffers) {
      const overlapt = gekozen.some((ander) => {
        const ox = Math.min(kandidaat.x + kandidaat.breedte / 2, ander.x + ander.breedte / 2) - Math.max(kandidaat.x - kandidaat.breedte / 2, ander.x - ander.breedte / 2);
        const oy = Math.min(kandidaat.y + kandidaat.hoogte / 2, ander.y + ander.hoogte / 2) - Math.max(kandidaat.y - kandidaat.hoogte / 2, ander.y - ander.hoogte / 2);
        return ox > 0 && oy > 0 && ox * oy > Math.min(kandidaat.breedte * kandidaat.hoogte, ander.breedte * ander.hoogte) / 3;
      });
      if (!overlapt) gekozen.push(kandidaat);
    }
    return gekozen.sort((a, b) => a.x - b.x).map(({ x, y, stap, soort, score: s }) => ({ x: Math.round(x), y, stap, soort, score: Math.round(s * 1000) / 1000 }));
  });
}
