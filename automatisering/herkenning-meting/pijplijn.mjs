// De eigen herkenning (app/src/herkenning) op één bladzijde, voor de metingen in deze map. Leest een PGM-bestand (grijs,
// zoals teken.py het maakt) en geeft per balk de balkkop, nootkoppen met duur, voortekens, maten en rusten.
// Met de omgevingsvariabele HERK kan een andere map met herkenningsmodules gemeten worden (bijvoorbeeld main naast een
// werkkopie): HERK=C:/andere/app/src/herkenning node ...
import { readFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';

const HERK = process.env.HERK || fileURLToPath(new URL('../../app/src/herkenning', import.meta.url));
const laad = (naam) => import(pathToFileURL(`${HERK}/${naam}`).href);
const { zwartWit, papierDrempel } = await laad('beeld.mjs');
const { meetSchaal } = await laad('schaal.mjs');
const { vindBalken } = await laad('raster.mjs');
const { verwijderLijnen } = await laad('vormen.mjs');
const { zoekNootkoppen } = await laad('koppen.mjs');
const { bepaalDuren } = await laad('duren.mjs');
const { vindMaten } = await laad('maten.mjs');
const { zoekRusten } = await laad('rusten.mjs');
// Oudere versies hebben nog geen balkkop of voortekens.
const optioneel = async (naam) => { try { return await laad(naam); } catch (fout) { if (String(fout).includes('Cannot find')) return null; throw fout; } };
const kop = await optioneel('kop.mjs');
const voortekens = await optioneel('voortekens.mjs');
const hulplijnen = await optioneel('hulplijnen.mjs');
const cijfers = await optioneel('cijfers.mjs');
const opbouw = await optioneel('opbouw.mjs');
const groepcijfers = await optioneel('groepcijfers.mjs');

export function leesPgm(pad) {
  const buffer = readFileSync(pad);
  let plek = 0;
  const velden = [];
  const wit = (c) => c === 9 || c === 10 || c === 13 || c === 32;
  while (velden.length < 4) {
    while (wit(buffer[plek])) plek += 1;
    if (buffer[plek] === 35) { while (buffer[plek] !== 10) plek += 1; continue; }
    let veld = '';
    while (!wit(buffer[plek])) veld += String.fromCharCode(buffer[plek++]);
    velden.push(veld);
  }
  plek += 1;
  const [, breedte, hoogte] = velden.map(Number);
  return { breedte, hoogte, pixels: new Uint8Array(buffer.subarray(plek, plek + breedte * hoogte)) };
}

export function herken(pad) {
  const begin = Date.now();
  const grijs = leesPgm(pad);
  let zw = zwartWit(grijs);
  let schaal = meetSchaal(zw);
  let raster = vindBalken(zw, schaal);
  // Geen balken: misschien lichtgrijze notenbalklijnen; opnieuw met een drempel net onder het papier.
  if (!raster.balken.length && papierDrempel) {
    zw = zwartWit(grijs, { drempel: papierDrempel(grijs.pixels) });
    schaal = meetSchaal(zw);
    raster = vindBalken(zw, schaal);
  }
  const kaal = verwijderLijnen(zw, raster, schaal);
  const maten = vindMaten(zw, raster, schaal);
  const balkkoppen = kop ? kop.leesBalkkoppen(kaal, raster, schaal, { zw }) : null;
  const koppen = zoekNootkoppen(kaal, raster, schaal, { balkkoppen });
  const noten = bepaalDuren(kaal, raster, schaal, koppen);
  // Voortekens op het beeld zonder hulplijnen: een kruis dat een hulplijn raakt, is dan een losse vorm.
  const zonderHulplijnen = hulplijnen ? hulplijnen.verwijderHulplijnen(kaal, raster, schaal, koppen) : kaal;
  const tekens = voortekens ? voortekens.zoekVoortekens(zonderHulplijnen, raster, schaal, { koppen: noten, balkkoppen }) : null;
  const rusten = zoekRusten(kaal, raster, schaal, { koppen, strepen: maten.map((m) => m.strepen), balkkoppen, voortekens: tekens, noten });
  const aantallen = cijfers ? cijfers.leesMeermaatsAantallen(kaal, raster, schaal, rusten) : null;
  const triolen = groepcijfers ? groepcijfers.leesTriolen(kaal, raster, schaal, noten) : null;
  return {
    breedte: grijs.breedte, hoogte: grijs.hoogte, schaal, raster, maten, balkkoppen, noten, voortekens: tekens, rusten, aantallen, triolen,
    tijd: Date.now() - begin,
  };
}

// Het muziekmodel (opbouw.mjs) uit een of meer bladzijden (PGM-paden, in volgorde).
export function bouwModel(paden, { titel = '' } = {}) {
  if (!opbouw) throw new Error('opbouw.mjs ontbreekt in deze versie van de herkenning');
  const paginas = paden.map((pad, i) => {
    const r = herken(pad);
    const { maten } = r;
    return { blad: i + 1, breedte: r.breedte, hoogte: r.hoogte, raster: r.raster, schaal: r.schaal, maten, balkkoppen: r.balkkoppen,
      noten: r.noten, voortekens: r.voortekens, rusten: r.rusten, aantallen: r.aantallen, triolen: r.triolen };
  });
  return opbouw.bouwPartituur(paginas, { titel });
}
