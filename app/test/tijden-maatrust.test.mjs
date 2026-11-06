import test from 'node:test';
import assert from 'node:assert/strict';
import { maatTijden } from '../src/midi/tijdlijn.mjs';

const noot = {
  soort: 'noot', start: 0, duur: 480, stem: 1, notenbalk: 1,
  toonhoogte: { stap: 'C', alter: 0, octaaf: 4 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [],
  legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
};

const maat = (index, extra = {}) => ({
  nummer: String(index + 1),
  index,
  opmaat: false,
  maatsoort: { teller: 4, noemer: 4 },
  toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [],
  tempo: index === 0 ? 120 : null,
  herhaling: { begin: false, eind: false, keer: 2 },
  elementen: [],
  ...extra,
});

test('de tijd loopt door een maatrust van negen maten', () => {
  const maten = [maat(0, { maatrust: 9 })];
  for (let index = 1; index < 9; index += 1) maten.push(maat(index, { verborgen: true }));
  maten.push(maat(9));
  maten.push(maat(10, { elementen: [noot] }));
  const partituur = {
    versie: 1,
    titel: 'Maatrust',
    componist: '',
    partijen: [{
      id: 'P1',
      naam: 'Piano',
      instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
      maten,
    }],
  };

  assert.equal(maatTijden(partituur).at(-1), 20);
});
