import test from 'node:test';
import assert from 'node:assert/strict';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';

const partituur = () => ({
  versie: 1, titel: 'T', componist: '',
  partijen: [{ id: 'P1', naam: 'Flugelhorn 1', afkorting: '', instrument: { midiProgramma: 56, transpositie: { chromatisch: -2, diatonisch: -1 } },
    maten: [{ nummer: '1', index: 0, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
      sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }], tempo: null, herhaling: { begin: false, eind: false, keer: 2 },
      elementen: [{ soort: 'noot', start: 0, duur: 1920, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
        overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1 }] }] }],
});

test('in de weergave staat de partijnaam niet voor de balk', () => {
  const xml = naarMusicXML(partituur(), { weergave: true });
  assert.match(xml, /<part-name print-object="no">Flugelhorn 1<\/part-name>/);
});

test('in de export blijft de partijnaam gewoon staan', () => {
  const xml = naarMusicXML(partituur());
  assert.match(xml, /<part-name>Flugelhorn 1<\/part-name>/);
});
