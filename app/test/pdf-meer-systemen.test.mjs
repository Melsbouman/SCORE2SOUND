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
  versie: 1, titel: 'Lang stuk', componist: '',
  partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: Array.from({ length: 40 }, (_, i) => maat(i)) }],
});

test('een lang stuk geeft geen leesfouten bij het omzetten van de SVG en bevat alle systemen', async () => {
  const meldingen = [];
  const oud = { warn: console.warn, error: console.error, log: console.log };
  for (const naam of Object.keys(oud)) console[naam] = (...delen) => meldingen.push(delen.join(' '));
  let tekst;
  try {
    tekst = (await maakPdf(naarMusicXML(partituur()), { comprimeer: false })).toString('latin1');
  } finally {
    Object.assign(console, oud);
  }
  assert.deepEqual(meldingen.filter((tekst) => /parseXml|duplicate attribute/i.test(tekst)), []);
  const lijnen = (tekst.match(/\nS\n/g) ?? []).length;
  assert.ok(lijnen >= 100, `er zijn maar ${lijnen} lijnen getekend`);
});
