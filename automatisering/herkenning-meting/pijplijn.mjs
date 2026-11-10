// De eigen herkenning (app/src/herkenning) op één bladzijde, voor de metingen in deze map. Leest een PGM-bestand (grijs,
// zoals teken.py het maakt) en geeft per balk de balkkop, nootkoppen met duur, voortekens, maten en rusten.
// herken volgt herkenPagina uit keten.mjs (dezelfde stappen als de herkenning in de browser).
// Met de omgevingsvariabele HERK kan een andere map met herkenningsmodules gemeten worden (bijvoorbeeld main naast een
// werkkopie): HERK=C:/andere/app/src/herkenning node ... HERK moet naar een map met keten.mjs wijzen.
import { readFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';

const HERK = process.env.HERK || fileURLToPath(new URL('../../app/src/herkenning', import.meta.url));
const laad = (naam) => import(pathToFileURL(`${HERK}/${naam}`).href);
const { herkenPagina } = await laad('keten.mjs');
// Oudere versies hebben nog geen opbouw.
const optioneel = async (naam) => { try { return await laad(naam); } catch (fout) { if (String(fout).includes('Cannot find')) return null; throw fout; } };
const opbouw = await optioneel('opbouw.mjs');

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
  const uitkomst = herkenPagina(leesPgm(pad));
  return { ...uitkomst, tijd: Date.now() - begin };
}

// Het muziekmodel (opbouw.mjs) uit een of meer bladzijden (PGM-paden, in volgorde).
export function bouwModel(paden, { titel = '' } = {}) {
  if (!opbouw) throw new Error('opbouw.mjs ontbreekt in deze versie van de herkenning');
  const paginas = paden.map((pad, i) => {
    const r = herken(pad);
    const { maten } = r;
    return { blad: i + 1, breedte: r.breedte, hoogte: r.hoogte, raster: r.raster, schaal: r.schaal, maten, balkkoppen: r.balkkoppen,
      noten: r.noten, voortekens: r.voortekens, rusten: r.rusten, aantallen: r.aantallen, triolen: r.triolen, hokjes: r.hokjes };
  });
  return opbouw.bouwPartituur(paginas, { titel });
}
