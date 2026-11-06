import test from 'node:test';
import assert from 'node:assert/strict';
import { tempoOverloop } from '../src/model/tempoverloop.mjs';

const tekst = (waarde) => ({ soort: 'aanwijzing', start: 0, type: 'tekst', waarde, zekerheid: 1 });
const noot = (start) => ({
  soort: 'noot',
  start,
  duur: 1920,
  toonhoogte: { stap: 'C', alter: 0, octaaf: 4 },
  articulaties: [],
  fermate: false,
  overbinding: { begin: false, eind: false },
});
const maat = (index, elementen = [], extra = {}) => ({
  nummer: String(index + 1),
  index,
  opmaat: false,
  maatsoort: { teller: 4, noemer: 4 },
  tempo: null,
  elementen,
  ...extra,
});

function partituur() {
  const maten = Array.from({ length: 7 }, (_, idx) => maat(idx, [noot(0)]));
  maten[0].tempo = 100;
  maten[2].elementen.push(tekst('accel.'));
  maten[4].elementen.push(tekst('a tempo'));
  return {
    partijen: [{
      id: 'P1',
      naam: 'Piano',
      instrument: { midiProgramma: 0, transpositie: { chromatisch: 0 } },
      maten,
    }],
  };
}

test('tempoOverloop versnelt vanaf accel. in maat 3 tot a tempo in maat 5 en herstelt tempo 100', () => {
  assert.deepEqual(tempoOverloop(partituur()), [{ vanMaat: 2, totMaat: 4, factorEind: 1.2 }]);
});
