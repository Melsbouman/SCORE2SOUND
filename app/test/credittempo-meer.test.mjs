import test from 'node:test';
import assert from 'node:assert/strict';
import { creditTempos } from '../src/model/credittempo.mjs';

test("alle tempo's blijven per pagina in volgorde van y", () => {
  const credits = [
    { tekst: 'J = 90', pagina: 0, x: 100, y: 1000 },
    { tekst: 'J 110', pagina: 0, x: 100, y: 1200 },
    { tekst: 'J = 120', pagina: 0, x: 100, y: 1500 },
    { tekst: 'J = 100', pagina: 1, x: 100, y: 1600 },
  ];

  assert.deepEqual(creditTempos(credits), [
    { pagina: 0, x: 100, y: 1000, bpm: 90, genoemd: null },
    { pagina: 0, x: 100, y: 1500, bpm: 120, genoemd: null },
    { pagina: 1, x: 100, y: 1600, bpm: 100, genoemd: null },
  ]);
});
