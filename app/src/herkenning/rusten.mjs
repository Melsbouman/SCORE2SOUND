// Herkenning, rusten (deel van de stap SYMBOLS bij Audiveris), in eigen code. Werkwijze:
// 1. Op het beeld zonder notenbalklijnen nemen we de losse vormen (vormen.mjs) in en rond de balk die niet bij een nootkop,
//    stok of maatstreep horen en niet in de sleutelzone staan.
// 2. Een meermaatsrust is een dikke balk (minstens tweeënhalve lijnafstand lang) precies op de middelste lijn. Die zoeken we
//    rechtstreeks per kolom (hij zit vaak vast aan de sleutel of een maatstreep, dan is het geen losse vorm). Een waardestreep
//    van achtsten op de middelste lijn heeft onderweg stokken; een meermaatsrust alleen een streepje aan beide uiteinden.
// 3. Een hele rust hangt als gevuld blokje onder de tweede lijn; een halve rust staat op de middelste lijn.
// 4. Kwart-, achtste-, zestiende- en tweeëndertigste rusten vergelijken we met de sjablonen uit Bravura, op dezelfde maat
//    geschaald als de vorm (lettertypen verschillen in de details, niet in de grote lijn). Voortekens vergelijken we mee als er
//    vlak rechts een nootkop staat: lijkt de vorm dan meer op een kruis dan op een rust, dan is het een voorteken. Zijn de
//    voortekens al gezocht (voortekens.mjs, optie `voortekens`), dan slaan we die vormen over; ook de balkkop (kop.mjs, optie
//    `balkkoppen`) bevat geen rusten.
// 5. Een vlag van een losse achtste of zestiende kan los van zijn stok raken (waar een notenbalklijn hem raakte) en lijkt dan
//    op een rust. Met de noten en hun stokken (optie `noten`, uit duren.mjs) slaan we een vorm vlak rechts naast het eind van
//    een stok over als hij op een vlag lijkt.
// 6. Een rust valt op een scan soms in stukken (het bolletje van een achtste rust los van de staart): stukken die elkaar
//    (bijna) raken, vergelijken we eerst samen.
// Uitkomst per balk: [{ x, soort, links, rechts }] met soort 'meermaats', 'heel', 'half', 'kwart', '8', '16' of '32' en
// x het midden.
import { vindVormen } from './vormen.mjs';
import { sjabloon, vergelijkVorm } from './sjablonen.mjs';

const RUSTEN = [['kwart', 'rust-kwart'], ['8', 'rust-8'], ['16', 'rust-16'], ['32', 'rust-32']];
// Cijfers staan niet midden in een maat op de balk (een 7 lijkt op een achtste rust); voortekens wel, vlak voor een kop.
const ANDERE = ['kruis', 'mol', 'herstel'];
const VLAGGEN = ['vlag-8-op', 'vlag-8-neer', 'vlag-16-op', 'vlag-16-neer'];
const GROEP_DREMPEL = 0.8;

export function zoekRusten(kaal, raster, schaal, { koppen = [], strepen = [], balkkoppen = null, voortekens = null, noten = null } = {}) {
  const ia = schaal.lijnafstand;
  const { breedte } = kaal;
  const { labels, vormen } = vindVormen(kaal, { minPixels: Math.round(ia * ia * 0.08) });
  const sjablonen = [
    ...RUSTEN.map(([soort, naam]) => ({ soort, rust: true, ...sjabloon(naam, ia) })),
    ...ANDERE.map((naam) => ({ soort: naam, rust: false, ...sjabloon(naam, ia) })),
  ];
  const vlaggen = VLAGGEN.map((naam) => sjabloon(naam, ia));
  const zwart = (x, y) => x >= 0 && x < breedte && y >= 0 && y < kaal.hoogte && kaal.pixels[y * breedte + x] === 1;
  return raster.balken.map((balk, b) => {
    const yOp = (stap, x) => balk.lijnen[0].a + balk.lijnen[0].b * x + (stap * ia) / 2;
    // Meermaatsrusten: per kolom de dikte van de zwarte strook door de middelste lijn.
    const balkenOpMidden = [];
    let begin = -1;
    const dikOpMidden = (x) => {
      const y = Math.round(yOp(4, x));
      if (!zwart(x, y)) return false;
      let o = y; let n = y;
      while (zwart(x, o - 1) && y - o < ia) o -= 1;
      while (zwart(x, n + 1) && n - y < ia) n += 1;
      const dikte = n - o + 1;
      return dikte >= ia * 0.35 && dikte <= ia * 1.2 && Math.abs((o + n) / 2 - y) <= ia * 0.3;
    };
    for (let x = Math.round(balk.links + ia * 2); x <= balk.rechts + 1; x += 1) {
      const dik = x <= balk.rechts && dikOpMidden(x);
      if (dik && begin < 0) begin = x;
      if (!dik && begin >= 0) {
        if (x - begin >= ia * 2.5) balkenOpMidden.push({ links: begin, rechts: x - 1 });
        begin = -1;
      }
    }
    // Stokken onderweg: kolommen binnen de balk (niet aan de uiteinden) waar een dunne strook boven of onder de balk ver doorloopt.
    const strookVan = (x) => {
      const y = Math.round(yOp(4, x));
      let o = y; while (zwart(x, o - 1) && y - o < ia * 5) o -= 1;
      let n = y; while (zwart(x, n + 1) && n - y < ia * 5) n += 1;
      return { o, n };
    };
    const strook = (x) => { const { o, n } = strookVan(x); return n - o; };
    // Een maatstreep loopt precies van de bovenste tot de onderste lijn (een stok naar een kop houdt ergens anders op).
    const maatstreep = (x) => {
      const { o, n } = strookVan(x);
      return Math.abs(o - yOp(0, x)) <= Math.max(2, ia * 0.25) && Math.abs(n - yOp(8, x)) <= Math.max(2, ia * 0.25);
    };
    // Aan de uiteinden heeft een meermaatsrust een streepje van een lijnafstand naar boven en naar beneden (samen twee
    // lijnafstanden). Een stok aan het eind van een waardestreep loopt veel verder door, naar zijn nootkop: dan zijn het
    // waardestrepen tussen twee stokken (een voorteken in een groep zestienden maakt dat stuk soms lang genoeg).
    const heeftStokken = (bar) => {
      for (let x = bar.links + Math.round(ia * 0.6); x <= bar.rechts - Math.round(ia * 0.6); x += 1) if (strook(x) >= ia * 2) return true;
      for (const kant of [bar.links, bar.rechts]) {
        for (let dx = -2; dx <= 2; dx += 1) if (strook(kant + dx) >= ia * 2.8 && !maatstreep(kant + dx)) return true;
      }
      return false;
    };
    const meermaats = balkenOpMidden.filter((bar) => !heeftStokken(bar));
    const bezet = (vorm) => (koppen[b] ?? []).some((kop) => kop.x >= vorm.links - ia * 0.3 && kop.x <= vorm.rechts + ia * 0.3
      && kop.y >= vorm.boven - ia * 0.3 && kop.y <= vorm.onder + ia * 0.3)
      || (strepen[b] ?? []).some((streep) => streep.links <= vorm.rechts && streep.rechts >= vorm.links)
      // Een vorm die (een stuk van) een voorteken is (voortekens.mjs), is geen rust.
      || (voortekens?.[b] ?? []).some((v) => v.links <= vorm.rechts && v.rechts >= vorm.links && v.boven <= vorm.onder && v.onder >= vorm.boven);
    const uit = [];
    // Sleutel, voortekening en maatsoort (kop.mjs) zijn geen rusten; zonder gelezen balkkop de eerste drie lijnafstanden.
    const kopEinde = balkkoppen?.[b]?.einde ?? balk.links + ia * 3;
    // Een vorm vlak rechts naast het eind van een stok (waar een vlag hangt) die op een vlag lijkt.
    const isVlag = (kader, isZwart) => (noten?.[b] ?? []).some((noot) => {
      const stok = noot.stok;
      if (!stok) return false;
      if (kader.links < stok.x - 2 || kader.links > stok.x + ia * 1.2) return false;
      const [van, tot] = stok.richting === 'op' ? [stok.eind - ia * 0.3, stok.eind + ia * 3] : [stok.eind - ia * 3, stok.eind + ia * 0.3];
      const samen = Math.min(tot, kader.onder) - Math.max(van, kader.boven);
      if (samen < (kader.onder - kader.boven + 1) * 0.5) return false;
      return vlaggen.some((t) => vergelijkVorm(isZwart, kader, t) >= 0.75);
    });
    // De soort van een vorm (of een paar stukken samen), of null.
    const soortVan = (kader, isZwart, pixels, drempel = 0.7) => {
      const x = (kader.links + kader.rechts) / 2;
      const w = (kader.rechts - kader.links + 1) / ia;
      const h = (kader.onder - kader.boven + 1) / ia;
      const midden = ((kader.boven + kader.onder) / 2 - yOp(0, x)) / (ia / 2); // in stappen
      const vulling = pixels / ((kader.rechts - kader.links + 1) * (kader.onder - kader.boven + 1));
      if (w >= 0.7 && w <= 1.7 && h >= 0.3 && h <= 0.75 && vulling >= 0.75) {
        // Bovenkant tegen de tweede lijn (stap 2): hele rust; onderkant op de middelste lijn (stap 4): halve rust.
        const bovenStap = (kader.boven - yOp(0, x)) / (ia / 2);
        const onderStap = (kader.onder - yOp(0, x)) / (ia / 2);
        if (Math.abs(bovenStap - 2) <= 0.6) return 'heel';
        if (Math.abs(onderStap - 4) <= 0.6) return 'half';
        return null;
      }
      if (h >= 1.2 && h <= 4.2 && w >= 0.35 && w <= 1.6 && midden >= 1 && midden <= 7) {
        if (isVlag(kader, isZwart)) return null;
        // Een voorteken staat vlak tegen de kop aan (tot een lijnafstand ertussen) en op dezelfde hoogte (een mol iets hoger).
        const midY = (kader.boven + kader.onder) / 2;
        const kopErnaast = (koppen[b] ?? []).some((kop) => {
          const gat = kop.x - ia * 0.6 - kader.rechts;
          return gat >= -ia * 0.2 && gat <= ia && midY - kop.y >= -ia * 0.9 && midY - kop.y <= ia * 0.4;
        });
        const beste = sjablonen.filter((t) => t.rust || kopErnaast)
          .map((t) => ({ t, score: vergelijkVorm(isZwart, kader, t) })).sort((p, q) => q.score - p.score)[0];
        if (!beste.t.rust || beste.score < drempel) return null;
        // Tussen achtste, zestiende en tweeëndertigste rust zegt de hoogte meer dan de vorm (lettertypen verschillen vooral in de
        // vorm van de haakjes): een achtste is ongeveer 1,7 lijnafstand hoog, een zestiende 2,7, een tweeëndertigste 3,7.
        if (['8', '16', '32'].includes(beste.t.soort)) return h < 2.25 ? '8' : h < 3.2 ? '16' : '32';
        return beste.t.soort;
      }
      return null;
    };
    const kandidaten = vormen.filter((vorm) => {
      const x = (vorm.links + vorm.rechts) / 2;
      if (x < kopEinde || x > balk.rechts) return false;
      if (vorm.onder < yOp(-1, x) || vorm.boven > yOp(9, x) || bezet(vorm)) return false;
      // De cijfers van een maatsoortwissel midden in de regel (kop.mjs) zijn geen rust.
      if ((balkkoppen?.[b]?.wissels ?? []).some((w) => x >= w.x && x <= w.rechts)) return false;
      // Recht boven of onder een nootkop staat in één stem geen rust (wel een tremolo of een accent).
      if ((koppen[b] ?? []).some((kop) => Math.abs(x - kop.x) <= ia * 0.6)) return false;
      return !meermaats.some((bar) => bar.links <= vorm.rechts && bar.rechts >= vorm.links);
    });
    // Stukken die elkaar (bijna) raken, als groepje.
    const ouder = kandidaten.map((_, i) => i);
    const wortel = (i) => (ouder[i] === i ? i : (ouder[i] = wortel(ouder[i])));
    const raak = Math.max(1, Math.round(ia * 0.15));
    for (let i = 0; i < kandidaten.length; i += 1) {
      for (let j = i + 1; j < kandidaten.length; j += 1) {
        const p = kandidaten[i];
        const q = kandidaten[j];
        if (q.links - p.rechts <= raak && p.links - q.rechts <= raak && q.boven - p.onder <= raak && p.boven - q.onder <= raak) ouder[wortel(j)] = wortel(i);
      }
    }
    const groepen = new Map();
    kandidaten.forEach((vorm, i) => { const w = wortel(i); if (!groepen.has(w)) groepen.set(w, []); groepen.get(w).push(vorm); });
    for (const groep of groepen.values()) {
      if (groep.length > 1) {
        const kader = {
          links: Math.min(...groep.map((v) => v.links)), rechts: Math.max(...groep.map((v) => v.rechts)),
          boven: Math.min(...groep.map((v) => v.boven)), onder: Math.max(...groep.map((v) => v.onder)),
        };
        const ids = new Set(groep.map((v) => v.id));
        // Een groepje moet duidelijker op een rust lijken dan een losse vorm (stukjes ruis bij elkaar lijken snel op iets).
        const soort = soortVan(kader, (x, y) => ids.has(labels[y * breedte + x]), groep.reduce((som, v) => som + v.pixels, 0), GROEP_DREMPEL);
        if (soort) {
          uit.push({ x: Math.round((kader.links + kader.rechts) / 2), soort, links: kader.links, rechts: kader.rechts });
          continue;
        }
      }
      for (const vorm of groep) {
        const soort = soortVan(vorm, (x, y) => labels[y * breedte + x] === vorm.id, vorm.pixels);
        if (soort) uit.push({ x: Math.round((vorm.links + vorm.rechts) / 2), soort, links: vorm.links, rechts: vorm.rechts });
      }
    }
    for (const bar of meermaats) uit.push({ x: Math.round((bar.links + bar.rechts) / 2), soort: 'meermaats', links: bar.links, rechts: bar.rechts });
    return uit.sort((p, q) => p.x - q.x);
  });
}
