// Herkenning, het cijfer bij een groep noten onder één waardestreep (triolen e.d.; deel van de stap SYMBOLS bij Audiveris), in
// eigen code. Werkwijze:
// 1. Op het beeld zonder notenbalklijnen nemen we eenmaal de losse vormen (vormen.mjs) van het hele blad.
// 2. Per balk nemen we de noten met een stok en een waardestreep (uit duren.mjs), op volgorde van x, en maken groepen: een noot
//    hoort bij de groep van de vorige als de streep van de vorige tot aan zijn stok loopt en de streep van de noot vanaf de stok
//    van de vorige (met een kleine marge).
// 3. Per groep van minstens twee noten zoeken we de vormen tussen de eerste en de laatste stok (een halve lijnafstand ruimer),
//    bij stokken omhoog net boven de streep, bij stokken omlaag net eronder, met een hoogte tussen 0,8 en 2,5 lijnafstand.
// 4. Elke kandidaat vergelijken we met de sjablonen van de cijfers 2 tot en met 7; de beste telt als score minstens 0,75 is.
//    De eerste kandidaat die telt, is het cijfer van de groep.
// Uitkomst per balk: [{ koppen, aantal, x }] met koppen de plekken (indexen in noten[b]) van de noten in de groep, aantal het
// cijfer en x het midden van het cijfer. Een balk zonder zulke groepen geeft een lege lijst.
import { vindVormen } from './vormen.mjs';
import { sjabloon, vergelijkVorm } from './sjablonen.mjs';

const CIJFERS = [2, 3, 4, 5, 6, 7];

export function leesTriolen(kaal, raster, schaal, noten) {
  const ia = schaal.lijnafstand;
  const m = Math.max(2, ia * 0.2);
  const { labels, vormen } = vindVormen(kaal, { minPixels: Math.max(2, Math.round(ia * ia * 0.04)) });
  return raster.balken.map((balk, b) => {
    const lijst = (noten && noten[b]) || [];
    const metBalk = [];
    lijst.forEach((noot, plek) => {
      if (noot && noot.balk && noot.stok) metBalk.push({ noot, plek });
    });
    metBalk.sort((p, q) => p.noot.x - q.noot.x);
    const groepen = [];
    for (const item of metBalk) {
      const groep = groepen[groepen.length - 1];
      const vorige = groep && groep[groep.length - 1].noot;
      if (vorige && vorige.balk.rechts >= item.noot.stok.x - m && item.noot.balk.links <= vorige.stok.x + m) groep.push(item);
      else groepen.push([item]);
    }
    const uitkomst = [];
    for (const groep of groepen) {
      if (groep.length < 2) continue;
      const stokken = groep.map((i) => i.noot.stok);
      const omhoog = stokken[0].richting === 'op';
      const van = stokken[0].x - ia * 0.5;
      const tot = stokken[stokken.length - 1].x + ia * 0.5;
      const eind = omhoog ? Math.min(...stokken.map((s) => s.eind)) : Math.max(...stokken.map((s) => s.eind));
      const kandidaten = vormen.filter((v) => {
        const midden = (v.links + v.rechts) / 2;
        const hoogte = (v.onder - v.boven + 1) / ia;
        if (midden < van || midden > tot || hoogte < 0.8 || hoogte > 2.5) return false;
        return omhoog
          ? v.onder <= eind + ia * 0.3 && v.onder >= eind - ia * 2
          : v.boven >= eind - ia * 0.3 && v.boven <= eind + ia * 2;
      }).sort((p, q) => p.links - q.links);
      for (const vorm of kandidaten) {
        const isZwart = (x, y) => labels[y * kaal.breedte + x] === vorm.id;
        let beste = -1;
        let cijfer = null;
        for (const n of CIJFERS) {
          const score = vergelijkVorm(isZwart, vorm, sjabloon('cijfer-' + n, ia));
          if (score > beste) { beste = score; cijfer = n; }
        }
        if (cijfer !== null && beste >= 0.75) {
          uitkomst.push({ koppen: groep.map((i) => i.plek), aantal: cijfer, x: (vorm.links + vorm.rechts) / 2 });
          break;
        }
      }
    }
    return uitkomst;
  });
}
