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
  const maten = Array.from({ length: 5 }, (_, idx) => maat(idx, [noot(0)]));
  maten[0].tempo = 120;
  maten[1].elementen.push(tekst('rall.'));
  maten[2].elementen.push(tekst('a tempo'));
  return {
    partijen: [{
      id: 'P1',
      naam: 'Piano',
      instrument: { midiProgramma: 0, transpositie: { chromatisch: 0 } },
      maten,
    }],
  };
}

test('tempoOverloop loopt van rall. in maat 2 tot a tempo in maat 3 en herstelt het tempo', () => {
  assert.deepEqual(tempoOverloop(partituur()), [{ vanMaat: 1, totMaat: 2, factorEind: 0.75 }]);
});
