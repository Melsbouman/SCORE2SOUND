// De keten van de eigen herkenning, voor de browser (in een Web Worker) en voor Node: van grijze bladzijden naar een partituur
// als concept, met dezelfde herstelketen als na Audiveris (voor zover die zonder server en tekstherkenning draait).
// Per bladzijde: zwart-wit (met een drempel net onder het papier als er met Otsu geen notenbalken zijn), schaal, notenbalken,
// maten, notenbalklijnen weg, balkkop (sleutel, voortekening, maatsoort), nootkoppen, duren, hulplijnen weg, voortekens, rusten,
// het aantal maten boven een meermaatsrust en de cijfers boven groepen (triolen). Daarna de opbouw tot het model (opbouw.mjs)
// en de herstelketen: herstelHerkenning, vulRustGaten, herstelTriolen, lege maten vullen, maatduur controleren, foute maten en
// verdachte noten markeren.
import { zwartWit, papierDrempel } from './beeld.mjs';
import { meetSchaal } from './schaal.mjs';
import { vindBalken } from './raster.mjs';
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

// Eén grijze bladzijde ({ breedte, hoogte, pixels } met 0 = zwart, 255 = wit) herkennen. Geeft alle tussenresultaten (voor de
// opbouw en voor metingen); zonder notenbalken is `raster.balken` leeg.
export function herkenPagina(grijs) {
  let zw = zwartWit(grijs);
  let schaal = meetSchaal(zw);
  let raster = vindBalken(zw, schaal);
  // Geen notenbalken: misschien lichtgrijze notenbalklijnen (een digitale pdf die de lijnen grijs tekent).
  if (!raster.balken.length) {
    zw = zwartWit(grijs, { drempel: papierDrempel(grijs.pixels) });
    schaal = meetSchaal(zw);
    raster = vindBalken(zw, schaal);
  }
  const leeg = { breedte: grijs.breedte, hoogte: grijs.hoogte, schaal, raster, maten: [], balkkoppen: [], noten: [], voortekens: [], rusten: [], aantallen: [], triolen: [] };
  if (!schaal || !raster.balken.length) return leeg;
  const kaal = verwijderLijnen(zw, raster, schaal);
  const maten = vindMaten(zw, raster, schaal);
  const balkkoppen = leesBalkkoppen(kaal, raster, schaal, { zw, strepen: maten.map((maat) => maat.strepen) });
  const koppen = zoekNootkoppen(kaal, raster, schaal, { balkkoppen });
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
    bron: { herkenning: 'browser', bladen: metBalken.map((pagina) => ({ nummer: pagina.blad, breedte: pagina.breedte, hoogte: pagina.hoogte })) },
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
  grijzen.forEach((grijs, i) => {
    const blad = grijs.blad ?? i + 1;
    voortgang({ fase: 'blad', blad: i + 1, van: grijzen.length });
    try {
      paginas.push({ ...herkenPagina(grijs), blad });
    } catch {
      overgeslagen.push({ blad, reden: 'fout' });
    }
  });
  voortgang({ fase: 'opbouw', blad: grijzen.length, van: grijzen.length });
  return bouwUitPaginas(paginas, { titel, overgeslagen });
}
