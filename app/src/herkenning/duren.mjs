// Herkenning, stappen STEMS en BEAMS (naar het voorbeeld van Audiveris): de duur van een nootkop uit zijn stok, waardestrepen,
// vlaggen en punt, in eigen code. Werkwijze:
// 1. Stok: aan de rechterkant van de kop omhoog of aan de linkerkant omlaag zoeken we de langste verticale zwarte strook
//    (op het beeld zonder notenbalklijnen). Vanaf twee lijnafstanden is het een stok.
// 2. Waardestrepen: bij het eind van de stok tellen we de dikke horizontale stroken die door de stok gaan (een strook rond de
//    stok die breder is dan een lijnafstand). Elke strook halveert de duur.
// 3. Vlaggen: zonder waardestreep kijken we of er vlak rechts tegen het eind van de stok zwart zit (de aanzet van een vlag).
//    Elke aanzet op een rij is een vlag: één voor een achtste, twee voor een zestiende. Zo werkt het voor elk lettertype
//    (Maestro tekent vlaggen anders dan Bravura).
// 4. Punt: een klein, rond, los vlekje rechts van de kop, in de tussenruimte (op een lijn: de tussenruimte erboven), maakt de
//    duur anderhalf keer zo lang.
// Duur in tikken (480 per kwartnoot): heel 1920, half 960, zwart 480 gedeeld door 2 per waardestreep of vlag.
import { sjabloon } from './sjablonen.mjs';

export function bepaalDuren(kaal, raster, schaal, koppenPerBalk) {
  const { breedte, hoogte, pixels } = kaal;
  const ia = schaal.lijnafstand;
  const zwart = (x, y) => x >= 0 && x < breedte && y >= 0 && y < hoogte && pixels[y * breedte + x] === 1;
  const kop = sjabloon('kop-zwart', ia);
  // Aanzetten van vlaggen: rijen vanaf het eind van de stok waar het zwart direct rechts naast de stok doorloopt.
  const telVlaggen = (stokX, eind, stap) => {
    let aantal = 0;
    let inVlag = false;
    let lengte = 0;
    for (let n = 0; n < ia * 2.2; n += 1) {
      const y = eind - stap * n;
      const naast = zwart(stokX + 1, y) || zwart(stokX + 2, y);
      const verder = zwart(stokX + 3, y) || zwart(stokX + 4, y);
      const raak = naast && verder;
      if (raak) lengte += 1;
      if (!raak && inVlag) {
        // Een aanzet van minstens een vijfde lijnafstand telt.
        if (lengte >= ia * 0.2) aantal += 1;
        lengte = 0;
      }
      inVlag = raak;
    }
    if (inVlag && lengte >= ia * 0.2) aantal += 1;
    return Math.min(aantal, 3);
  };
  // Een los, rond vlekje (een punt) met zijn midden in het vak (x0..x1, y-r..y+r)?
  const zoekPunt = (x0, x1, y) => {
    const r = Math.round(ia * 0.3);
    for (let x = x0; x <= x1; x += 1) {
      for (let dy = -r; dy <= r; dy += 1) {
        if (!zwart(x, y + dy)) continue;
        // De vlek rond dit punt (klein houden: groter dan een punt is het iets anders).
        const gezien = new Set();
        const stapel = [[x, y + dy]];
        let l = x; let rr = x; let b = y + dy; let o = y + dy;
        while (stapel.length && gezien.size <= ia * ia) {
          const [px, py] = stapel.pop();
          const sleutel = py * breedte + px;
          if (gezien.has(sleutel) || !zwart(px, py)) continue;
          gezien.add(sleutel);
          l = Math.min(l, px); rr = Math.max(rr, px); b = Math.min(b, py); o = Math.max(o, py);
          stapel.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
        }
        const w = rr - l + 1;
        const h = o - b + 1;
        const vulling = gezien.size / (w * h);
        if (w >= ia * 0.2 && w <= ia * 0.7 && h >= ia * 0.2 && h <= ia * 0.7 && vulling >= 0.5 && Math.abs((b + o) / 2 - y) <= ia * 0.3) return true;
        return false;
      }
    }
    return false;
  };
  // De langste verticale strook in een paar kolommen, vanaf rij y in richting stap (-1 omhoog, 1 omlaag).
  const strook = (kolommen, y, stap) => {
    let beste = { x: kolommen[0], lengte: 0, eind: y };
    for (const x of kolommen) {
      let p = y;
      let leeg = 0;
      let laatste = y;
      while (p >= 0 && p < hoogte && leeg <= 1) {
        if (zwart(x, p)) { laatste = p; leeg = 0; } else leeg += 1;
        p += stap;
      }
      const lengte = Math.abs(laatste - y);
      if (lengte > beste.lengte) beste = { x, lengte, eind: laatste };
    }
    return beste;
  };
  // Het aantal dikke horizontale stroken door de stok, in de laatste tweeënhalve lijnafstand voor het eind.
  const telWaardestrepen = (stokX, eind, stap) => {
    let aantal = 0;
    let inStreep = false;
    for (let n = 0; n < ia * 2.5; n += 1) {
      const y = eind - stap * n;
      let l = stokX;
      let r = stokX;
      while (zwart(l - 1, y) && stokX - l <= ia * 2) l -= 1;
      while (zwart(r + 1, y) && r - stokX <= ia * 2) r += 1;
      const breed = zwart(stokX, y) && r - l + 1 > ia;
      if (breed && !inStreep) aantal += 1;
      inStreep = breed;
    }
    return aantal;
  };

  return koppenPerBalk.map((koppen) => koppen.map((noot) => {
    const uit = { ...noot };
    const yKop = noot.y;
    if (noot.soort === 'heel') {
      uit.duur = 1920;
    } else {
      const rechtsKant = Math.round(noot.x + kop.breedte / 2);
      const linksKant = Math.round(noot.x - kop.breedte / 2);
      const marge = Math.max(3, Math.round(ia * 0.3));
      // Koppen in andere lettertypen (Maestro) zijn wat smaller of breder dan in Bravura: zoek een paar kolommen naar binnen en buiten.
      const kolommen = (rand, binnen) => Array.from({ length: marge + 3 }, (_, i) => rand + binnen * (i - 2));
      const op = strook(kolommen(rechtsKant, -1), Math.round(yKop - kop.hoogte * 0.25), -1);
      const neer = strook(kolommen(linksKant, 1), Math.round(yKop + kop.hoogte * 0.25), 1);
      const stok = op.lengte >= neer.lengte ? { ...op, richting: 'op', stap: -1 } : { ...neer, richting: 'neer', stap: 1 };
      if (stok.lengte >= ia * 2) uit.stok = { richting: stok.richting, x: stok.x, eind: stok.eind };
      if (noot.soort === 'half') {
        uit.duur = 960;
      } else {
        let delingen = 0;
        if (uit.stok) {
          delingen = telWaardestrepen(stok.x, stok.eind, stok.stap);
          if (delingen === 0) delingen = telVlaggen(stok.x, stok.eind, stok.stap);
        }
        uit.duur = 480 / 2 ** delingen;
        uit.delingen = delingen;
      }
    }
    // Punt rechts van de kop, in de tussenruimte.
    const puntStap = Math.abs(noot.stap) % 2 === 1 ? noot.stap : noot.stap - 1;
    const puntY = Math.round(yKop + ((puntStap - noot.stap) * ia) / 2);
    // Na de kop (en een stok omhoog aan de rechterkant) begint het zoeken.
    const x0 = Math.round(noot.x + kop.breedte / 2 + Math.max(2, ia * 0.2));
    if (zoekPunt(x0, x0 + Math.round(ia * 0.9), puntY)) {
      uit.punt = true;
      uit.duur = Math.round(uit.duur * 1.5);
    }
    return uit;
  }));
}
