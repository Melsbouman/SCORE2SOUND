// Herkenning, stappen MEASURES, CHORDS, RHYTHMS en PAGE (naar het voorbeeld van Audiveris): van de herkende onderdelen naar het
// muziekmodel (docs/model.md), voor één partij met één notenbalk en één stem. In eigen code. Werkwijze:
// 1. De maten komen uit maten.mjs, balk voor balk en bladzijde voor bladzijde. Elke maat krijgt zijn plek op het blad (`vak`),
//    en de eerste maat van een balk `regelbegin`, de eerste van een bladzijde `paginabegin`.
// 2. Sleutel, voortekening en maatsoort komen uit de balkkop (kop.mjs) en gelden tot er een andere komt. Zonder gelezen
//    maatsoort geldt 4/4, zonder sleutel de vioolsleutel.
// 3. Elke nootkop en rust hoort bij de maat waarin zijn midden valt. Op volgorde van links naar rechts krijgen ze hun start:
//    de som van de duren ervoor. Koppen boven elkaar (bijna dezelfde x) zijn een akkoord en starten samen.
// 4. De toonhoogte volgt uit de plek op de balk en de sleutel. De voortekening geeft de standaard; een voorteken bij een noot
//    geldt tot het eind van de maat voor dezelfde plek.
// 5. Een hele rust die alleen in de maat staat, vult de hele maat. Een meermaatsrust wordt zoveel maten als het getal erboven
//    zegt (cijfers.mjs): de eerste met `maatrust`, de andere verborgen.
// De herstelketen (herstelHerkenning, vulRustGaten, herstelTriolen, maatduur) kan daarna op het resultaat draaien, net als na
// Audiveris.
import { TIKKEN_PER_KWART } from '../model/duur.mjs';

const STAMMEN = 'CDEFGAB';
const KRUISEN = 'FCGDAEB';
const MOLLEN = 'BEADGCF';
const RUSTDUUR = { kwart: 480, 8: 240, 16: 120, 32: 60, half: 960 };
const ALTER = { kruis: 1, mol: -1, herstel: 0 };

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

// paginas: [{ blad, raster, schaal, maten, balkkoppen, noten, voortekens, rusten, aantallen }] zoals de herkenningsstappen ze
// geven (aantallen uit cijfers.mjs mag ontbreken). Geeft een Partituur.
export function bouwPartituur(paginas, { titel = '' } = {}) {
  const maten = [];
  let sleutel = { teken: 'G', lijn: 2 };
  let kwinten = 0;
  let maatsoort = { teller: 4, noemer: 4 };
  for (const [p, pagina] of paginas.entries()) {
    const ia = pagina.schaal?.lijnafstand ?? 20;
    pagina.raster.balken.forEach((balk, b) => {
      const kop = pagina.balkkoppen?.[b];
      if (kop?.sleutel) sleutel = { teken: kop.sleutel.soort, lijn: kop.sleutel.lijn };
      if (kop?.sleutel) kwinten = kop.voortekening.aantal;
      if (kop?.maatsoort) {
        maatsoort = { teller: kop.maatsoort.teller, noemer: kop.maatsoort.noemer };
        if (kop.maatsoort.symbool === 'C') maatsoort.symbool = 'common';
        if (kop.maatsoort.symbool === 'alla-breve') maatsoort.symbool = 'cut';
      }
      const lengte = (maatsoort.teller * 4 * TIKKEN_PER_KWART) / maatsoort.noemer;
      const noten = pagina.noten?.[b] ?? [];
      const tekens = new Map((pagina.voortekens?.[b] ?? []).map((teken) => [teken.kop, teken]));
      const rusten = pagina.rusten?.[b] ?? [];
      const aantallen = pagina.aantallen?.[b] ?? [];
      let meermaats = 0;
      const vakken = pagina.maten?.[b]?.maten ?? [];
      const strepen = pagina.maten?.[b]?.strepen ?? [];
      vakken.forEach((vak, m) => {
        const binnen = (x) => x >= vak.links && (x < vak.rechts || (m === vakken.length - 1 && x <= vak.rechts));
        const gebeurtenissen = [];
        noten.forEach((noot, k) => { if (binnen(noot.x)) gebeurtenissen.push({ x: noot.x, noot, k }); });
        for (const rust of rusten) if (binnen(rust.x)) gebeurtenissen.push({ x: rust.x, rust });
        gebeurtenissen.sort((p1, p2) => p1.x - p2.x || (p1.noot && p2.noot ? p1.noot.stap - p2.noot.stap : 0));
        const basis = {
          nummer: '', index: 0, opmaat: false, regelbegin: m === 0, paginabegin: m === 0 && b === 0,
          maatsoort: { ...maatsoort }, toonsoort: { kwinten, modus: 'majeur' },
          sleutels: [{ teken: sleutel.teken, lijn: sleutel.lijn, notenbalk: 1, octaafVerschuiving: 0 }],
          tempo: null, herhaling: { begin: false, eind: false, keer: 2 },
          vak: { blad: pagina.blad ?? p + 1, links: vak.links, rechts: vak.rechts, boven: vak.boven, onder: vak.onder },
          elementen: [],
        };
        // De maatstreep aan het eind van deze maat: dubbel of eind.
        const streep = strepen.find((s) => Math.abs((s.links + s.rechts) / 2 - vak.rechts) <= ia);
        if (streep?.soort === 'dubbel') basis.maatstreep = 'dubbel';
        if (streep?.soort === 'eind') basis.maatstreep = 'eind';
        // Een meermaatsrust: zoveel maten als het getal erboven.
        const rustbalk = gebeurtenissen.find((g) => g.rust?.soort === 'meermaats');
        if (rustbalk) {
          const aantal = aantallen.find((a) => Math.abs(a.x - rustbalk.rust.x) <= ia)?.aantal ?? aantallen[meermaats]?.aantal ?? null;
          meermaats += 1;
          const n = aantal && aantal > 0 ? aantal : 1;
          for (let i = 0; i < n; i += 1) {
            const maat = { ...structuredClone(basis), regelbegin: basis.regelbegin && i === 0, paginabegin: basis.paginabegin && i === 0 };
            if (i === 0) maat.maatrust = n; else maat.verborgen = true;
            if (i < n - 1) delete maat.maatstreep;
            maat.elementen.push({
              soort: 'rust', start: 0, duur: lengte, stem: 1, notenbalk: 1, heleMaat: true, zekerheid: aantal ? 0.9 : 0.3,
              ...(i === 0 ? { plek: plekVan(pagina, p, rustbalk.rust, ia) } : {}),
            });
            maten.push(maat);
          }
          return;
        }
        const maat = structuredClone(basis);
        // Voortekens gelden tot het eind van de maat op dezelfde plek (dezelfde stam en hetzelfde octaaf).
        const geldend = new Map();
        let start = 0;
        let vorigeNoot = null;
        const alleenHeleRust = gebeurtenissen.length === 1 && gebeurtenissen[0].rust?.soort === 'heel';
        for (const g of gebeurtenissen) {
          if (g.rust) {
            const heel = g.rust.soort === 'heel';
            const duur = heel ? (alleenHeleRust ? lengte : 1920) : RUSTDUUR[g.rust.soort] ?? 480;
            maat.elementen.push({
              soort: 'rust', start, duur, stem: 1, notenbalk: 1, ...(heel && alleenHeleRust ? { heleMaat: true } : {}),
              zekerheid: 0.9, plek: plekVan(pagina, p, g.rust, ia),
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
          // In een akkoord (bijna dezelfde x als de vorige kop) start de noot met de vorige mee.
          const akkoord = Boolean(vorigeNoot && Math.abs(noot.x - vorigeNoot.noot.x) < ia * 0.6);
          const duur = noot.duur ?? 480;
          const element = {
            soort: 'noot', start: akkoord ? vorigeNoot.start : start, duur: akkoord ? vorigeNoot.duur : duur, stem: 1, notenbalk: 1,
            toonhoogte: { stap: plaats.stap, alter, octaaf: plaats.octaaf }, akkoord,
            overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null,
            zekerheid: 0.9, plek: plekVan(pagina, p, noot, ia),
          };
          maat.elementen.push(element);
          if (!akkoord) {
            vorigeNoot = { noot, start, duur };
            start += duur;
          }
        }
        maten.push(maat);
      });
    });
  }
  maten.forEach((maat, i) => { maat.index = i; maat.nummer = String(i + 1); });
  return {
    versie: 1, titel, componist: '', arrangeur: '',
    partijen: [{
      id: 'P1', naam: '', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } }, maten,
    }],
    bron: { herkenning: 'browser', bladen: paginas.map((pagina, p) => ({ nummer: pagina.blad ?? p + 1, breedte: pagina.breedte ?? 0, hoogte: pagina.hoogte ?? 0 })) },
  };
}

// De plek van een kop of rust op het blad: linksboven, breedte en hoogte (zoals bij Audiveris).
function plekVan(pagina, p, ding, ia) {
  const breedte = ding.links !== undefined ? ding.rechts - ding.links + 1 : Math.round(ia * 1.2);
  const hoogte = Math.round(ia);
  const x = ding.links !== undefined ? ding.links : Math.round(ding.x - breedte / 2);
  const y = ding.y !== undefined ? Math.round(ding.y - hoogte / 2) : 0;
  return { blad: pagina.blad ?? p + 1, x, y, breedte, hoogte };
}
