import test from 'node:test';
import assert from 'node:assert/strict';
import { creditTempos } from '../src/model/credittempo.mjs';

test('een kwartnoot met gelijkteken geeft het metronoomgetal', () => {
  const credits = [{ tekst: '♩ = 96', pagina: 0, x: 100, y: 500 }];

  assert.deepEqual(creditTempos(credits), [
    { pagina: 0, x: 100, y: 500, bpm: 96, genoemd: null },
  ]);
});

test('losse getallen geven geen metronoomgetal', () => {
  const credits = ['12', '28', '120'].map((tekst) => (
    { tekst, pagina: 0, x: 100, y: 500 }
  ));

  assert.deepEqual(creditTempos(credits), []);
});

test('een metronoomgetal buiten het bereik geeft niets', () => {
  const credits = [{ tekst: 'J = 500', pagina: 0, x: 100, y: 500 }];

  assert.deepEqual(creditTempos(credits), []);
});

test('een punt na de noot wordt als gepunt genoemd', () => {
  const credits = [{ tekst: 'J. = 60', pagina: 1, x: 200, y: 400 }];

  assert.deepEqual(creditTempos(credits), [
    { pagina: 1, x: 200, y: 400, bpm: 60, genoemd: 'gepunt' },
  ]);
});
