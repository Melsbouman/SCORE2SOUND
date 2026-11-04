import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { heeftOrigineleRegels } from '../src/musicxml/regels.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';
import { maakPdf } from '../src/export/pdf.mjs';

const maat = (index, extra = {}) => ({
  nummer: String(index + 1), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }], tempo: null, herhaling: { begin: false, eind: false, keer: 2 },
  elementen: [{ soort: 'noot', start: 0, duur: 1920, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
    overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1 }],
  ...extra,
});
const stuk = (regelbegin) => ({
  versie: 1, titel: 'T', componist: '',
  partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: Array.from({ length: 12 }, (_, i) => maat(i, regelbegin.includes(i) ? { regelbegin: true } : {})) }],
});

test('de regelindeling van het origineel wordt herkend als er minstens twee regelbegins zijn', () => {
  assert.equal(heeftOrigineleRegels(naarMusicXML(stuk([0, 3, 6, 9]))), true);
  assert.equal(heeftOrigineleRegels(naarMusicXML(stuk([0]))), false);
  assert.equal(heeftOrigineleRegels(naarMusicXML(stuk([]))), false);
});

test('de pdf en de editor laten onderaan de pagina ruimte voor de voetregel', async () => {
  for (const pad of ['../src/export/pdf.mjs', '../public/js/weergave.js']) {
    const bron = await readFile(new URL(pad, import.meta.url), 'utf8');
    assert.ok(bron.includes('pageMarginBottom: 250'), pad);
  }
});

test('een pdf met vaste regels is een geldig bestand', async () => {
  const pdf = await maakPdf(naarMusicXML(stuk([0, 3, 6, 9])), { comprimeer: false, watermerk: false });
  assert.equal(pdf.subarray(0, 5).toString('latin1'), '%PDF-');
});
