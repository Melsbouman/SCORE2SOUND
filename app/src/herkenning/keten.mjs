// De keten van de eigen herkenning, voor de browser (in een Web Worker) en voor Node: van grijze bladzijden naar een partituur
// als concept, met dezelfde herstelketen als na Audiveris (voor zover die zonder server en tekstherkenning draait).
// Per bladzijde: zwart-wit (met een drempel net onder het papier als er met Otsu geen notenbalken zijn), schaal, notenbalken,
// maten, notenbalklijnen weg, balkkop (sleutel, voortekening, maatsoort), nootkoppen, duren, hulplijnen weg, voortekens, rusten,
// het aantal maten boven een meermaatsrust en de cijfers boven groepen (triolen). Daarna de opbouw tot het model (opbouw.mjs)
// en de herstelketen: herstelHerkenning, vulRustGaten, herstelTriolen, lege maten vullen, maatduur controleren, foute maten en
// verdachte noten markeren.
import { zwartWit, papierDrempel, verkleinMet } from './beeld.mjs';
import { meetSchaal } from './schaal.mjs';
import { vindBalken } from './raster.mjs';
import { zetRechtop } from './rechtop.mjs';
import { verwijderLijnen } from './vormen.mjs';
import { vindMaten } from './maten.mjs';
import { leesBalkkoppen } from './kop.mjs';
import { zoekNootkoppen } from './koppen.mjs';
import { bepaalDuren } from './duren.mjs';
import { verwijderHulplijnen } from './hulplijnen.mjs';
import { zoekVoortekens } from './voortekens.mjs';
import { zoekRusten } from './rusten.mjs';
import { leesMeermaatsAantallen } from './cijfers.mjs';
import { leesTriolen } from './groepcijfers.mjs';
import { bouwPartituur } from './opbouw.mjs';
import { herstelHerkenning } from '../model/herstel.mjs';
import { vulRustGaten } from '../model/rustgaten.mjs';
import { herstelTriolen } from '../model/triolenherstel.mjs';
import { markeerVerdachteNoten } from '../model/verdacht.mjs';
import { controleerMaatduur, maatsoortVermoedens } from '../controle/maatduur.mjs';
import { vulLegeMaten, markeerFouteMaten } from '../controle/nabewerken.mjs';

// De lijnafstand (pixels) waarop de herkenning werkt; een blad met meer dan VERKLEIN_VANAF keer zoveel wordt eerst verkleind.
// (Suite Gothique, gescand op 300 dpi met 18,7 pixels per lijnafstand: 234 maten met een verkeerde duur, verkleind 152.)
export const DOEL_LIJNAFSTAND = 12.5;
const VERKLEIN_VANAF = 1.2;

// Eén grijze bladzijde ({ breedte, hoogte, pixels } met 0 = zwart, 255 = wit) herkennen. Geeft alle tussenresultaten (voor de
// opbouw en voor metingen); zonder notenbalken is `raster.balken` leeg.
export function herkenPagina(origineel) {
  let grijs = origineel;
  let zw;
  let schaal;
  let raster;
  const lees = () => {
    zw = zwartWit(grijs);
    schaal = meetSchaal(zw);
    raster = vindBalken(zw, schaal);
    // Geen notenbalken: misschien lichtgrijze notenbalklijnen (een digitale pdf die de lijnen grijs tekent).
    if (!raster.balken.length) {
      zw = zwartWit(grijs, { drempel: papierDrempel(grijs.pixels) });
      schaal = meetSchaal(zw);
      raster = vindBalken(zw, schaal);
    }
  };
  lees();
  // Een scan met een grote lijnafstand (300 dpi of meer) verkleinen we eerst tot ongeveer DOEL_LIJNAFSTAND pixels per
  // lijnafstand: de sjablonen en drempels zijn daarop afgesteld, en op een hoge resolutie zijn de randen van open koppen naar
  // verhouding dun. De plekken (vak, plek) gelden dan voor het verkleinde blad (breedte en hoogte). Niet verder dan dat de
  // notenbalklijnen minstens een pixel dik blijven (dunnere lijnen worden na het middelen te lichtgrijs), en vindt het
  // verkleinde blad minder notenbalken, dan blijft het origineel.
  if (schaal && raster.balken.length && schaal.lijnafstand > DOEL_LIJNAFSTAND * VERKLEIN_VANAF) {
    const factor = Math.min(schaal.lijnafstand / DOEL_LIJNAFSTAND, schaal.lijndikte ?? 0);
    if (factor > VERKLEIN_VANAF) {
      const eerst = { zw, schaal, raster };
      grijs = verkleinMet(origineel, factor);
      lees();
      if (!schaal || raster.balken.length < eerst.raster.balken.length) {
        grijs = origineel;
        ({ zw, schaal, raster } = eerst);
      }
    }
  }
  const leeg = { breedte: grijs.breedte, hoogte: grijs.hoogte, schaal, raster, maten: [], balkkoppen: [], noten: [], voortekens: [], rusten: [], aantallen: [], triolen: [] };
  if (!schaal || !raster.balken.length) return leeg;
  const kaal = verwijderLijnen(zw, raster, schaal);
  const maten = vindMaten(zw, raster, schaal);
  const balkkoppen = leesBalkkoppen(kaal, raster, schaal, { zw, strepen: maten.map((maat) => maat.strepen) });
  const koppen = zoekNootkoppen(kaal, raster, schaal, { balkkoppen, zw });
  const noten = bepaalDuren(kaal, raster, schaal, koppen);
  // Voortekens op het beeld zonder hulplijnen: een kruis dat een hulplijn raakt, is dan een losse vorm.
  const zonderHulplijnen = verwijderHulplijnen(kaal, raster, schaal, koppen);
  const voortekens = zoekVoortekens(zonderHulplijnen, raster, schaal, { koppen: noten, balkkoppen });
  const rusten = zoekRusten(kaal, raster, schaal, { koppen, strepen: maten.map((maat) => maat.strepen), balkkoppen, voortekens, noten });
  const aantallen = leesMeermaatsAantallen(kaal, raster, schaal, rusten);
  const triolen = leesTriolen(kaal, raster, schaal, noten);
  return { breedte: grijs.breedte, hoogte: grijs.hoogte, schaal, raster, maten, balkkoppen, noten, voortekens, rusten, aantallen, triolen };
}

// Een melding over de herkenning zelf (zoals de server die geeft).
const herkenMelding = (tekst) => ({ soort: 'herkenning', ernst: 'waarschuwing', partij: null, maat: null, tekst });

function fout(tekst, code) {
  const uit = new Error(tekst);
  uit.code = code;
  return uit;
}

// De herkende bladzijden (uitkomsten van herkenPagina met `blad`, in volgorde) als partituur, met de herstelketen erachter.
// opties: { titel, overgeslagen: [{ blad, reden }] } (bladzijden die al eerder wegvielen). Geeft { partituur, meldingen,
// bladenZonderBalken }. Zijn er nergens notenbalken, dan een fout met code 'geen-notenbalken'.
export function bouwUitPaginas(paginas, { titel = '', overgeslagen = [] } = {}) {
  const bladenZonderBalken = paginas.filter((pagina) => !pagina.raster?.balken?.length).map((pagina) => pagina.blad);
  const metBalken = paginas.filter((pagina) => pagina.raster?.balken?.length);
  if (!metBalken.length) throw fout('Op deze bladzijden zijn geen notenbalken gevonden.', 'geen-notenbalken');
  let partituur = bouwPartituur(metBalken, { titel });
  partituur = {
    ...partituur,
    bron: { herkenning: 'browser', bladen: metBalken.map((pagina) => ({ nummer: pagina.blad, breedte: pagina.breedte, hoogte: pagina.hoogte, herkomst: pagina.herkomst })) },
  };
  partituur = herstelHerkenning(partituur);
  const rustGaten = vulRustGaten(partituur);
  const triolen = herstelTriolen(rustGaten.partituur);
  partituur = vulLegeMaten(triolen.partituur);
  const maatMeldingen = [...controleerMaatduur(partituur), ...maatsoortVermoedens(partituur)];
  partituur = markeerVerdachteNoten(markeerFouteMaten(partituur, maatMeldingen));
  const meldingen = [
    ...overgeslagen.map(({ blad }) => herkenMelding(`Pagina ${blad} is overgeslagen: daar kon de app geen muziek lezen.`)),
    ...bladenZonderBalken.map((blad) => herkenMelding(`Op pagina ${blad} zijn geen notenbalken gevonden.`)),
    ...(rustGaten.meldingen ?? []),
    ...(triolen.meldingen ?? []),
    ...maatMeldingen,
  ];
  return { partituur, meldingen, bladenZonderBalken };
}

// Grijze bladzijden (in volgorde, met `blad`) herkennen en als partituur opbouwen. Een bladzijde waar de herkenning op vastloopt,
// wordt overgeslagen. opties: { titel, voortgang({ fase: 'blad' | 'opbouw', blad, van }) }.
export function herkenPartituur(grijzen, { titel = '', voortgang = () => {} } = {}) {
  const paginas = [];
  const overgeslagen = [];
  let opschuiving = 0;
  grijzen.forEach((grijs, i) => {
    const pagina = grijs.blad ?? i + 1;
    voortgang({ fase: 'blad', blad: i + 1, van: grijzen.length });
    let delen;
    try {
      delen = zetRechtop(grijs);
    } catch {
      delen = [grijs];
    }
    delen.forEach((deel, j) => {
      const blad = pagina + opschuiving + j;
      const herkomst = { pagina, draai: deel.herkomst?.draai ?? 0, helft: deel.herkomst?.helft ?? null };
      try {
        paginas.push({ ...herkenPagina(deel), blad, herkomst });
      } catch {
        overgeslagen.push({ blad, reden: 'fout' });
      }
    });
    opschuiving += delen.length - 1;
  });
  voortgang({ fase: 'opbouw', blad: grijzen.length, van: grijzen.length });
  return bouwUitPaginas(paginas, { titel, overgeslagen });
}
