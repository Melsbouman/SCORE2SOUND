import test from 'node:test';
import assert from 'node:assert/strict';
import { maakNetjes } from '../src/server/herken.mjs';

function partituur(tempo = null) {
  const elementen = tempo == null ? [] : [{ soort: 'aanwijzing', start: 0, type: 'tempo', waarde: tempo, zekerheid: 1 }];
  return {
    titel: 'Galop',
    componist: '',
    partijen: [{
      naam: 'Bugel',
      instrument: { midiProgramma: 56, transpositie: { chromatisch: -2, diatonisch: -1 } },
      maten: [{ tempo, elementen }],
    }],
  };
}

test('een tempowoord in credit-words wordt tempo in de eerste maat', () => {
  const stuk = partituur();

  maakNetjes(stuk, '', ['Vivace']);

  assert.equal(stuk.partijen[0].maten[0].tempo, 160);
  assert.deepEqual(stuk.partijen[0].maten[0].elementen, [
    { soort: 'aanwijzing', start: 0, type: 'tempo', waarde: 160, getoond: 'Vivace', zekerheid: 1 },
  ]);
});

test('een bestaand tempo blijft ongewijzigd', () => {
  const stuk = partituur(96);
  const verwacht = structuredClone(stuk.partijen[0].maten[0]);

  maakNetjes(stuk, '', ['Vivace']);

  assert.deepEqual(stuk.partijen[0].maten[0], verwacht);
});
