// Herkenning, hokjes voor een eerste en tweede eind (1. en 2.), in eigen code. Werkwijze:
// 1. Op het beeld zonder notenbalklijnen zoeken we boven de balk (tussen stap -12 en stap -2; stap 0 is de bovenste lijn, een
//    stap is een halve lijnafstand) rechte horizontale lijnen: minstens 3 lijnafstanden lang en hooguit 0,35 lijnafstand dik.
//    We lezen rij voor rij langs de balk, dus een scheve balk geeft ook een scheve lijn.
// 2. Aan het linker uiteinde moet een haakje recht omlaag staan van minstens 1 lijnafstand (bijna: 0,9). Een lijn
//    zonder haakje, of een gebogen lijn (die heeft geen lang recht stuk), is geen hokje. Een haakje omlaag aan het rechter
//    uiteinde maakt het hokje gesloten. (Een haakje loopt soms door in de maatstreep eronder.) Eindigt een 'haakje' in een
//    nootkop, dan is het de stok onder een waardestreep (een groep achtsten met de stokken omhoog); heeft de vorm ook een
//    onderkant, dan is het een kadertje rond een repetitieletter.
// 3. Het nummer: de cijfervormen net rechts van het linker haakje onder de lijn worden vergeleken met de sjablonen cijfer-0
//    tot cijfer-4 (een hokje heeft in de praktijk nummer 1 tot 4; een 2 uit een ander lettertype lijkt anders soms meer op de 5
//    uit het sjabloon), zoals bij cijfers.mjs; de beste telt als score minstens 0,75 is. Een smal cijfer (minder dan half zo
//    breed als hoog) is een 1. Een punt erachter telt niet. Is een cijfer niet zeker, dan is de lijst met nummers leeg. Staat er
//    niets onder de lijn rechts van het haakje, dan is het geen hokje (een triolenhaak heeft zijn cijfer in de lijn).
// Uitkomst per balk: [{ links, rechts, y, nummers, gesloten }] met nummers zoals [1] of [1, 2] (bij '1.2.'), of [].
import { vindVormen } from './vormen.mjs';
import { sjabloon, vergelijkVorm } from './sjablonen.mjs';

export function zoekHokjes(kaal, raster, schaal) {
  const ia = schaal.lijnafstand;
  const { breedte, hoogte, pixels } = kaal;
  const minLengte = Math.round(3 * ia);
  const maxDikte = Math.max(1, Math.floor(0.35 * ia + 0.5));
  const minHaak = Math.max(2, Math.round(0.9 * ia));
  const { labels, vormen } = vindVormen(kaal, { minPixels: Math.max(2, Math.round(ia * ia * 0.04)) });
  const sjablonen = [];
  for (let n = 1; n <= 4; n += 1) sjablonen.push({ n, ...sjabloon('cijfer-' + n, ia) });

  return raster.balken.map((balk) => {
    const { a, b } = balk.lijnen[0];
    const rij = (x, dy) => Math.round(a + b * x + dy);
    const zwart = (x, dy) => {
      if (x < 0 || x >= breedte) return false;
      const y = rij(x, dy);
      return y >= 0 && y < hoogte && pixels[y * breedte + x] === 1;
    };
    // Lengte van een haakje omlaag op kolom x (ook een kolom ernaast telt), vanaf de rij onder de lijn.
    const haak = (x, onder) => {
      let n = 0;
      while (zwart(x, onder + 1 + n) || zwart(x - 1, onder + 1 + n) || zwart(x + 1, onder + 1 + n)) n += 1;
      return n;
    };
    // Het langste haakje in de kolommen van tot tot: { x, lengte }, of null als het korter is dan minHaak.
    const haakBij = (van, tot, onder) => {
      let besteX = -1;
      let beste = 0;
      for (let x = van; x <= tot; x += 1) {
        const n = haak(x, onder);
        if (n > beste) { beste = n; besteX = x; }
      }
      return beste >= minHaak ? { x: besteX, lengte: beste } : null;
    };

    // Stap 1: lange horizontale stukken per rij, samengevoegd tot lijnen van meerdere rijen.
    const dyVan = Math.round(-6 * ia);
    const dyTot = Math.round(-ia);
    let groepen = [];
    const klaar = [];
    for (let dy = dyVan; dy <= dyTot; dy += 1) {
      const runs = [];
      let start = -1;
      for (let x = 0; x <= breedte; x += 1) {
        if (x < breedte && zwart(x, dy)) { if (start < 0) start = x; } else if (start >= 0) {
          if (x - start >= minLengte) runs.push([start, x - 1]);
          start = -1;
        }
      }
      const nieuw = [];
      for (const [l, r] of runs) {
        const groep = groepen.find((g) => g.onder === dy - 1 && Math.min(g.rechts, r) - Math.max(g.links, l) + 1 >= minLengte / 2);
        if (groep) {
          groep.onder = dy;
          groep.links = Math.min(groep.links, l);
          groep.rechts = Math.max(groep.rechts, r);
          nieuw.push(groep);
        } else nieuw.push({ boven: dy, onder: dy, links: l, rechts: r });
      }
      for (const g of groepen) if (!nieuw.includes(g)) klaar.push(g);
      groepen = nieuw;
    }
    klaar.push(...groepen);

    const hokjes = [];
    for (const g of klaar) {
      if (g.onder - g.boven + 1 > maxDikte) continue;
      const breed = Math.ceil(0.35 * ia) + 1;
      // Stap 2: haakje links (verplicht) en rechts (maakt het hokje gesloten).
      const linker = haakBij(g.links, g.links + breed, g.onder);
      if (!linker) continue;
      const linksX = linker.x;
      const rechter = haakBij(g.rechts - breed, g.rechts, g.onder);
      const gesloten = Boolean(rechter);
      // Een onderkant onder de haakjes (een kadertje rond een repetitieletter): in een van de rijen rond het eind van het
      // linker haakje is het grootste deel van de breedte zwart.
      const onderkant = [-1, 0, 1, 2].some((d) => {
        let n = 0;
        for (let x = g.links; x <= g.rechts; x += 1) if (zwart(x, g.onder + linker.lengte + d)) n += 1;
        return n >= (g.rechts - g.links + 1) * 0.6;
      });
      if (onderkant) continue;
      // Eindigt een haakje in een nootkop (een brede zwarte strook), dan zijn het de stokken van een groep onder een waardestreep.
      const kopAanEind = (h) => [-2, -1, 0, 1, 2].some((d) => {
        const dy = g.onder + h.lengte + d;
        let l = h.x;
        let r = h.x;
        while (zwart(l - 1, dy) && h.x - l < ia) l -= 1;
        while (zwart(r + 1, dy) && r - h.x < ia) r += 1;
        return r - l + 1 >= ia * 0.8;
      });
      if (kopAanEind(linker) || (rechter && kopAanEind(rechter))) continue;
      // Het haakje is zo breed als de zwarte pixels op halve hoogte vanaf linksX.
      const dyMidden = g.onder + Math.round(ia * 0.5);
      let haakRechts = linksX;
      while (zwart(haakRechts + 1, dyMidden)) haakRechts += 1;
      // Stap 3: de cijfers net rechts van het haakje, onder de lijn.
      const nummers = [];
      const lijnLinksY = rij(g.links, g.onder);
      const kandidaten = vormen.filter((v) => {
        const midden = (v.links + v.rechts) / 2;
        const h = (v.onder - v.boven + 1) / ia;
        return v.links > haakRechts && v.links <= g.links + 3.5 * ia && v.links <= g.rechts
          && v.boven > lijnLinksY && v.onder <= a + b * midden + 0.5 * ia
          && h >= 0.5 && h <= 2.2;
      }).sort((p, q) => p.links - q.links);
      // Zonder iets onder de lijn rechts van het haakje is het geen hokje (bij een triolenhaak staat het cijfer in de lijn). (Raakt
      // het cijfer van een hokje de lijn, dan valt het hokje ook weg; dat kwam op de gemeten bladen niet voor, valse
      // triolenhaken wel.)
      if (!kandidaten.length) continue;
      let zeker = kandidaten.length > 0;
      for (const vorm of kandidaten) {
        const isZwart = (x, y) => labels[y * breedte + x] === vorm.id;
        // Een cijfer is nooit een massief blok: een vorm die bijna helemaal gevuld is, is onleesbaar.
        let gevuld = 0;
        for (let yy = vorm.boven; yy <= vorm.onder; yy += 1) for (let xx = vorm.links; xx <= vorm.rechts; xx += 1) if (isZwart(xx, yy)) gevuld += 1;
        if (gevuld / ((vorm.rechts - vorm.links + 1) * (vorm.onder - vorm.boven + 1)) > 0.85) { zeker = false; break; }
        if ((vorm.rechts - vorm.links + 1) / (vorm.onder - vorm.boven + 1) < 0.5) { nummers.push(1); continue; }
        let beste = -1;
        let cijfer = null;
        for (const t of sjablonen) {
          const score = vergelijkVorm(isZwart, vorm, t);
          if (score > beste) { beste = score; cijfer = t.n; }
        }
        if (cijfer === null || beste < 0.75) { zeker = false; break; }
        nummers.push(cijfer);
      }
      const midden = (g.links + g.rechts) / 2;
      hokjes.push({
        links: g.links,
        rechts: g.rechts,
        y: a + b * midden + (g.boven + g.onder) / 2,
        nummers: zeker ? nummers : [],
        gesloten,
      });
    }
    return hokjes.sort((p, q) => p.links - q.links);
  });
}
