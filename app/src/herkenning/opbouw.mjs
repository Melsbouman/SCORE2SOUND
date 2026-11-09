// Herkenning, stappen MEASURES, CHORDS, RHYTHMS en PAGE (naar het voorbeeld van Audiveris): van de herkende onderdelen naar het
// muziekmodel (docs/model.md), voor één partij met één notenbalk en één stem. In eigen code. Werkwijze:
// 1. De maten komen uit maten.mjs, balk voor balk en bladzijde voor bladzijde. Elke maat krijgt zijn plek op het blad (`vak`),
//    en de eerste maat van een balk `regelbegin`, de eerste van een bladzijde `paginabegin`.
// 2. Sleutel, voortekening en maatsoort komen uit de balkkop (kop.mjs) en gelden tot er een andere komt. Zonder gelezen
//    maatsoort geldt 4/4, zonder sleutel de vioolsleutel. Waren de cijfers van een maatsoort niet zeker (kop.mjs geeft dan
//    opties), dan kiezen we na de opbouw de optie waar de meeste maten tot de volgende maatsoort precies in passen. Een zeker
//    gelezen maatsoort waar geen enkele maat in past, wijkt voor een optie waar de meeste maten in passen.
// 3. Elke nootkop en rust hoort bij de maat waarin zijn midden valt. Op volgorde van links naar rechts krijgen ze hun start:
//    de som van de duren ervoor. Koppen boven elkaar (bijna dezelfde x) zijn een akkoord en starten samen.
// 4. De toonhoogte volgt uit de plek op de balk en de sleutel. De voortekening geeft de standaard; een voorteken bij een noot
//    geldt tot het eind van de maat voor dezelfde plek.
// 5. Herhaaltekens bij de maatstrepen (maten.mjs) worden `herhaling.begin` en `herhaling.eind` van de maten ernaast. Een
//    cijfer bij een groep onder één waardestreep (groepcijfers.mjs) maakt de noten een triool (of een ander groepje): de
//    duur wordt `normaal / aantal` keer zo lang, met 3 in de tijd van 2, 2 en 4 in de tijd van 3, en 5, 6 en 7 in die van 4.
// 6. Een hele rust die alleen in de maat staat, vult de hele maat. Een meermaatsrust wordt zoveel maten als het getal erboven
//    zegt (cijfers.mjs): de eerste met `maatrust`, de andere verborgen.
// De herstelketen (herstelHerkenning, vulRustGaten, herstelTriolen, maatduur) kan daarna op het resultaat draaien, net als na
// Audiveris. Het veld `bron` (waar de bladzijden te vinden zijn) zet de keten in de browser zelf.
import { TIKKEN_PER_KWART } from '../model/duur.mjs';

const STAMMEN = 'CDEFGAB';
const KRUISEN = 'FCGDAEB';
const MOLLEN = 'BEADGCF';
const RUSTDUUR = { kwart: 480, 8: 240, 16: 120, 32: 60, half: 960 };
const ALTER = { kruis: 1, mol: -1, herstel: 0 };
// In de tijd van hoeveel noten een groepje met dit cijfer klinkt.
const NORMAAL = { 2: 3, 3: 2, 4: 3, 5: 4, 6: 4, 7: 4 };

// De noot op stap `stap` bij een sleutel: { stap: 'C'..'B', octaaf }. De G-sleutel zet g4 op zijn lijn, de F-sleutel f3, de
// C-sleutel c4 (lijn telt van onder, stap 0 is de bovenste lijn).
export function nootOpStap(stap, sleutel = { teken: 'G', lijn: 2 }) {
  const referentie = { G: 4 * 7 + 4, F: 3 * 7 + 3, C: 4 * 7 }[sleutel.teken] ?? 32;
  const index = referentie + 2 * (5 - sleutel.lijn) - stap;
  return { stap: STAMMEN[((index % 7) + 7) % 7], octaaf: Math.floor(index / 7) };
}

// De alter die de voortekening (kwinten, min = mollen) aan een stam geeft.
export function alterUitVoortekening(stam, kwinten) {
  if (kwinten > 0) return KRUISEN.slice(0, kwinten).includes(stam) ? 1 : 0;
  if (kwinten < 0) return MOLLEN.slice(0, -kwinten).includes(stam) ? -1 : 0;
  return 0;
}

// paginas: [{ blad, raster, schaal, maten, balkkoppen, noten, voortekens, rusten, aantallen, triolen }] zoals de
// herkenningsstappen ze geven (aantallen uit cijfers.mjs en triolen uit groepcijfers.mjs mogen ontbreken). Geeft een Partituur.
export function bouwPartituur(paginas, { titel = '' } = {}) {
  const maten = [];
  let sleutel = { teken: 'G', lijn: 2 };
  let kwinten = 0;
  let maatsoort = { teller: 4, noemer: 4 };
  // Waar een maatsoort begint (index in `maten`), met de opties als de cijfers niet zeker gelezen zijn.
  const grenzen = [];
  for (const [p, pagina] of paginas.entries()) {
    const ia = pagina.schaal?.lijnafstand ?? 20;
    let eersteVanBlad = true;
    (pagina.raster?.balken ?? []).forEach((balk, b) => {
      const kop = pagina.balkkoppen?.[b];
      if (kop?.sleutel) sleutel = { teken: kop.sleutel.soort, lijn: kop.sleutel.lijn };
      if (kop?.sleutel) kwinten = kop.voortekening?.aantal ?? 0;
      if (kop?.maatsoort) {
        maatsoort = { teller: kop.maatsoort.teller, noemer: kop.maatsoort.noemer };
        if (kop.maatsoort.symbool === 'C') maatsoort.symbool = 'common';
        if (kop.maatsoort.symbool === 'alla-breve') maatsoort.symbool = 'cut';
        grenzen.push({ vanaf: maten.length, opties: kop.maatsoortOpties ?? null, zeker: true });
      } else if (kop?.maatsoortOpties?.length) grenzen.push({ vanaf: maten.length, opties: kop.maatsoortOpties });
      const noten = pagina.noten?.[b] ?? [];
      const tekens = new Map((pagina.voortekens?.[b] ?? []).map((teken) => [teken.kop, teken]));
      // Per nootkop het groepje waar hij in staat (groepcijfers.mjs): { aantal, normaal, plek, lengte }.
      const groepjes = new Map();
      for (const groep of pagina.triolen?.[b] ?? []) {
        if (!NORMAAL[groep.aantal]) continue;
        groep.koppen.forEach((k, plek) => groepjes.set(k, { aantal: groep.aantal, normaal: NORMAAL[groep.aantal], plek, lengte: groep.koppen.length }));
      }
      const rusten = pagina.rusten?.[b] ?? [];
      const aantallen = pagina.aantallen?.[b] ?? [];
      let meermaats = 0;
      const vakken = pagina.maten?.[b]?.maten ?? [];
      const strepen = pagina.maten?.[b]?.strepen ?? [];
      let eersteVanBalk = true;
      vakken.forEach((vak, m) => {
        // Een wissel midden in de regel (kop.mjs) aan het begin van deze maat: vanaf hier de nieuwe voortekening en/of maatsoort.
        const wissel = (kop?.wissels ?? []).find((w) => Math.abs(w.x - vak.links) <= ia * 1.5);
        if (wissel?.voortekening) kwinten = wissel.voortekening.aantal;
        if (wissel?.maatsoort) {
          maatsoort = { teller: wissel.maatsoort.teller, noemer: wissel.maatsoort.noemer };
          if (wissel.maatsoort.symbool === 'C') maatsoort.symbool = 'common';
          if (wissel.maatsoort.symbool === 'alla-breve') maatsoort.symbool = 'cut';
          grenzen.push({ vanaf: maten.length, opties: wissel.maatsoortOpties ?? null, zeker: true });
        } else if (wissel?.maatsoortOpties?.length) grenzen.push({ vanaf: maten.length, opties: wissel.maatsoortOpties });
        const lengte = (maatsoort.teller * 4 * TIKKEN_PER_KWART) / maatsoort.noemer;
        const binnen = (x) => x >= vak.links && (x < vak.rechts || (m === vakken.length - 1 && x <= vak.rechts));
        const gebeurtenissen = [];
        noten.forEach((noot, k) => { if (binnen(noot.x)) gebeurtenissen.push({ x: noot.x, noot, k }); });
        for (const rust of rusten) if (binnen(rust.x)) gebeurtenissen.push({ x: rust.x, rust });
        gebeurtenissen.sort((p1, p2) => p1.x - p2.x || (p1.noot && p2.noot ? p1.noot.stap - p2.noot.stap : 0));
        // Een eerste 'maat' waarin alleen de balkkop staat (sleutel, voortekening, maatsoort en dan een herhaalteken of dubbele
        // streep, verder van het begin dan maten.mjs zelf herkent; hooguit drie lijnafstanden na de balkkop): geen maat.
        if (m === 0 && !gebeurtenissen.length && kop?.sleutel && vakken.length > 1 && vak.rechts <= kop.einde + ia * 3) return;
        const basis = {
          nummer: '', index: 0, opmaat: false, regelbegin: eersteVanBalk, paginabegin: eersteVanBlad,
          maatsoort: { ...maatsoort }, toonsoort: { kwinten, modus: 'majeur' },
          sleutels: [{ teken: sleutel.teken, lijn: sleutel.lijn, notenbalk: 1, octaafVerschuiving: 0 }],
          tempo: null, herhaling: { begin: false, eind: false, keer: 2 },
          vak: { blad: pagina.blad ?? p + 1, links: vak.links, rechts: vak.rechts, boven: vak.boven, onder: vak.onder },
          elementen: [],
        };
        eersteVanBlad = false;
        eersteVanBalk = false;
        // De maatstreep aan het eind van deze maat: dubbel of eind.
        const streep = strepen.find((s) => Math.abs((s.links + s.rechts) / 2 - vak.rechts) <= ia);
        // Herhaaltekens (maten.mjs): punten rechts van de streep aan het begin van de maat, of links van de streep aan het eind.
        // Bij een herhaling volgt de streep uit het herhaalteken (docs/model.md), dus dan geen eigen maatstreep.
        const beginStreep = strepen.find((s) => Math.abs(s.rechts - vak.links) <= ia || Math.abs((s.links + s.rechts) / 2 - vak.links) <= ia);
        if (beginStreep?.herhaling === 'begin' || beginStreep?.herhaling === 'beide') basis.herhaling.begin = true;
        if (streep?.herhaling === 'eind' || streep?.herhaling === 'beide') basis.herhaling.eind = true;
        if (streep?.soort === 'dubbel' && !basis.herhaling.eind) basis.maatstreep = 'dubbel';
        if (streep?.soort === 'eind' && !basis.herhaling.eind) basis.maatstreep = 'eind';
        // Een meermaatsrust: zoveel maten als het getal erboven.
        const rustbalk = gebeurtenissen.find((g) => g.rust?.soort === 'meermaats');
        if (rustbalk) {
          const aantal = aantallen.find((a) => Math.abs(a.x - rustbalk.rust.x) <= ia)?.aantal ?? aantallen[meermaats]?.aantal ?? null;
          meermaats += 1;
          const n = aantal && aantal > 0 ? aantal : 1;
          for (let i = 0; i < n; i += 1) {
            const maat = { ...structuredClone(basis), regelbegin: basis.regelbegin && i === 0, paginabegin: basis.paginabegin && i === 0 };
            // De verborgen maten hebben geen eigen plek op het blad (zoals bij meermaatsrust.mjs).
            if (i === 0) maat.maatrust = n; else { maat.verborgen = true; delete maat.vak; }
            // Een herhaling begint op de eerste maat van de rust en eindigt op de laatste, net als de maatstreep.
            if (i > 0) maat.herhaling.begin = false;
            if (i < n - 1) { delete maat.maatstreep; maat.herhaling.eind = false; }
            maat.elementen.push({
              soort: 'rust', start: 0, duur: lengte, stem: 1, notenbalk: 1, heleMaat: true, zekerheid: aantal ? 0.9 : 0.3,
              ...(i === 0 ? { plek: plekVan(pagina, p, rustbalk.rust, ia, balk) } : {}),
            });
            maten.push(maat);
          }
          return;
        }
        const maat = structuredClone(basis);
        // Voortekens gelden tot het eind van de maat op dezelfde plek (dezelfde stam en hetzelfde octaaf).
        const geldend = new Map();
        const bijElement = new Map();
        let start = 0;
        let vorigeNoot = null;
        const alleenHeleRust = gebeurtenissen.length === 1 && gebeurtenissen[0].rust?.soort === 'heel';
        for (const g of gebeurtenissen) {
          if (g.rust) {
            const heel = g.rust.soort === 'heel';
            const zonderPunt = heel ? (alleenHeleRust ? lengte : 1920) : RUSTDUUR[g.rust.soort] ?? 480;
            // Een punt achter de rust (rusten.mjs): anderhalf keer zo lang (niet bij een hele rust die de maat vult).
            const duur = g.rust.punt && !(heel && alleenHeleRust) ? Math.round(zonderPunt * 1.5) : zonderPunt;
            maat.elementen.push({
              soort: 'rust', start, duur, stem: 1, notenbalk: 1, ...(heel && alleenHeleRust ? { heleMaat: true } : {}),
              zekerheid: 0.9, plek: plekVan(pagina, p, g.rust, ia, balk),
            });
            start += duur;
            vorigeNoot = null;
            continue;
          }
          const { noot } = g;
          const plaats = nootOpStap(noot.stap, sleutel);
          const sleutelNaam = `${plaats.stap}${plaats.octaaf}`;
          const teken = tekens.get(g.k);
          if (teken) geldend.set(sleutelNaam, ALTER[teken.soort]);
          const alter = geldend.has(sleutelNaam) ? geldend.get(sleutelNaam) : alterUitVoortekening(plaats.stap, kwinten);
          // In een akkoord (bijna dezelfde x als de vorige kop, of dezelfde stok: bij een secunde staat een kop ernaast) start
          // de noot met de vorige mee.
          const zelfdeStok = noot.stok && vorigeNoot?.noot.stok && Math.abs(noot.stok.x - vorigeNoot.noot.stok.x) <= Math.max(2, ia * 0.2);
          // Een secunde in een akkoord: twee koppen een stap uit elkaar staan naast elkaar. Twee hele noten (zonder stok), of een kop
          // zonder stok die tegen de stok van een andere kop van het akkoord aan staat (duren.mjs zoekt de stok aan de eigen kant
          // van de kop). We vergelijken met elke kop die al in het akkoord staat.
          const tegenStok = (zonder, met) => !zonder.stok && met.stok && Math.abs(zonder.x - met.stok.x) <= ia * 0.9;
          const secunde = (vorigeNoot?.koppen ?? []).some((ander) => Math.abs(noot.stap - ander.stap) === 1 && Math.abs(noot.x - ander.x) <= ia * 1.9
            && ((noot.soort === 'heel' && ander.soort === 'heel') || tegenStok(noot, ander) || tegenStok(ander, noot)));
          const akkoord = Boolean(vorigeNoot && (Math.abs(noot.x - vorigeNoot.noot.x) < ia * 0.6 || zelfdeStok || secunde));
          const groepje = groepjes.get(g.k);
          const duur = groepje ? Math.round(((noot.duur ?? 480) * groepje.normaal) / groepje.aantal) : noot.duur ?? 480;
          const tuplet = groepje ? { aantal: groepje.aantal, normaal: groepje.normaal, begin: groepje.plek === 0, eind: groepje.plek === groepje.lengte - 1 } : null;
          // Had het akkoord tot nu toe geen stok en deze kop wel, dan bepaalt deze kop het akkoord: de duur (van alle koppen), de
          // waardestreep (zetBalken kijkt naar de kop van het eerste element) en het groepje.
          if (secunde && !vorigeNoot.noot.stok && noot.stok) {
            for (const ander of vorigeNoot.elementen) ander.duur = duur;
            start = vorigeNoot.start + duur;
            vorigeNoot.duur = duur;
            vorigeNoot.noot = noot;
            bijElement.set(vorigeNoot.element, noot);
            if (tuplet) vorigeNoot.element.tuplet = { ...tuplet };
          }
          const element = {
            soort: 'noot', start: akkoord ? vorigeNoot.start : start, duur: akkoord ? vorigeNoot.duur : duur, stem: 1, notenbalk: 1,
            toonhoogte: { stap: plaats.stap, alter, octaaf: plaats.octaaf }, akkoord,
            overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null,
            zekerheid: 0.9, plek: plekVan(pagina, p, noot, ia),
            ...(tuplet ? { tuplet } : {}),
          };
          maat.elementen.push(element);
          bijElement.set(element, noot);
          if (akkoord) {
            vorigeNoot.koppen.push(noot);
            vorigeNoot.elementen.push(element);
          } else {
            vorigeNoot = { noot, start, duur, element, koppen: [noot], elementen: [element] };
            start += duur;
          }
        }
        zetBalken(maat.elementen.filter((e) => e.soort === 'noot' && !e.akkoord), bijElement, ia);
        maten.push(maat);
      });
    });
  }
  kiesMaatsoorten(maten, grenzen);
  maten.forEach((maat, i) => { maat.index = i; maat.nummer = String(i + 1); });
  return {
    versie: 1, titel, componist: '', arrangeur: '',
    partijen: [{
      id: 'P1', naam: '', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } }, maten,
    }],
  };
}

// Een maatsoort waarvan de cijfers niet zeker gelezen zijn (opties uit kop.mjs, beste eerst): we nemen de optie waar de meeste
// maten tot de volgende maatsoort precies in passen (maten met inhoud, zonder hele-maatrust), als dat er minstens één is en
// niet minder dan bij de maatsoort die anders zou gelden; bij gelijke stand de eerste optie. Anders geldt de maatsoort van de
// maat ervoor. Een zeker gelezen maatsoort (`zeker`) blijft, tenzij er geen enkele maat in past en in een optie minstens drie
// en minstens twee derde van de maten (een 2 die als 9 gelezen is). Rusten die de hele maat vullen, krijgen de nieuwe lengte.
function kiesMaatsoorten(maten, grenzen) {
  const lengteVan = (m) => (m.teller * 4 * TIKKEN_PER_KWART) / m.noemer;
  grenzen.forEach((grens, g) => {
    // Begint er op dezelfde plek nog een maatsoort (een wissel direct aan het begin van de regel), dan geldt die.
    if (!grens.opties || grenzen.slice(g + 1).some((ander) => ander.vanaf === grens.vanaf)) return;
    const eind = grenzen.slice(g + 1).find((ander) => ander.vanaf > grens.vanaf)?.vanaf ?? maten.length;
    const reeks = maten.slice(grens.vanaf, eind);
    if (!reeks.length) return;
    const lengtes = reeks.filter((m) => !m.verborgen && !m.maatrust && m.elementen.length && !m.elementen.some((e) => e.heleMaat))
      .map((m) => m.elementen.reduce((max, e) => Math.max(max, e.start + e.duur), 0));
    const passend = (maatsoort) => lengtes.filter((l) => l === lengteVan(maatsoort)).length;
    let gekozen = null;
    for (const optie of grens.opties) {
      const aantal = passend(optie);
      if (!gekozen || aantal > gekozen.aantal) gekozen = { optie, aantal };
    }
    let nieuw;
    if (grens.zeker) {
      if (passend(reeks[0].maatsoort) > 0 || !gekozen || gekozen.aantal < Math.max(3, (lengtes.length * 2) / 3)) return;
      nieuw = { teller: gekozen.optie.teller, noemer: gekozen.optie.noemer };
    } else {
      // Begon er op dezelfde plek al een zekere maatsoort (die hier wijkt voor deze), dan geldt die als de andere.
      const zekerErvoor = grenzen.slice(0, g).some((ander) => ander.vanaf === grens.vanaf && ander.zeker);
      const anders = zekerErvoor ? reeks[0].maatsoort : maten[grens.vanaf - 1]?.maatsoort ?? reeks[0].maatsoort;
      nieuw = gekozen && gekozen.aantal > 0 && gekozen.aantal >= passend(anders)
        ? { teller: gekozen.optie.teller, noemer: gekozen.optie.noemer } : { ...anders };
    }
    const lengte = lengteVan(nieuw);
    for (const maat of reeks) {
      maat.maatsoort = { ...nieuw };
      for (const e of maat.elementen) if (e.heleMaat) e.duur = lengte;
    }
  });
}

// Noten onder één waardestreep krijgen `balk`: 'begin', 'midden' of 'eind'. Twee noten na elkaar horen bij dezelfde streep als
// de streep van de ene tot de stok van de andere loopt (duren.mjs geeft per noot hoe ver zijn streep loopt).
function zetBalken(elementen, bijElement, ia) {
  let groep = [];
  const sluit = () => {
    if (groep.length >= 2) groep.forEach((e, i) => { e.balk = i === 0 ? 'begin' : i === groep.length - 1 ? 'eind' : 'midden'; });
    groep = [];
  };
  for (const element of elementen) {
    const noot = bijElement.get(element);
    const vorige = groep.length ? bijElement.get(groep.at(-1)) : null;
    const verbonden = noot?.balk && noot.stok && vorige?.balk && vorige.stok
      && vorige.balk.rechts >= noot.stok.x - Math.max(2, ia * 0.2) && noot.balk.links <= vorige.stok.x + Math.max(2, ia * 0.2);
    if (!verbonden) sluit();
    if (noot?.balk && noot.stok) groep.push(element);
  }
  sluit();
}

// De plek van een kop of rust op het blad: linksboven, breedte en hoogte (zoals bij Audiveris). Een rust heeft geen eigen
// hoogte uit rusten.mjs; die krijgt het midden van de balk.
function plekVan(pagina, p, ding, ia, balk) {
  const breedte = ding.links !== undefined ? ding.rechts - ding.links + 1 : Math.round(ia * 1.2);
  const hoogte = Math.round(ia);
  const x = ding.links !== undefined ? ding.links : Math.round(ding.x - breedte / 2);
  const midden = ding.y ?? (balk ? balk.lijnen[0].a + balk.lijnen[0].b * ding.x + 2 * ia : hoogte / 2);
  return { blad: pagina.blad ?? p + 1, x, y: Math.round(midden - hoogte / 2), breedte, hoogte };
}
