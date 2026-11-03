import test from 'node:test';
import assert from 'node:assert/strict';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';
import { maakPdf } from '../src/export/pdf.mjs';

const noot = (start) => ({
  soort: 'noot', start, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
});
const maat = (index) => ({
  nummer: String(index + 1), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }], tempo: null, herhaling: { begin: false, eind: false, keer: 2 },
  elementen: [noot(0), noot(480), noot(960), noot(1440)],
});
const partituur = () => ({
  versie: 1, titel: 'Lang', componist: '',
  partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: Array.from({ length: 12 }, (_, i) => maat(i)) }],
});
const tekstUit = (pdf) => [...pdf.toString('latin1').matchAll(/\[([^\]]*)\]\s*TJ/g)]
  .map((reeks) => [...reeks[1].matchAll(/<([0-9a-f]*)>/gi)].map((stuk) => Buffer.from(stuk[1], 'hex').toString('latin1')).join(''))
  .join('\n');

test('elke pagina heeft onderaan een paginanummer', async () => {
  const pdf = await maakPdf(naarMusicXML(partituur()), { comprimeer: false });
  const paginas = (pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length;
  const tekst = tekstUit(pdf);
  for (let nummer = 1; nummer <= paginas; nummer += 1) {
    assert.ok(tekst.includes(`pagina ${nummer} van ${paginas}`), `pagina ${nummer} van ${paginas} ontbreekt`);
  }
});
