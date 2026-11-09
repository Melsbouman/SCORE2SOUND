// Herkenning, stap GRID deel 2 (naar het voorbeeld van Audiveris): maatstrepen en maten per notenbalk, in eigen code.
// Werkwijze:
// 1. Per kolom kijken we of er een zwarte strook loopt van de bovenste tot de onderste lijn (schuin mee op een scheve scan).
// 2. Een stok kan dat ook, maar zit altijd vast aan een nootkop of een waardestreep: breed en dik. Op het beeld zonder
//    notenbalklijnen zoeken we langs de streep naar het langste stuk aaneengesloten rijen waar de vlek rond de streep breder is
//    dan de streep zelf. Binnen de balk telt elke rij; buiten de balk alleen zolang de streep zelf doorloopt (een stok loopt
//    door naar zijn nootkop of balk, een maatstreep houdt op bij de lijn; de haak van een hokje is dun). Een overbinding of
//    haak die de streep kruist is maar een paar rijen dik; een nootkop, waardestreep of sleutel veel meer.
// 3. Aaneengesloten kolommen vormen één streep; strepen dicht bij elkaar (dubbele streep, eindstreep, herhaalteken) worden
//    één maatstreep met een soort: 'enkel', 'dubbel' (twee dunne), 'eind' (dun en dik), 'begin' (dik en dun) of 'beide'
//    (dun, dik, dun). Een losse dikke streep midden in de balk is geen maatstreep (de dikke balk van een C-sleutel); alleen aan
//    het eind van de balk telt hij als eindstreep.
//    Daarna kijken we bij elke streep links en rechts naar herhaalpunten: een klein, rond, los vlekje op de hoogte van stap 3
//    én van stap 5, binnen 1,2 lijnafstand van de streep. Punten links: herhaling 'eind'; rechts: 'begin'; beide: 'beide'.
// 4. Tussen de strepen liggen de maten. De eerste maat begint waar de balk begint (met sleutel en voortekening erin, zoals de
//    eerste maat bij Audiveris). Een streep vlak na het begin (alleen sleutel en voortekening ervoor, zoals een herhaalteken
//    aan het begin van een regel) is geen maatgrens; een smal stuk na de laatste streep (een waarschuwingsvoortekening of
//    -sleutel aan het eind van de regel) is geen maat.
import { verwijderLijnen } from './vormen.mjs';

// Uitkomst per balk: { strepen: [{ links, rechts, soort, herhaling? }], maten: [{ links, rechts, boven, onder }] }, met boven en onder de
// hoogte van de bovenste en onderste lijn midden in de maat (zoals `vak` in het model).

export function vindMaten(zw, raster, schaal) {
  const { breedte, hoogte, pixels } = zw;
  const kaal = verwijderLijnen(zw, raster, schaal).pixels;
  const zwartKaal = (x, y) => x >= 0 && x < breedte && y >= 0 && y < hoogte && kaal[y * breedte + x] === 1;
  const ia = schaal.lijnafstand;
  const dikte = schaal.lijndikte;
  const zwart = (x, y) => x >= 0 && x < breedte && y >= 0 && y < hoogte && pixels[y * breedte + x] === 1;
  return raster.balken.map((balk) => {
    const boven = (x) => balk.lijnen[0].a + balk.lijnen[0].b * x - dikte / 2;
    const onder = (x) => balk.lijnen[4].a + balk.lijnen[4].b * x + dikte / 2;
    const vol = [];
    const van = Math.max(0, balk.links - Math.round(ia));
    const tot = Math.min(breedte - 1, balk.rechts + Math.round(ia));
    // Een gaatje van een pixel of twee in een scan mag. Een stok vanaf een noot op de onderste lijn is 3,5 lijnafstand lang en
    // houdt een halve lijnafstand onder de bovenste lijn op; die valt hier al af.
    const gat = Math.max(1, Math.round(dikte / 2));
    // Op een scheve scan staan de maatstrepen haaks op de (scheve) lijnen: x schuift mee met -helling * (y - midden).
    const helling = balk.lijnen[2].b;
    const schuin = (x, y, ym) => Math.round(x - helling * (y - ym));
    const doorlopend = (x, y0, y1) => {
      const y = Math.round((y0 + y1) / 2);
      let omhoog = y;
      let leeg = 0;
      for (let p = y; p >= y0 - 1; p -= 1) {
        if (zwart(schuin(x, p, y), p)) { omhoog = p; leeg = 0; } else if (++leeg > gat) break;
      }
      let omlaag = y;
      leeg = 0;
      for (let p = y; p <= y1 + 1; p += 1) {
        if (zwart(schuin(x, p, y), p)) { omlaag = p; leeg = 0; } else if (++leeg > gat) break;
      }
      return omhoog <= y0 + dikte && omlaag >= y1 - dikte;
    };
    for (let x = van; x <= tot; x += 1) vol.push(doorlopend(x, Math.round(boven(x)), Math.round(onder(x))));

    // Het langste stuk aaneengesloten rijen langs de streep met een vlek die breder is dan de streep (zie 2 hierboven).
    const vastAanIets = (links, rechts) => {
      const midden = Math.round((links + rechts) / 2);
      const toegestaan = rechts - links + 1 + ia * 0.6;
      const yBoven = Math.round(boven(midden));
      const yOnder = Math.round(onder(midden));
      const ym = Math.round((yBoven + yOnder) / 2);
      // Is deze rij breed? De vlek moet door de streep zelf gaan.
      const breed = (y) => {
        const verschuiving = schuin(0, y, ym);
        let start = -1;
        for (let x = links - 1 + verschuiving; x <= rechts + 1 + verschuiving; x += 1) if (zwartKaal(x, y)) { start = x; break; }
        if (start < 0) return null;
        let l = start;
        let r = start;
        while (zwartKaal(l - 1, y) && r - l + 1 <= toegestaan) l -= 1;
        while (zwartKaal(r + 1, y) && r - l + 1 <= toegestaan) r += 1;
        return r - l + 1 > toegestaan;
      };
      // Buiten de balk: alleen zolang de streep doorloopt, tot drie lijnafstanden ver. Daarna tellen we in één doorgaande reeks
      // van boven naar beneden, zodat een waardestreep of nootkop die precies op een buitenste lijn ligt niet in tweeën valt.
      let yVan = yBoven;
      while (yBoven - yVan < ia * 3 && breed(yVan - 1) !== null) yVan -= 1;
      let yTot = yOnder;
      while (yTot - yOnder < ia * 3 && breed(yTot + 1) !== null) yTot += 1;
      let langste = 0;
      let huidig = 0;
      for (let y = yVan; y <= yTot; y += 1) {
        huidig = breed(y) ? huidig + 1 : 0;
        langste = Math.max(langste, huidig);
      }
      return langste;
    };
    // Aaneengesloten kolommen tot losse strepen; een streep breder dan een lijnafstand is geen maatstreep (een vlak, een balk),
    // en een streep die vastzit aan een nootkop of waardestreep is een stok.
    const losse = [];
    for (let i = 0; i < vol.length; i += 1) {
      if (!vol[i]) continue;
      let j = i;
      while (j + 1 < vol.length && vol[j + 1]) j += 1;
      if (j - i + 1 <= ia && vastAanIets(van + i, van + j) <= Math.max(2, ia * 0.35)) losse.push({ links: van + i, rechts: van + j });
      i = j;
    }
    // Strepen binnen ongeveer een lijnafstand van elkaar horen bij één maatstreep.
    const dun = Math.max(2, dikte * 2.5);
    const groepen = [];
    for (const streep of losse) {
      const vorige = groepen.at(-1);
      if (vorige && streep.links - vorige.rechts <= ia * 1.2) {
        vorige.delen.push(streep);
        vorige.rechts = streep.rechts;
      } else {
        groepen.push({ links: streep.links, rechts: streep.rechts, delen: [streep] });
      }
    }
    const strepen = [];
    for (const groep of groepen) {
      const dik = groep.delen.map((deel) => deel.rechts - deel.links + 1 > dun);
      let soort;
      if (groep.delen.length === 1) {
        // Een losse dikke streep: alleen aan het eind van de balk een eindstreep, anders de dikke balk van een C-sleutel.
        if (dik[0] && balk.rechts - groep.rechts > ia * 1.5) continue;
        soort = dik[0] ? 'eind' : 'enkel';
      } else if (groep.delen.length >= 3 && dik.some((waarde, i) => waarde && i > 0 && i < dik.length - 1)) soort = 'beide';
      else if (dik.at(-1) && !dik[0]) soort = 'eind';
      else if (dik[0] && !dik.at(-1)) soort = 'begin';
      else soort = 'dubbel';
      strepen.push({ links: groep.links, rechts: groep.rechts, soort });
    }
    // Herhaalpunten: naast de streep, op de hoogte van stap 3 en stap 5, een klein rond los vlekje.
    const stapHoogte = (stap, x) => balk.lijnen[0].a + balk.lijnen[0].b * x + (stap * ia) / 2;
    const isPunt = (x0, x1, stap) => {
      const marge = ia * 0.35;
      for (let x = x0; x <= x1; x += 1) {
        const yMidden = stapHoogte(stap, x);
        for (let y = Math.ceil(yMidden - marge); y <= Math.floor(yMidden + marge); y += 1) {
          if (!zwartKaal(x, y)) continue;
          const gezien = new Set([y * breedte + x]);
          const rij = [[x, y]];
          let minX = x;
          let maxX = x;
          let minY = y;
          let maxY = y;
          let te = false;
          for (let k = 0; k < rij.length; k += 1) {
            const [px, py] = rij[k];
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const nx = px + dx;
              const ny = py + dy;
              if (!zwartKaal(nx, ny) || gezien.has(ny * breedte + nx)) continue;
              gezien.add(ny * breedte + nx);
              rij.push([nx, ny]);
              minX = Math.min(minX, nx);
              maxX = Math.max(maxX, nx);
              minY = Math.min(minY, ny);
              maxY = Math.max(maxY, ny);
            }
            if (rij.length > ia * ia) { te = true; break; }
          }
          if (te) return false;
          const b = maxX - minX + 1;
          const h = maxY - minY + 1;
          const cy = (minY + maxY) / 2;
          return b >= ia * 0.2 && b <= ia * 0.75 && h >= ia * 0.2 && h <= ia * 0.75 && Math.abs(cy - stapHoogte(stap, (minX + maxX) / 2)) <= marge;
        }
      }
      return false;
    };
    const reikwijdte = Math.round(ia * 1.2);
    const puntenKant = (x0, x1) => isPunt(x0, x1, 3) && isPunt(x0, x1, 5);
    for (const streep of strepen) {
      const links = puntenKant(streep.links - reikwijdte, streep.links - 1);
      const rechts = puntenKant(streep.rechts + 1, streep.rechts + reikwijdte);
      if (links && rechts) streep.herhaling = 'beide';
      else if (links) streep.herhaling = 'eind';
      else if (rechts) streep.herhaling = 'begin';
    }
    // Maten tussen de strepen. Een streep vlak na het begin van de balk (alleen sleutel, voortekening en maatsoort ervoor)
    // is geen maatgrens: binnen anderhalve lijnafstand altijd, en een herhaalteken of dubbele streep tot negen lijnafstanden.
    const grenzen = [balk.links];
    for (const streep of strepen) {
      const midden = (streep.links + streep.rechts) / 2;
      const afstand = midden - balk.links;
      const eerste = grenzen.length === 1;
      if (eerste && (afstand <= ia * 1.5 || (afstand <= ia * 9 && (streep.soort === 'begin' || streep.soort === 'dubbel' || streep.soort === 'beide')))) {
        grenzen[0] = streep.rechts;
        continue;
      }
      grenzen.push(midden);
    }
    // Na de laatste streep: alleen een maat als er echt ruimte voor muziek is (een waarschuwingsvoortekening is smaller).
    if (balk.rechts - grenzen.at(-1) > (strepen.length ? ia * 5 : ia * 1.5)) grenzen.push(balk.rechts);
    const maten = [];
    for (let i = 0; i + 1 < grenzen.length; i += 1) {
      const links = Math.round(grenzen[i]);
      const rechts = Math.round(grenzen[i + 1]);
      if (rechts - links < ia) continue;
      const midden = (links + rechts) / 2;
      maten.push({
        links,
        rechts,
        boven: Math.round(balk.lijnen[0].a + balk.lijnen[0].b * midden),
        onder: Math.round(balk.lijnen[4].a + balk.lijnen[4].b * midden),
      });
    }
    return { strepen, maten };
  });
}
