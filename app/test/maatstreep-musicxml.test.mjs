import test from 'node:test';
import assert from 'node:assert/strict';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';

const maat = (index, extra = {}) => ({
  nummer: String(index + 1), index, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }], tempo: null,
  herhaling: { begin: false, eind: false, keer: 2 },
  elementen: [{ soort: 'rust', start: 0, duur: 1920, stem: 1, notenbalk: 1, heleMaat: true, zekerheid: 1 }], ...extra,
});
const stuk = () => ({
  titel: 'Proef', makers: [],
  partijen: [{ id: 'P1', naam: 'Cornet', afkorting: '', instrument: { midiProgramma: 56, transpositie: { chromatisch: 0, diatonisch: 0 } }, maten: [
    maat(0, { maatsoort: { teller: 2, noemer: 2, symbool: 'cut' } }),
    maat(1, { maatsoort: { teller: 2, noemer: 2, symbool: 'cut' }, maatstreep: 'dubbel' }),
    maat(2, { maatsoort: { teller: 2, noemer: 2, symbool: 'cut' }, maatstreep: 'eind' }),
  ] }],
});

test('een dubbele maatstreep en een eindstreep gaan naar MusicXML en komen terug', () => {
  const xml = naarMusicXML(stuk());
  assert.match(xml, /<bar-style>light-light<\/bar-style>/);
  assert.match(xml, /<bar-style>light-heavy<\/bar-style>/);
  const terug = leesMusicXML(xml);
  assert.deepEqual(terug.partijen[0].maten.map((m) => m.maatstreep ?? null), [null, 'dubbel', 'eind']);
});

test('het alla-breveteken gaat als symbol naar MusicXML en komt terug', () => {
  const xml = naarMusicXML(stuk());
  assert.match(xml, /<time symbol="cut">/);
  assert.deepEqual(leesMusicXML(xml).partijen[0].maten[0].maatsoort, { teller: 2, noemer: 2, symbool: 'cut' });
});

test('een herhaling eind blijft een herhaalteken, ook met een maatstreep erbij', () => {
  const partituur = stuk();
  partituur.partijen[0].maten[1].herhaling.eind = true;
  const xml = naarMusicXML(partituur);
  assert.match(xml, /<repeat direction="backward"/);
  assert.equal((xml.match(/light-light/g) ?? []).length, 0);
});
