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
//    Staan er duidelijk twee cijfers boven elkaar maar lijken ze op een vage scan te veel op andere cijfers (een 2 op een 9, een
//    3 op een 5), dan geven we de maatsoorten die erop lijken mee (`maatsoortOpties`); de opbouw kiest daaruit met de lengte
//    van de maten. Ook bij zeker gelezen cijfers gaan die opties mee (een 2 kan toch een 9 blijken).
// 5. Waar de laatste van die tekens ophoudt, begint de muziek (`einde`); daar zoeken de stappen hierna naar noten en rusten.
// 6. Midden in de regel, direct na een maatstreep: een nieuwe maatsoort, en na een dubbele streep (of eind- of herhaalstreep)
//    ook een nieuwe voortekening (herstellingstekens op de plekken van de oude tekens, dan eventueel nieuwe kruisen of mollen).
// Uitkomst per balk: { sleutel: { soort: 'G' | 'F' | 'C', lijn, links, rechts } | null, voortekening: { aantal, tekens },
// maatsoort: { teller, noemer, symbool? } | null, maatsoortOpties?: [{ teller, noemer }] (bij cijfers: wat er ook op lijkt,
// een zekere maatsoort vooraan), einde, wissels: [{ x, rechts, maatsoort?, maatsoortOpties?, voortekening? }] }. Aantal is
// positief voor kruisen en negatief voor mollen; lijn telt van onder (de G-sleutel staat op lijn 2). Een wissel is een nieuwe
// maatsoort en/of voortekening midden in de regel, van x (de maatstreep ervoor) tot rechts.
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
// Het onderste deel van een sjabloon, `hoogte` pixels hoog: voor een mol waarvan de stok op een vage scan bijna wegvalt.
const onderDeel = (t, hoogte) => {
  const van = t.hoogte - Math.min(t.hoogte, hoogte);
  return { ...t, hoogte: t.hoogte - van, pixels: t.pixels.subarray(van * t.breedte), ankerY: t.ankerY - van };
};
const SYMBOLEN = ['maat-c', 'maat-alla-breve'];
const RUSTEN = ['rust-kwart', 'rust-8', 'rust-16', 'rust-32'];
// Welke cijfers passen bij de gaten die een cijfer heeft op het beeld met notenbalklijnen (de lijnen door het cijfer heen
// sluiten soms een open bocht, zoals bij een 2): een 9 heeft een gat boven, een 6 onder, een 8 en een 0 beide, een 3 geen.
// (Het kleine gat van een 8 valt soms onder de grens; een 8 mag daarom ook met één gat. Bij een 2 sluit de lijn onder het
// cijfer soms de golf in de voet af, en de lijn door het midden de bovenste bocht.)
const BIJ_GATEN = {
  geen: [1, 2, 3, 4, 5, 7], boven: [2, 4, 8, 9], onder: [2, 4, 5, 6, 8], beide: [0, 2, 8],
};

// De gaten (wit dat niet met de rand verbonden is) in een kader: { boven, onder } of er een groot gat in de bovenste of
// onderste helft zit. `isZwart(x, y)` zegt of een pixel van het blad zwart is.
function gatenIn(isZwart, k, minGrootte) {
  const w = k.rechts - k.links + 3;
  const h = k.onder - k.boven + 3;
  const zwart = (x, y) => x > 0 && y > 0 && x < w - 1 && y < h - 1 && isZwart(k.links - 1 + x, k.boven - 1 + y);
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
// `strepen` (per balk de maatstrepen uit maten.mjs) maakt dat ook een maatsoortwissel midden in de regel gelezen wordt (`wissels`).
export function leesBalkkoppen(kaal, raster, schaal, { zw = null, gevonden = null, strepen = null } = {}) {
  const ia = schaal.lijnafstand;
  const { breedte } = kaal;
  const { labels, vormen } = gevonden ?? vindVormen(kaal, { minPixels: Math.max(2, Math.round(ia * ia * 0.04)) });
  const cijfers = Array.from({ length: 10 }, (_, n) => ({ n, ...sjabloon(`cijfer-${n}`, ia) }));
  const sleutels = ['g', 'f', 'c'].map((s) => ({ soort: s.toUpperCase(), ...sjabloon(`sleutel-${s}`, ia) }));
  const tekens = ['kruis', 'mol', 'herstel'].map((naam) => ({ naam, ...sjabloon(naam, ia) }));
  const molSjabloon = tekens[1];
  // Het midden van de buik van een mol: de rijen waar de vorm minstens 0,6 keer zo breed is als het kader.
  const buikVan = (isZwart, kader) => {
    const w = kader.rechts - kader.links + 1;
    let som = 0;
    let aantal = 0;
    for (let y = kader.boven; y <= kader.onder; y += 1) {
      let l = Infinity;
      let r = -Infinity;
      for (let x = kader.links; x <= kader.rechts; x += 1) {
        if (isZwart(x, y)) { if (x < l) l = x; r = x; }
      }
      if (r - l + 1 >= w * 0.6) { som += y; aantal += 1; }
    }
    return aantal ? som / aantal : null;
  };
  // Waar de buik van het mol-sjabloon zit ten opzichte van zijn anker.
  const molBuik = buikVan((x, y) => molSjabloon.pixels[y * molSjabloon.breedte + x] === 1,
    { links: 0, rechts: molSjabloon.breedte - 1, boven: 0, onder: molSjabloon.hoogte - 1 }) - molSjabloon.ankerY;
  const kopScore = maakKopScore(kaal, ia);
  const kopSjablonen = ['kop-zwart', 'kop-half', 'kop-heel'].map((naam) => sjabloon(naam, ia));

  return raster.balken.map((balk, b) => {
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
    // De vaste plek van het k-de kruis of de k-de mol van een voortekening bij deze sleutel.
    const plekVan = (naam, k) => (naam === 'mol' ? MOLLEN[k] + schuif : soort === 'C' && lijn === 4 ? KRUISEN_TENOR[k] : KRUISEN[k] + schuif);
    // Eén teken vanaf vorm j in `lijst`: het best passende sjabloon moet een van `namen` zijn en op `plek(naam)` staan. Op een
    // scan valt een voorteken soms in stukken (de buik van een mol los van de stok, waar de notenbalklijn hem raakte); daarom
    // proberen we ook twee tot vijf vormen naast elkaar samen, zolang ze samen zo smal zijn als één voorteken.
    // Op een vage scan is de stok van een mol soms veel korter of langer dan in het sjabloon; daarom telt bij een mol ook de
    // plek van de buik, en na een eerste mol mag een volgende mol ook alleen een buik met een stukje stok zijn (dan vergelijken
    // we met het onderste deel van het sjabloon, en moet het duidelijk lijken).
    // Geeft { n (aantal vormen), kader, soort, plek, score } of null.
    const leesTeken = (lijst, j, namen, plek) => {
      let beste = null;
      for (let n = 1; n <= 5 && j + n <= lijst.length; n += 1) {
        const deel = lijst.slice(j, j + n);
        const kader = kaderVan(deel);
        const w = (kader.rechts - kader.links + 1) / ia;
        const h = (kader.onder - kader.boven + 1) / ia;
        if (w > 1.4) break;
        const kort = h < 1.7;
        if (w < 0.4 || h < 1.1 || h > 3.4 || (kort && (w < 0.65 || !(namen.length === 1 && namen[0] === 'mol')))) continue;
        const isZwart = bijVormen(deel);
        const kandidaten = kort ? [onderDeel(molSjabloon, kader.onder - kader.boven + 1)] : tekens;
        const best = kandidaten.map((t) => ({ t, score: vergelijkVorm(isZwart, kader, t) })).sort((p, q) => q.score - p.score)[0];
        if (!namen.includes(best.t.naam) || best.score < (kort ? 0.75 : 0.6)) continue;
        // Een zwarte nootkop waarvan de stok wegviel, lijkt ook op het onderste deel van een mol (maar is gevuld).
        if (kort && zwarteKopIn(kader)) continue;
        // De plek van het teken: bij een kruis en een herstellingsteken het midden, bij een mol de buik (het anker van het
        // sjabloon, naar verhouding, of bij een hele mol het midden van de brede rijen).
        const t = best.t;
        const xm = (kader.links + kader.rechts) / 2;
        const juist = plek(t.naam);
        const ankers = [kader.boven + (t.ankerY / t.hoogte) * (kader.onder - kader.boven + 1)];
        if (t.naam === 'mol' && !kort) {
          const buik = buikVan(isZwart, kader);
          if (buik !== null) ankers.push(buik - molBuik);
        }
        if (!ankers.some((y) => Math.abs(stapVan(y, xm) - juist) <= 0.8)) continue;
        if (!beste || best.score > beste.score) beste = { n, kader, soort: t.naam, plek: juist, score: best.score };
      }
      return beste;
    };
    // Of een zwarte nootkop (bijna) midden in een kader past.
    const zwarteKopIn = (k) => {
      const xm = Math.round((k.links + k.rechts) / 2);
      const ym = Math.round((k.boven + k.onder) / 2);
      const t = kopSjablonen[0];
      for (let dx = -2; dx <= 2; dx += 1) {
        for (let dy = -2; dy <= 2; dy += 1) {
          if (kopScore(t, xm + dx - Math.round(t.breedte / 2) + t.ankerX, ym + dy) >= 0.8) return true;
        }
      }
      return false;
    };
    // Kruimels van een teken dat net gelezen is (een stukje van de stok of de buik dat het weghalen van de notenbalklijnen
    // losknipte): lage vormen binnen de kolommen van dat teken horen erbij. Geeft de eerste vorm erna.
    const naKruimels = (lijst, j, kader) => {
      while (j < lijst.length && lijst[j].links >= kader.links && lijst[j].rechts <= kader.rechts + 1
        && lijst[j].onder - lijst[j].boven + 1 < ia) j += 1;
      return j;
    };
    // Of er een duidelijke nootkop in een kader staat (op een lijn of in een tussenruimte, van stap `van` tot `tot`).
    const kopIn = (k, van, tot, drempel = 0.85) => {
      for (let stap = Math.floor(van); stap <= Math.ceil(tot); stap += 1) {
        for (let x = k.links; x <= k.rechts; x += 1) {
          const y = Math.round(yOp(stap, x));
          if (kopSjablonen.some((t) => kopScore(t, x, y) >= drempel)) return true;
        }
      }
      return false;
    };
    // Staat er vlak na een teken (tot ongeveer 0,3 lijnafstand) een nootkop op dezelfde plek, dan is het een voorteken van die
    // noot, geen deel van een voortekening. Na een voortekening staat de eerste noot verder weg.
    const nootErna = (teken) => {
      const y = Math.round(yOp(teken.stap, teken.rechts));
      for (let x = teken.rechts + 1; x <= teken.rechts + Math.round(ia * 0.3); x += 1) {
        if (kopSjablonen.some((t) => kopScore(t, x, y) >= 0.78)) return true;
      }
      return false;
    };
    let voorteken = null;
    while (i < daarna.length && uit.voortekening.tekens.length < 7) {
      if (daarna[i].links - vorigeRechts > ia * 2) break;
      const k = uit.voortekening.tekens.length;
      const beste = leesTeken(daarna, i, voorteken ? [voorteken] : ['kruis', 'mol'], (naam) => plekVan(naam, k));
      if (!beste) break;
      voorteken = beste.soort;
      const volgende = naKruimels(daarna, i + beste.n, beste.kader);
      uit.voortekening.tekens.push({ soort: beste.soort, stap: beste.plek, links: beste.kader.links, rechts: beste.kader.rechts, delen: volgende - i });
      vorigeRechts = beste.kader.rechts;
      i = volgende;
    }
    // Een mol vlak voor de eerste noot van de regel is een voorteken van die noot, geen voortekening.
    const laatste = uit.voortekening.tekens.at(-1);
    if (laatste) {
      if (nootErna(laatste)) {
        uit.voortekening.tekens.pop();
        i -= laatste.delen;
        vorigeRechts = uit.voortekening.tekens.at(-1)?.rechts ?? rechts;
        if (!uit.voortekening.tekens.length) voorteken = null;
      }
    }
    const aantalTekens = uit.voortekening.tekens.length;
    uit.voortekening.aantal = voorteken === 'kruis' || aantalTekens === 0 ? aantalTekens : -aantalTekens;
    uit.einde = vorigeRechts + 1;

    // Een maatsoort vanaf vorm `start` in `lijst` (vormen van links naar rechts), binnen tweeënhalve lijnafstand na `vorige`: de
    // eerste vorm met de vormen die erboven of eronder staan (de cijfers delen hun kolommen) of er met een kleine opening naast
    // staan (het tweede cijfer van 16, of een stuk van een C dat het weghalen van de lijnen losknipte). Geeft { maatsoort, rechts }
    // of null. Midden in de regel (`streng`) moet elk cijfer duidelijker lijken: een hele noot met tremolostreepjes eronder lijkt
    // anders op twee cijfers boven elkaar, en een verkeerde wissel geldt voor alle maten erna.
    const leesMaatsoort = (lijst, start, vorige, streng = false) => {
    let maatsoort = null;
    const begin = lijst[start];
    if (begin && begin.links - vorige <= ia * 2.5) {
      const groep = [begin];
      for (const v of lijst.slice(start + 1)) {
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
      // te smal (een stok is geen 1), en lijkt duidelijk op een cijfer uit het sjabloon. Geeft { n, opties }: n is het getal
      // als het zeker genoeg is (anders null). Opties zijn de getallen die er redelijk op lijken ({ n, score }, beste eerst):
      // bij één cijfer de cijfers vanaf 2 met een score van minstens 0,7 (ook als de gaten niet passen: een notenbalklijn door
      // een 4 maakt soms een extra gat), met een zeker cijfer vooraan; bij meer cijfers alleen het zekere getal.
      const leesGetal = (k, van, tot, toegestaan) => {
        const niets = { n: null, opties: [] };
        if (!k) return niets;
        if (Math.abs(stapVan(k.boven, gm) - van) > 1 || Math.abs(stapVan(k.onder, gm) - tot) > 1) return niets;
        let getal = '';
        let zeker = true;
        let opties = [];
        const delen = cijfersIn(k);
        for (const [plek, deel] of delen.entries()) {
          const dk = kaderIn(k.boven, k.onder, deel.links, deel.rechts);
          if (!dk || (dk.rechts - dk.links + 1) < ia * 0.55 || (dk.onder - dk.boven + 1) < ia * 1.4) return niets;
          // Eerst de cijfers die op deze plek kunnen staan (bij de noemer: 2, 4, 8 of de 1 en 6 van 16) en die bij de gaten passen
          // (als het beeld met lijnen er is), dan het best passende sjabloon.
          const opPlek = toegestaan
            ? cijfers.filter((c) => toegestaan.some((t) => String(t).length === delen.length && String(t)[plek] === String(c.n)))
            : cijfers;
          if (delen.length === 1) {
            opties = opPlek.map((c) => ({ n: c.n, score: vergelijkVorm(inGroep, dk, c) }))
              .filter((o) => o.n >= 2 && o.score >= 0.7).sort((p, q) => q.score - p.score);
          }
          let mogelijk = opPlek;
          if (zw) {
            const gaten = gatenIn((x, y) => zw.pixels[y * zw.breedte + x] === 1, dk, ia * ia * 0.1);
            const soort = gaten.boven && gaten.onder ? 'beide' : gaten.boven ? 'boven' : gaten.onder ? 'onder' : 'geen';
            mogelijk = mogelijk.filter((c) => BIJ_GATEN[soort].includes(c.n));
          }
          const kansen = mogelijk.map((c) => ({ n: c.n, score: vergelijkVorm(inGroep, dk, c) })).sort((p, q) => q.score - p.score);
          if (!kansen.length) { zeker = false; break; }
          // Zeker genoeg: een hoge score, of een iets lagere met een duidelijke voorsprong op het volgende cijfer (op een vage scan
          // liggen een 3 en een 9 of een 3 en een 5 dicht bij elkaar; dan liever geen maatsoort dan een verkeerde).
          const [beste, tweede] = kansen;
          if (beste.score < 0.85 || (beste.score < 0.9 && tweede && beste.score - tweede.score < 0.05)) zeker = false;
          if (streng && beste.score < 0.92) zeker = false;
          getal += String(beste.n);
        }
        const n = Number(getal);
        if (!zeker || !getal || n < 1 || n > 16 || (toegestaan && !toegestaan.includes(n))) return { n: null, opties };
        return { n, opties: [{ n, score: 1 }, ...(delen.length === 1 ? opties.filter((o) => o.n !== n) : [])] };
      };
      if (gb >= -1.2 && gb <= 1 && go >= 7 && go <= 9.2 && breed <= 4) {
        const teller = leesGetal(kaderIn(g.boven, midden - 1), 0, 4, null);
        const noemer = leesGetal(kaderIn(midden + 1, g.onder), 4, 8, NOEMERS);
        // De combinaties die het best lijken (hooguit acht, een zekere maatsoort vooraan), om met de lengte van de maten te
        // kiezen.
        const combinaties = () => teller.opties.flatMap((t) => noemer.opties.map((o) => ({ teller: t.n, noemer: o.n, score: t.score + o.score })))
          .sort((p, q) => q.score - p.score).slice(0, 8).map(({ teller: t, noemer: o }) => ({ teller: t, noemer: o }));
        // (1/1 komt niet voor; dat is een half gelezen 16.)
        if (teller.n && noemer.n && !(teller.n === 1 && noemer.n === 1)) {
          maatsoort = { teller: teller.n, noemer: noemer.n };
          return { maatsoort, opties: combinaties(), rechts: g.rechts };
        }
        // Niet zeker: alleen als boven en onder iets duidelijk op een cijfer lijkt en er geen nootkop in staat (een akkoord met een
        // stok, of een hele noot met tremolostreepjes eronder, lijkt anders op twee cijfers boven elkaar).
        if (!streng && teller.opties[0]?.score >= 0.8 && noemer.opties[0]?.score >= 0.8 && !kopIn(g, gb, go)) {
          return { maatsoort: null, opties: combinaties(), rechts: g.rechts };
        }
      } else if (groep.length <= 5 && breed >= 1.1 && breed <= 2.2 && Math.abs((gb + go) / 2 - 4) <= 0.8 && go - gb >= 3 && go - gb <= 7) {
        // Een C (vier kwart) of een C met een streep erdoor (twee halve), midden op de balk. Een rust aan het begin van de regel
        // staat op dezelfde plek; die moet minder goed passen dan de C.
        const kansen = [...SYMBOLEN, ...RUSTEN].map((naam) => ({ naam, score: vergelijkVorm(inGroep, g, sjabloon(naam, ia)) }))
          .sort((p, q) => q.score - p.score);
        const [best, tweede] = kansen;
        // Midden in de regel lijkt een hele noot met een boog erover (of twee boven elkaar) op een C; een C is rechts open en
        // heeft dus geen gat, en lijkt minder op een nootkop.
        const gat = () => { const gaten = gatenIn(inGroep, g, ia * ia * 0.1); return gaten.boven || gaten.onder; };
        const nootLijkend = () => gat() || kopIn(g, gb, go, 0.78);
        if (best.score >= 0.75 && best.score - tweede.score >= 0.04 && !(streng && best.naam === 'maat-c' && nootLijkend())) {
          if (best.naam === 'maat-c') maatsoort = { teller: 4, noemer: 4, symbool: 'C' };
          if (best.naam === 'maat-alla-breve') maatsoort = { teller: 2, noemer: 2, symbool: 'alla-breve' };
        }
      }
      if (maatsoort) return { maatsoort, rechts: g.rechts };
    }
    return null;
    };

    // 3. Maatsoort aan het begin van de balk.
    const gelezen = leesMaatsoort(daarna, i, vorigeRechts);
    if (gelezen) {
      uit.maatsoort = gelezen.maatsoort;
      if (gelezen.opties) uit.maatsoortOpties = gelezen.opties;
      uit.einde = gelezen.rechts + 1;
    }
    // Een nieuwe voortekening midden in de regel, vanaf vorm 0 in `lijst` (de vormen na de maatstreep): eerst herstellingstekens
    // op de plekken van de oude tekens (`oud`, zoals aantal), dan eventueel nieuwe kruisen of mollen. Alleen herstellingstekens
    // tellen als ze alle oude tekens opheffen. Geeft { voortekening, rechts, volgende (de eerste vorm erna) } of null.
    const leesNieuweVoortekening = (lijst, oud, vorige) => {
      const gelezen = [];
      let j = 0;
      let rechts = vorige;
      let herstel = 0;
      while (j < lijst.length && herstel < Math.abs(oud) && lijst[j].links - rechts <= ia * 2) {
        const teken = leesTeken(lijst, j, ['herstel'], () => plekVan(oud < 0 ? 'mol' : 'kruis', herstel));
        if (!teken) break;
        gelezen.push(teken);
        herstel += 1;
        rechts = teken.kader.rechts;
        j = naKruimels(lijst, j + teken.n, teken.kader);
      }
      let nieuw = null;
      let aantal = 0;
      while (j < lijst.length && aantal < 7 && lijst[j].links - rechts <= ia * 2) {
        const teken = leesTeken(lijst, j, nieuw ? [nieuw] : ['kruis', 'mol'], (naam) => plekVan(naam, aantal));
        if (!teken) break;
        nieuw = teken.soort;
        gelezen.push(teken);
        aantal += 1;
        rechts = teken.kader.rechts;
        j = naKruimels(lijst, j + teken.n, teken.kader);
      }
      if (!gelezen.length || (!aantal && herstel < Math.abs(oud))) return null;
      const tekens = gelezen.map((teken) => ({ soort: teken.soort, stap: teken.plek, links: teken.kader.links, rechts: teken.kader.rechts }));
      if (nootErna(tekens.at(-1))) return null;
      return { voortekening: { aantal: nieuw === 'mol' ? -aantal : aantal, tekens }, rechts, volgende: j };
    };

    // 4. Midden in de regel, direct na een maatstreep (niet aan het eind van de balk): een nieuwe voortekening (alleen na een
    // dubbele streep, eind- of herhaalstreep: zo staat een toonsoortwissel gedrukt, en een voorteken bij de eerste noot van een
    // maat lijkt er anders op) en een nieuwe maatsoort.
    uit.wissels = [];
    let geldend = uit.voortekening.aantal;
    for (const streep of strepen?.[b] ?? []) {
      if (streep.rechts <= uit.einde || balk.rechts - streep.rechts < ia * 3) continue;
      const naStreep = bijBalk.filter((v) => {
        const x = (v.links + v.rechts) / 2;
        return v.links > streep.rechts && v.links <= streep.rechts + ia * 14 && v.onder >= yOp(0.5, x) && v.boven <= yOp(7.5, x);
      }).sort((p, q) => p.links - q.links);
      const toon = streep.soort && streep.soort !== 'enkel' ? leesNieuweVoortekening(naStreep, geldend, streep.rechts) : null;
      // Direct na een nieuwe voortekening is een maatsoort heel gewoon; daar gelden de gewone drempels voor de cijfers.
      const maat = leesMaatsoort(naStreep, toon?.volgende ?? 0, toon?.rechts ?? streep.rechts, !toon);
      if (!toon && !maat) continue;
      const wissel = { x: streep.rechts, rechts: maat?.rechts ?? toon.rechts };
      if (toon) {
        wissel.voortekening = toon.voortekening;
        geldend = toon.voortekening.aantal;
      }
      if (maat?.maatsoort) wissel.maatsoort = maat.maatsoort;
      if (maat?.opties) wissel.maatsoortOpties = maat.opties;
      uit.wissels.push(wissel);
    }
    uit.voortekening.tekens = uit.voortekening.tekens.map(({ delen, ...teken }) => teken);
    return uit;
  });
}
