// Herkenning, stap HEADERS (naar het voorbeeld van Audiveris): sleutel, voortekening en maatsoort aan het begin van elke balk,
// in eigen code. Werkwijze:
// 1. Op het beeld zonder notenbalklijnen nemen we de losse vormen in en rond de balk, van links naar rechts.
// 2. De eerste vorm aan het begin van de balk is de sleutel. Welke sleutel het is, zeggen de hoogte en de plek: een G-sleutel
//    steekt boven en onder de balk uit, een F-sleutel hangt in de bovenste drie lijnen (met twee punten erachter), een
//    C-sleutel is precies zo hoog als de balk. Bij twijfel tussen F en C beslist het sjabloon uit Bravura.
// 3. Daarna de voortekening: kruisen of mollen, elk op zijn vaste plek (bij een G-sleutel kruisen op f, c, g, d, a, e, b en
//    mollen op b, e, a, d, g, c, f). Een vorm die niet op de volgende plek staat of geen voorteken is, hoort er niet meer bij.
// 4. De maatsoort: twee cijfers boven elkaar (de teller boven de middelste lijn, de noemer eronder), of een C (met of zonder
//    streep) midden op de balk. De cijfers vergelijken we met de sjablonen; de noemer is 1, 2, 4, 8 of 16.
// 5. Waar de laatste van die tekens ophoudt, begint de muziek (`einde`); daar zoeken de stappen hierna naar noten en rusten.
// Uitkomst per balk: { sleutel: { soort: 'G' | 'F' | 'C', lijn, links, rechts } | null, voortekening: { aantal, tekens },
// maatsoort: { teller, noemer, symbool? } | null, einde }. Aantal is positief voor kruisen en negatief voor mollen; lijn telt
// van onder (de G-sleutel staat op lijn 2).
import { vindVormen } from './vormen.mjs';
import { sjabloon, vergelijkVorm } from './sjablonen.mjs';
import { maakKopScore } from './koppen.mjs';

// Plekken (stap: 0 = bovenste lijn, oneven = tussenruimte) van de voortekening bij een G-sleutel; bij andere sleutels schuift
// alles mee.
const KRUISEN = [0, 3, -1, 2, 5, 1, 4];
// Bij een tenorsleutel beginnen de kruisen laag (anders zou de eerste boven de balk staan).
const KRUISEN_TENOR = [6, 2, 5, 1, 4, 0, 3];
const MOLLEN = [4, 1, 5, 2, 6, 3, 7];
// (Een noemer 1 komt in de praktijk niet voor; zonder 1 is een 4 met een afgeknipte punt geen 1.)
const NOEMERS = [2, 4, 8, 16];
const SYMBOLEN = ['maat-c', 'maat-alla-breve'];
const RUSTEN = ['rust-kwart', 'rust-8', 'rust-16', 'rust-32'];
// Welke cijfers passen bij de gaten die een cijfer heeft op het beeld met notenbalklijnen (de lijnen door het cijfer heen
// sluiten soms een open bocht, zoals bij een 2): een 9 heeft een gat boven, een 6 onder, een 8 en een 0 beide, een 3 geen.
// (Het kleine gat van een 8 valt soms onder de grens; een 8 mag daarom ook met één gat. Bij een 2 sluit de lijn onder het
// cijfer soms de golf in de voet af, en de lijn door het midden de bovenste bocht.)
const BIJ_GATEN = {
  geen: [1, 2, 3, 4, 5, 7], boven: [2, 4, 8, 9], onder: [2, 4, 5, 6, 8], beide: [0, 2, 8],
};

// De gaten (wit dat niet met de rand verbonden is) in een kader van een zwart-witbeeld: { boven, onder } of er een groot gat
// in de bovenste of onderste helft zit.
function gatenIn(zw, k, minGrootte) {
  const w = k.rechts - k.links + 3;
  const h = k.onder - k.boven + 3;
  const zwart = (x, y) => x > 0 && y > 0 && x < w - 1 && y < h - 1 && zw.pixels[(k.boven - 1 + y) * zw.breedte + k.links - 1 + x] === 1;
  const gezien = new Uint8Array(w * h);
  const uit = { boven: false, onder: false };
  let eerste = true;
  for (let y0 = 0; y0 < h; y0 += 1) {
    for (let x0 = 0; x0 < w; x0 += 1) {
      if (gezien[y0 * w + x0] || zwart(x0, y0)) continue;
      // Het eerste witte gebied (vanaf de hoek) is de buitenkant; elk volgend gebied is een gat.
      const stapel = [x0, y0];
      let aantal = 0;
      let somY = 0;
      while (stapel.length) {
        const y = stapel.pop();
        const x = stapel.pop();
        if (x < 0 || y < 0 || x >= w || y >= h || gezien[y * w + x] || zwart(x, y)) continue;
        gezien[y * w + x] = 1;
        aantal += 1;
        somY += y;
        stapel.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
      }
      if (!eerste && aantal >= minGrootte) {
        if ((somY / aantal - 1) / (h - 2) < 0.5) uit.boven = true; else uit.onder = true;
      }
      eerste = false;
    }
  }
  return uit;
}

// `zw` (het zwart-witbeeld met notenbalklijnen) is niet verplicht; het helpt cijfers die op elkaar lijken uit elkaar te houden.
// `gevonden` is de uitkomst van vindVormen op `kaal` ({ labels, vormen }), als die er al is.
export function leesBalkkoppen(kaal, raster, schaal, { zw = null, gevonden = null } = {}) {
  const ia = schaal.lijnafstand;
  const { breedte } = kaal;
  const { labels, vormen } = gevonden ?? vindVormen(kaal, { minPixels: Math.max(2, Math.round(ia * ia * 0.04)) });
  const cijfers = Array.from({ length: 10 }, (_, n) => ({ n, ...sjabloon(`cijfer-${n}`, ia) }));
  const sleutels = ['g', 'f', 'c'].map((s) => ({ soort: s.toUpperCase(), ...sjabloon(`sleutel-${s}`, ia) }));
  const tekens = ['kruis', 'mol', 'herstel'].map((naam) => ({ naam, ...sjabloon(naam, ia) }));
  const kopScore = maakKopScore(kaal, ia);
  const kopSjablonen = ['kop-zwart', 'kop-half', 'kop-heel'].map((naam) => sjabloon(naam, ia));

  return raster.balken.map((balk) => {
    const yOp = (stap, x) => balk.lijnen[0].a + balk.lijnen[0].b * x + (stap * ia) / 2;
    const stapVan = (y, x) => (y - yOp(0, x)) / (ia / 2);
    // Vormen bij deze balk: ze raken de balk (tot een halve lijnafstand erbuiten) en staan niet ver erboven of eronder.
    const bijBalk = vormen.filter((v) => {
      const x = (v.links + v.rechts) / 2;
      return v.rechts >= balk.links && v.links <= balk.rechts && v.onder >= yOp(-1, x) && v.boven <= yOp(9, x)
        && stapVan(v.boven, x) >= -8 && stapVan(v.onder, x) <= 16;
    });
    // Zonder sleutel weten we niet waar de muziek begint; dan slaan de stappen hierna de eerste drie lijnafstanden over.
    const uit = { sleutel: null, voortekening: { aantal: 0, tekens: [] }, maatsoort: null, einde: Math.round(balk.links + ia * 3) };

    // 1. Sleutel: de vorm die als eerste begint, binnen twee lijnafstanden van het begin van de balk, samen met de vormen die
    // vlak daarna beginnen en niet verder reiken dan een sleutel breed is (het weghalen van de notenbalklijnen knipt de dunne
    // delen van een sleutel soms los).
    const eerste = bijBalk.filter((v) => v.links <= balk.links + ia * 2 && v.rechts - v.links >= ia * 0.5)
      .sort((p, q) => p.links - q.links)[0];
    if (!eerste) return uit;
    // Zit de sleutel vast aan iets anders (een meermaatsrust, een maatstreep), dan tellen alleen de eerste drie lijnafstanden.
    const grens = eerste.links + Math.round(ia * 3.2);
    const delen = bijBalk.filter((v) => v.id === eerste.id || (v.links >= eerste.links - 1 && v.links <= eerste.links + ia * 1.5 && v.rechts <= grens));
    const sleutelRechts = Math.min(grens, Math.max(...delen.map((v) => v.rechts)));
    const sleutelIds = new Set(delen.map((v) => v.id));
    const inSleutel = (x, y) => x <= sleutelRechts && sleutelIds.has(labels[y * breedte + x]);
    const kader = { links: eerste.links, rechts: sleutelRechts, boven: Infinity, onder: -Infinity };
    // Boven- en onderkant binnen de (eventueel afgekapte) breedte.
    for (let y = Math.min(...delen.map((v) => v.boven)); y <= Math.max(...delen.map((v) => v.onder)); y += 1) {
      for (let x = kader.links; x <= kader.rechts; x += 1) {
        if (!inSleutel(x, y)) continue;
        if (y < kader.boven) kader.boven = y;
        if (y > kader.onder) kader.onder = y;
      }
    }
    const xm = (kader.links + kader.rechts) / 2;
    const boven = stapVan(kader.boven, xm);
    const onder = stapVan(kader.onder, xm);
    const scores = Object.fromEntries(sleutels.map((t) => [t.soort, vergelijkVorm(inSleutel, kader, t)]));
    let soort = null;
    if (boven <= -1.2 && onder >= 9.5 && onder - boven >= 10.5) soort = 'G';
    else if (onder - boven >= 5.5 && onder - boven <= 9.8 && boven >= -2.6 && onder <= 10.5) soort = scores.F >= scores.C ? 'F' : 'C';
    if (!soort || scores[soort] < 0.55) return uit;
    // De lijn van de sleutel (van onder geteld): G op de tweede, F op de vierde; een C-sleutel staat met zijn midden op een lijn.
    let lijn = soort === 'G' ? 2 : 4;
    if (soort === 'C') lijn = 5 - Math.round((boven + onder) / 4);
    let rechts = kader.rechts;
    // De punten van een F-sleutel: kleine vormen vlak erachter.
    if (soort === 'F') {
      for (const v of bijBalk) {
        if (v.links > rechts && v.links - rechts <= ia * 0.7 && v.rechts - v.links <= ia * 0.6 && v.onder - v.boven <= ia * 0.6) rechts = Math.max(rechts, v.rechts);
      }
    }
    uit.sleutel = { soort, lijn, links: kader.links, rechts };
    uit.einde = rechts + 1;
    // Hoeveel stappen de vaste plekken verschuiven ten opzichte van een G-sleutel (een vioolsleutel op lijn 2).
    // (Een octaaf is zeven stappen; een altsleutel schuift één stap, een tenorsleutel min één.)
    const c4 = soort === 'G' ? 10 : soort === 'F' ? -2 : 2 * (5 - lijn);
    const schuif = ((((c4 - 10) % 7) + 10) % 7) - 3;

    // De volgende vormen, van links naar rechts, die na de sleutel beginnen (en niet aan de sleutel vastzitten). Ze moeten tot
    // binnen de balk reiken: een stuk tekst of een dynamiekteken dat net de bovenste of onderste lijn raakt, telt niet mee.
    const daarna = bijBalk.filter((v) => {
      const x = (v.links + v.rechts) / 2;
      return !sleutelIds.has(v.id) && v.links > rechts && v.onder >= yOp(0.5, x) && v.boven <= yOp(7.5, x);
    }).sort((p, q) => p.links - q.links);
    let i = 0;
    let vorigeRechts = rechts;

    // 2. Voortekening.
    // Het kader van een paar vormen samen, en of een pixel bij die vormen hoort.
    const kaderVan = (deel) => ({
      links: Math.min(...deel.map((v) => v.links)), rechts: Math.max(...deel.map((v) => v.rechts)),
      boven: Math.min(...deel.map((v) => v.boven)), onder: Math.max(...deel.map((v) => v.onder)),
    });
    const bijVormen = (deel) => {
      const ids = new Set(deel.map((v) => v.id));
      return (x, y) => ids.has(labels[y * breedte + x]);
    };
    let voorteken = null;
    while (i < daarna.length && uit.voortekening.tekens.length < 7) {
      if (daarna[i].links - vorigeRechts > ia * 2) break;
      // Op een scan valt een voorteken soms in stukken (de buik van een mol los van de stok, waar de notenbalklijn hem raakte).
      // Daarom proberen we ook twee of drie vormen naast elkaar samen, zolang ze samen zo smal zijn als één voorteken.
      const k = uit.voortekening.tekens.length;
      let beste = null;
      for (let n = 1; n <= 3 && i + n <= daarna.length; n += 1) {
        const deel = daarna.slice(i, i + n);
        const kader = kaderVan(deel);
        const w = (kader.rechts - kader.links + 1) / ia;
        const h = (kader.onder - kader.boven + 1) / ia;
        if (w > 1.4) break;
        if (w < 0.4 || h < 1.7 || h > 3.4) continue;
        const isZwart = bijVormen(deel);
        const best = tekens.map((t) => ({ t, score: vergelijkVorm(isZwart, kader, t) })).sort((p, q) => q.score - p.score)[0];
        if (best.t.naam === 'herstel' || best.score < 0.6 || (voorteken && best.t.naam !== voorteken)) continue;
        // De plek van het teken: bij een kruis het midden, bij een mol de buik (het anker van het sjabloon, naar verhouding).
        const t = best.t;
        const ankerY = kader.boven + (t.ankerY / t.hoogte) * (kader.onder - kader.boven + 1);
        const stap = stapVan(ankerY, (kader.links + kader.rechts) / 2);
        const plek = t.naam === 'mol' ? MOLLEN[k] + schuif : soort === 'C' && lijn === 4 ? KRUISEN_TENOR[k] : KRUISEN[k] + schuif;
        if (Math.abs(stap - plek) > 0.8) continue;
        if (!beste || best.score > beste.score) beste = { n, kader, soort: t.naam, plek, score: best.score };
      }
      if (!beste) break;
      voorteken = beste.soort;
      uit.voortekening.tekens.push({ soort: beste.soort, stap: beste.plek, links: beste.kader.links, rechts: beste.kader.rechts, delen: beste.n });
      vorigeRechts = beste.kader.rechts;
      i += beste.n;
    }
    // Staat er vlak na het laatste teken (tot ongeveer 0,3 lijnafstand) een nootkop op dezelfde plek, dan is het een voorteken
    // van die noot (een mol voor de eerste noot van de regel), geen deel van de voortekening. Na een voortekening staat de
    // eerste noot verder weg.
    const laatste = uit.voortekening.tekens.at(-1);
    if (laatste) {
      const y = Math.round(yOp(laatste.stap, laatste.rechts));
      let noot = false;
      for (let x = laatste.rechts + 1; x <= laatste.rechts + Math.round(ia * 0.3) && !noot; x += 1) {
        noot = kopSjablonen.some((t) => kopScore(t, x, y) >= 0.78);
      }
      if (noot) {
        uit.voortekening.tekens.pop();
        i -= laatste.delen;
        vorigeRechts = uit.voortekening.tekens.at(-1)?.rechts ?? rechts;
        if (!uit.voortekening.tekens.length) voorteken = null;
      }
    }
    const aantalTekens = uit.voortekening.tekens.length;
    uit.voortekening.aantal = voorteken === 'kruis' || aantalTekens === 0 ? aantalTekens : -aantalTekens;
    uit.einde = vorigeRechts + 1;

    // 3. Maatsoort: de eerste vorm hierna, met de vormen die erboven of eronder staan (de cijfers delen hun kolommen) of er met
    // een kleine opening naast staan (het tweede cijfer van 16, of een stuk van een C dat het weghalen van de lijnen losknipte).
    const begin = daarna[i];
    if (begin && begin.links - vorigeRechts <= ia * 2.5) {
      const groep = [begin];
      for (const v of daarna.slice(i + 1)) {
        const g = kaderVan(groep);
        if (v.links > g.rechts + ia * 0.4) break;
        // Erboven of eronder (de kolommen delen), of ernaast met een kleine opening als het stuk niet te laag en niet plat is
        // (een stukje boog of overbinding naast de cijfers hoort er niet bij).
        const samen = Math.min(v.rechts, g.rechts) - Math.max(v.links, g.links) + 1;
        const w = v.rechts - v.links + 1;
        const h = v.onder - v.boven + 1;
        if (samen >= Math.min(w, g.rechts - g.links + 1) * 0.3 || (h >= ia * 0.6 && w <= h * 1.5)) groep.push(v);
      }
      const g = kaderVan(groep);
      const gm = (g.links + g.rechts) / 2;
      const gb = stapVan(g.boven, gm);
      const go = stapVan(g.onder, gm);
      const breed = (g.rechts - g.links + 1) / ia;
      const inGroep = bijVormen(groep);
      const midden = yOp(4, gm);
      // Het kader van het zwart in een strook (boven of onder de middelste lijn) en een paar kolommen.
      const kaderIn = (y0, y1, x0 = g.links, x1 = g.rechts) => {
        const k = { links: Infinity, rechts: -Infinity, boven: Infinity, onder: -Infinity };
        for (let y = Math.max(g.boven, Math.ceil(y0)); y <= Math.min(g.onder, Math.floor(y1)); y += 1) {
          for (let x = x0; x <= x1; x += 1) {
            if (!inGroep(x, y)) continue;
            if (x < k.links) k.links = x;
            if (x > k.rechts) k.rechts = x;
            if (y < k.boven) k.boven = y;
            if (y > k.onder) k.onder = y;
          }
        }
        return k.links <= k.rechts ? k : null;
      };
      // Eén cijfer, of twee naast elkaar (een 12) als het getal breder is dan één cijfer: dan splitsen we bij de witte kolom
      // die het dichtst bij het midden ligt. (Binnen één cijfer kan ook een witte kolom zitten: op een scan haalt het weghalen
      // van de notenbalklijnen soms een stukje van een 3 weg.)
      const cijfersIn = (k) => {
        if (k.rechts - k.links + 1 <= ia * 2.2) return [k];
        const m = (k.links + k.rechts) / 2;
        let beste = null;
        for (let x = k.links + 1; x < k.rechts; x += 1) {
          let raak = false;
          for (let y = k.boven; y <= k.onder && !raak; y += 1) raak = inGroep(x, y);
          if (!raak && (beste === null || Math.abs(x - m) < Math.abs(beste - m))) beste = x;
        }
        return beste === null ? [k] : [{ ...k, rechts: beste - 1 }, { ...k, links: beste + 1 }];
      };
      // Een getal in een strook van de balk (van stap `van` tot `tot`): elk cijfer is ongeveer twee lijnafstanden hoog, niet
      // te smal (een stok is geen 1), en lijkt duidelijk op een cijfer uit het sjabloon.
      const leesGetal = (k, van, tot, toegestaan) => {
        if (!k) return null;
        if (Math.abs(stapVan(k.boven, gm) - van) > 1 || Math.abs(stapVan(k.onder, gm) - tot) > 1) return null;
        let getal = '';
        const delen = cijfersIn(k);
        for (const [plek, deel] of delen.entries()) {
          const dk = kaderIn(k.boven, k.onder, deel.links, deel.rechts);
          if (!dk || (dk.rechts - dk.links + 1) < ia * 0.55 || (dk.onder - dk.boven + 1) < ia * 1.4) return null;
          // Eerst de cijfers die op deze plek kunnen staan (bij de noemer: 2, 4, 8 of de 1 en 6 van 16) en die bij de gaten passen
          // (als het beeld met lijnen er is), dan het best passende sjabloon.
          let mogelijk = toegestaan
            ? cijfers.filter((c) => toegestaan.some((t) => String(t).length === delen.length && String(t)[plek] === String(c.n)))
            : cijfers;
          if (zw) {
            const gaten = gatenIn(zw, dk, ia * ia * 0.1);
            const soort = gaten.boven && gaten.onder ? 'beide' : gaten.boven ? 'boven' : gaten.onder ? 'onder' : 'geen';
            mogelijk = mogelijk.filter((c) => BIJ_GATEN[soort].includes(c.n));
          }
          const kansen = mogelijk.map((c) => ({ n: c.n, score: vergelijkVorm(inGroep, dk, c), streng: vergelijkVorm(inGroep, dk, c, { streng: true }) })).sort((p, q) => q.score - p.score);
          if (!kansen.length) return null;
          // Zeker genoeg: een hoge score, of een iets lagere met een duidelijke voorsprong op het volgende cijfer (op een vage scan
          // liggen een 3 en een 9 of een 3 en een 5 dicht bij elkaar; dan liever geen maatsoort dan een verkeerde).
          const [beste, tweede] = kansen;
          if (beste.score < 0.85 || (beste.score < 0.9 && tweede && beste.score - tweede.score < 0.05)) return null;
          getal += String(kansen[0].n);
        }
        const n = Number(getal);
        if (!getal || n < 1 || n > 16 || (toegestaan && !toegestaan.includes(n))) return null;
        return n;
      };
      if (gb >= -1.2 && gb <= 1 && go >= 7 && go <= 9.2 && breed <= 4) {
        const teller = leesGetal(kaderIn(g.boven, midden - 1), 0, 4, null);
        const noemer = leesGetal(kaderIn(midden + 1, g.onder), 4, 8, NOEMERS);
        // (1/1 komt niet voor; dat is een half gelezen 16.)
        if (teller && noemer && !(teller === 1 && noemer === 1)) uit.maatsoort = { teller, noemer };
      } else if (groep.length <= 5 && breed >= 1.1 && breed <= 2.2 && Math.abs((gb + go) / 2 - 4) <= 0.8 && go - gb >= 3 && go - gb <= 7) {
        // Een C (vier kwart) of een C met een streep erdoor (twee halve), midden op de balk. Een rust aan het begin van de regel
        // staat op dezelfde plek; die moet minder goed passen dan de C.
        const kansen = [...SYMBOLEN, ...RUSTEN].map((naam) => ({ naam, score: vergelijkVorm(inGroep, g, sjabloon(naam, ia)) }))
          .sort((p, q) => q.score - p.score);
        const [best, tweede] = kansen;
        if (best.score >= 0.75 && best.score - tweede.score >= 0.04) {
          if (best.naam === 'maat-c') uit.maatsoort = { teller: 4, noemer: 4, symbool: 'C' };
          if (best.naam === 'maat-alla-breve') uit.maatsoort = { teller: 2, noemer: 2, symbool: 'alla-breve' };
        }
      }
      if (uit.maatsoort) uit.einde = g.rechts + 1;
    }
    uit.voortekening.tekens = uit.voortekening.tekens.map(({ delen, ...teken }) => teken);
    return uit;
  });
}
