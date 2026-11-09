// Herkenning, stap GRID deel 2 (naar het voorbeeld van Audiveris): maatstrepen en maten per notenbalk, in eigen code.
// Werkwijze:
// 1. Per kolom tellen we de zwarte pixels tussen de bovenste en de onderste lijn van de balk (met de helling mee).
// 2. Een maatstreep loopt zonder onderbreking van de bovenste tot de onderste lijn. Een stok kan dat ook, maar zit altijd vast
//    aan een nootkop of een waardestreep: breed en dik. Op het beeld zonder notenbalklijnen tellen we de rijen (binnen de
//    balk en anderhalve lijnafstand erboven en eronder) waar de vlek rond de streep breder is dan de streep zelf. Een
//    overbinding over de streep of de haak van een hokje is dun (een paar rijen); een nootkop, waardestreep of sleutel niet.
// 3. Aaneengesloten kolommen vormen één streep; strepen dicht bij elkaar (dubbele streep, eindstreep, herhaalteken) worden
//    één maatstreep met een soort: 'enkel', 'dubbel' (twee dunne), 'eind' (dun en dik) of 'begin' (dik en dun).
// 4. Tussen de strepen liggen de maten. De eerste maat begint waar de balk begint (met sleutel en voortekening erin, zoals de
//    eerste maat bij Audiveris), de laatste eindigt bij de laatste streep of bij het eind van de balk.
import { verwijderLijnen } from './vormen.mjs';

// Uitkomst per balk: { strepen: [{ links, rechts, soort }], maten: [{ links, rechts, boven, onder }] }, met boven en onder de
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
    // Per kolom: is dit een kolom van een maatstreep?
    const vol = [];
    const van = Math.max(0, balk.links - Math.round(ia));
    const tot = Math.min(breedte - 1, balk.rechts + Math.round(ia));
    // Een maatstreep loopt zonder onderbreking van de bovenste tot de onderste lijn (een gaatje van een pixel of twee in een
    // scan mag). Een stok vanaf een noot op de onderste lijn is 3,5 lijnafstand lang en houdt een halve lijnafstand onder de
    // bovenste lijn op; die valt hier af.
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
    // Hoeveel rijen langs de streep raken een vlek die breder is dan de streep (zie 2 hierboven).
    const bredeRijen = (links, rechts) => {
      const midden = Math.round((links + rechts) / 2);
      const toegestaan = rechts - links + 1 + ia * 0.6;
      const y0 = Math.round(boven(midden) - ia * 1.5);
      const y1 = Math.round(onder(midden) + ia * 1.5);
      const ym = Math.round((boven(midden) + onder(midden)) / 2);
      let aantal = 0;
      for (let y = y0; y <= y1; y += 1) {
        let start = -1;
        const verschuiving = schuin(0, y, ym);
        for (let x = links + verschuiving; x <= rechts + verschuiving; x += 1) if (zwartKaal(x, y)) { start = x; break; }
        if (start < 0) continue;
        let l = start;
        while (zwartKaal(l - 1, y)) l -= 1;
        let r = start;
        while (zwartKaal(r + 1, y)) r += 1;
        if (r - l + 1 > toegestaan) aantal += 1;
      }
      return aantal;
    };
    // Aaneengesloten kolommen tot losse strepen; een streep breder dan een lijnafstand is geen maatstreep (een vlak, een balk),
    // en een streep die vastzit aan een nootkop of waardestreep is een stok.
    const losse = [];
    for (let i = 0; i < vol.length; i += 1) {
      if (!vol[i]) continue;
      let j = i;
      while (j + 1 < vol.length && vol[j + 1]) j += 1;
      if (j - i + 1 <= ia && bredeRijen(van + i, van + j) <= ia * 0.4) losse.push({ links: van + i, rechts: van + j });
      i = j;
    }
    // Strepen binnen ongeveer een lijnafstand van elkaar horen bij één maatstreep.
    const dun = Math.max(2, dikte * 2.5);
    const strepen = [];
    for (const streep of losse) {
      const vorige = strepen.at(-1);
      if (vorige && streep.links - vorige.rechts <= ia * 1.2) {
        vorige.delen.push(streep);
        vorige.rechts = streep.rechts;
      } else {
        strepen.push({ links: streep.links, rechts: streep.rechts, delen: [streep] });
      }
    }
    for (const streep of strepen) {
      const dik = streep.delen.map((deel) => deel.rechts - deel.links + 1 > dun);
      if (streep.delen.length === 1) streep.soort = dik[0] ? 'eind' : 'enkel';
      else if (dik.at(-1) && !dik[0]) streep.soort = 'eind';
      else if (dik[0] && !dik.at(-1)) streep.soort = 'begin';
      else streep.soort = 'dubbel';
      delete streep.delen;
    }
    // Maten tussen de strepen. Een streep vlak bij het begin van de balk is een beginstreep en geen maatgrens.
    const grenzen = [balk.links];
    for (const streep of strepen) {
      const midden = (streep.links + streep.rechts) / 2;
      if (midden - balk.links <= ia * 1.5) {
        grenzen[0] = streep.rechts;
        continue;
      }
      grenzen.push(midden);
    }
    if (balk.rechts - grenzen.at(-1) > ia * 1.5) grenzen.push(balk.rechts);
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
