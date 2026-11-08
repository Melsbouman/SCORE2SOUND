import test from 'node:test';
import assert from 'node:assert/strict';
import { maakOnzeker } from '../src/server/omr.mjs';

test('noten en rusten op een niet-gekoppelde pagina krijgen hooguit zekerheid 0,5', () => {
  const maat = {
    elementen: [
      { soort: 'noot', start: 0, duur: 480, zekerheid: 1 },
      { soort: 'rust', start: 480, duur: 480 },
      { soort: 'noot', start: 960, duur: 960, zekerheid: 0.3 },
      { soort: 'aanwijzing', start: 0, type: 'dynamiek', waarde: 'mf', zekerheid: 1 },
    ],
  };
  maakOnzeker(maat);
  assert.deepEqual(maat.elementen.map((e) => e.zekerheid), [0.5, 0.5, 0.3, 1]);
});

test('een ontbrekende maat geeft geen fout', () => {
  assert.doesNotThrow(() => maakOnzeker(undefined));
});
