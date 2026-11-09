// Herkenning, voortekens bij noten (deel van de stap SYMBOLS bij Audiveris), in eigen code. Werkwijze:
// 1. Op het beeld zonder notenbalklijnen nemen we de losse vormen rond de balk, na de balkkop (kop.mjs). Een vorm die zo groot
//    is als een voorteken (anderhalf tot drieënhalf lijnafstand hoog en hooguit anderhalf breed) en geen nootkop, stok of rust
//    bevat, is een kandidaat.
// 2. We vergelijken hem met de sjablonen voor kruis, mol en herstel uit Bravura, op hetzelfde kader geschaald (lettertypen
//    verschillen in de details, niet in de grote lijn), en ook met de rusten: een rust vlak voor een noot lijkt soms op een
//    voorteken, en moet dan beter op een rust lijken. Deze stap draait vóór de rusten (rusten.mjs slaat de voortekens over).
// 3. Een voorteken hoort bij de nootkop rechts ervan op dezelfde hoogte: bij een kruis of herstel het midden van het teken,
//    bij een mol de buik (onderaan). In een akkoord staan voortekens soms verder naar links verschoven; daarom mag er tot
//    bijna twee lijnafstanden tussen zitten.
// 4. Een voorteken tussen haakjes (een herinnering) heeft links en rechts een smalle, hoge boog.
// Uitkomst per balk: [{ kop, soort, haakjes, links, rechts, boven, onder }], met kop de plek van de nootkop in koppen[b] en
// soort 'kruis', 'mol' of 'herstel'.
import { vindVormen } from './vormen.mjs';
import { sjabloon, vergelijkVorm } from './sjablonen.mjs';

const SOORTEN = ['kruis', 'mol', 'herstel'];
const RUSTEN = ['rust-kwart', 'rust-8', 'rust-16'];

// `gevonden` is de uitkomst van vindVormen op `kaal` ({ labels, vormen }), als die er al is.
export function zoekVoortekens(kaal, raster, schaal, { koppen = [], rusten = [], balkkoppen = null, gevonden = null } = {}) {
  const ia = schaal.lijnafstand;
  const { breedte } = kaal;
  const { labels, vormen } = gevonden ?? vindVormen(kaal, { minPixels: Math.max(2, Math.round(ia * ia * 0.04)) });
  const sjablonen = [...SOORTEN, ...RUSTEN].map((naam) => ({ naam, ...sjabloon(naam, ia) }));
  const kopBreedte = { zwart: sjabloon('kop-zwart', ia).breedte, half: sjabloon('kop-half', ia).breedte, heel: sjabloon('kop-heel', ia).breedte };

  return raster.balken.map((balk, b) => {
    const yOp = (stap, x) => balk.lijnen[0].a + balk.lijnen[0].b * x + (stap * ia) / 2;
    const kopEinde = balkkoppen?.[b]?.einde ?? balk.links + ia * 3;
    const noten = koppen[b] ?? [];
    const rustenHier = rusten[b] ?? [];
    const bijBalk = vormen.filter((v) => {
      const x = (v.links + v.rechts) / 2;
      return x > kopEinde && x <= balk.rechts && v.onder >= yOp(-6, x) && v.boven <= yOp(14, x);
    });
    // Smalle, hoge vormen: haakjes rond een voorteken.
    const haakjes = bijBalk.filter((v) => {
      const w = (v.rechts - v.links + 1) / ia;
      const h = (v.onder - v.boven + 1) / ia;
      return w <= 0.5 && h >= 1.2 && h <= 3.4;
    });

    // Stukken die een voorteken kunnen zijn (of een deel ervan): niet te groot, geen nootkop erin (dan is het een noot met
    // stok), niet op de plek van een rust.
    const stukken = bijBalk.filter((v) => (v.rechts - v.links + 1) <= ia * 1.5 && (v.onder - v.boven + 1) <= ia * 3.6
      && !noten.some((kop) => kop.x >= v.links && kop.x <= v.rechts && kop.y >= v.boven && kop.y <= v.onder)
      && !rustenHier.some((rust) => rust.links <= v.rechts && rust.rechts >= v.links));
    // Het weghalen van de notenbalklijnen knipt soms een voorteken in stukken (de buik van een mol raakt de stok precies op een
    // lijn). Stukken die elkaar (bijna) raken, nemen we daarom ook samen.
    const ouder = stukken.map((_, i) => i);
    const wortel = (i) => (ouder[i] === i ? i : (ouder[i] = wortel(ouder[i])));
    const raak = Math.max(1, Math.round(ia * 0.12));
    for (let i = 0; i < stukken.length; i += 1) {
      for (let j = i + 1; j < stukken.length; j += 1) {
        const p = stukken[i];
        const q = stukken[j];
        if (q.links - p.rechts <= raak && p.links - q.rechts <= raak && q.boven - p.onder <= raak && p.boven - q.onder <= raak) ouder[wortel(j)] = wortel(i);
      }
    }
    const groepen = new Map();
    stukken.forEach((v, i) => { const w = wortel(i); if (!groepen.has(w)) groepen.set(w, []); groepen.get(w).push(v); });
    const kaderVan = (deel) => ({
      links: Math.min(...deel.map((v) => v.links)), rechts: Math.max(...deel.map((v) => v.rechts)),
      boven: Math.min(...deel.map((v) => v.boven)), onder: Math.max(...deel.map((v) => v.onder)),
    });
    const past = (k) => {
      const w = (k.rechts - k.links + 1) / ia;
      const h = (k.onder - k.boven + 1) / ia;
      return w >= 0.4 && w <= 1.5 && h >= 1.5 && h <= 3.6;
    };
    // Mogelijke tekens: elke groep als geheel, en elk stuk apart.
    const mogelijk = [];
    for (const groep of groepen.values()) {
      if (groep.length > 1 && past(kaderVan(groep))) mogelijk.push(groep);
      for (const v of groep) if (past(v)) mogelijk.push([v]);
    }

    const kandidaten = [];
    for (const deel of mogelijk) {
      const v = kaderVan(deel);
      const ids = new Set(deel.map((stuk) => stuk.id));
      const isZwart = (x, y) => ids.has(labels[y * breedte + x]);
      const kansen = sjablonen.map((t) => ({ t, score: vergelijkVorm(isZwart, v, t) })).sort((p, q) => q.score - p.score);
      const [best] = kansen;
      if (best.score < 0.65 || !SOORTEN.includes(best.t.naam)) continue;
      // De hoogte waar het teken bij hoort: het anker van het sjabloon, naar verhouding van de hoogte van de vorm.
      const ankerY = v.boven + (best.t.ankerY / best.t.hoogte) * (v.onder - v.boven + 1);
      // De nootkop rechts ervan op (bijna) dezelfde hoogte; bij meer keuze de dichtstbijzijnde.
      let beste = null;
      for (let k = 0; k < noten.length; k += 1) {
        const kop = noten[k];
        const kopLinks = kop.x - (kopBreedte[kop.soort] ?? kopBreedte.zwart) / 2;
        const gat = kopLinks - v.rechts;
        const dy = Math.abs(kop.y - ankerY);
        if (gat < -ia * 0.3 || gat > ia * 1.9 || dy > ia * 0.6) continue;
        const afstand = dy / ia + gat / ia / 4;
        if (!beste || afstand < beste.afstand) beste = { k, afstand };
      }
      if (!beste) continue;
      kandidaten.push({ kop: beste.k, soort: best.t.naam, score: best.score, afstand: beste.afstand, ids, ...v });
    }
    // Kandidaten die stukken delen (een groep en een stuk eruit): de best passende blijft.
    kandidaten.sort((p, q) => q.score - p.score);
    const zonderDubbel = [];
    for (const kandidaat of kandidaten) {
      if (!zonderDubbel.some((ander) => [...kandidaat.ids].some((id) => ander.ids.has(id)))) zonderDubbel.push(kandidaat);
    }
    kandidaten.length = 0;
    kandidaten.push(...zonderDubbel);
    // Eén voorteken per nootkop: bij twee de dichtstbijzijnde.
    kandidaten.sort((p, q) => p.afstand - q.afstand);
    const gekozen = [];
    for (const kandidaat of kandidaten) if (!gekozen.some((ander) => ander.kop === kandidaat.kop)) gekozen.push(kandidaat);
    return gekozen.map(({ kop, soort, links, rechts, boven, onder }) => {
      const midden = (boven + onder) / 2;
      // Haakjes: een smalle boog vlak links en een vlak rechts van het teken, op dezelfde hoogte. Het kader van het teken
      // neemt de haakjes dan mee (zodat rusten.mjs een haakje niet als rust ziet).
      const naast = (kant) => haakjes.find((h) => {
        const gat = kant < 0 ? links - h.rechts : h.links - rechts;
        return gat >= -1 && gat <= ia * 0.5 && Math.abs((h.boven + h.onder) / 2 - midden) <= ia * 0.8;
      });
      const [voor, na] = [naast(-1), naast(1)];
      if (voor && na) {
        return { kop, soort, haakjes: true, links: voor.links, rechts: na.rechts, boven: Math.min(boven, voor.boven, na.boven), onder: Math.max(onder, voor.onder, na.onder) };
      }
      return { kop, soort, haakjes: false, links, rechts, boven, onder };
    }).sort((p, q) => p.links - q.links);
  });
}
