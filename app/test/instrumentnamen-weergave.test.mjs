import test from 'node:test';
import assert from 'node:assert/strict';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';

const partij = (id, naam, afkorting) => ({
  id, naam, afkorting, instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
  maten: [{ nummer: '1', index: 0, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
    sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }], tempo: null, herhaling: { begin: false, eind: false, keer: 2 },
    elementen: [{ soort: 'noot', start: 0, duur: 1920, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
      overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1 }] }],
});
const partituur = (...partijen) => ({ versie: 1, titel: 'T', componist: '', partijen });

test('in een partituur met meer partijen staan de instrumentnamen voor de regel', () => {
  const xml = naarMusicXML(partituur(partij('P1', 'Fluit', 'Fl.'), partij('P2', 'Hoorn', '')), { weergave: true });
  assert.match(xml, /<part-name>Fluit<\/part-name>/);
  assert.match(xml, /<part-name>Hoorn<\/part-name>/);
  assert.match(xml, /<part-abbreviation>Fl\.<\/part-abbreviation>/);
  assert.match(xml, /<part-abbreviation>Hoorn<\/part-abbreviation>/);
  assert.ok(!/<part-name print-object="no"/.test(xml));
  assert.ok(!/<part-abbreviation-display print-object="no"/.test(xml));
});

test('in een losse partij staat de naam niet voor de regel', () => {
  const xml = naarMusicXML(partituur(partij('P1', 'Fluit', 'Fl.')), { weergave: true });
  assert.match(xml, /<part-name print-object="no">Fluit<\/part-name>/);
  assert.match(xml, /<part-abbreviation-display print-object="no"/);
});

test('verborgen partijen tellen niet mee voor de keuze', () => {
  const xml = naarMusicXML(partituur(partij('P1', 'Fluit', 'Fl.'), partij('P2', 'Hoorn', '')), { weergave: true, verberg: ['P2'] });
  assert.match(xml, /<part-name print-object="no">Fluit<\/part-name>/);
});
