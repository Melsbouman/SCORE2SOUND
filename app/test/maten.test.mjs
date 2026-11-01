import test from 'node:test';
import assert from 'node:assert/strict';
import { maatIndexVanNummer } from '../src/model/maten.mjs';

const maten = ['0', '1', '2', 'X1', '3'].map((nummer, index) => ({ nummer, index }));

test('maatIndexVanNummer zoekt het maatnummer zoals op het blad', () => {
  assert.equal(maatIndexVanNummer(maten, '0'), 0);
  assert.equal(maatIndexVanNummer(maten, '3'), 4);
  assert.equal(maatIndexVanNummer(maten, 'X1'), 3);
  assert.equal(maatIndexVanNummer(maten, ' 2 '), 2);
});

test('een onbekend nummer valt terug op de dichtstbijzijnde plek', () => {
  assert.equal(maatIndexVanNummer(maten, '99'), 4);
  assert.equal(maatIndexVanNummer(maten, ''), 0);
  assert.equal(maatIndexVanNummer(maten, 'abc'), 0);
  assert.equal(maatIndexVanNummer([], '1'), 0);
});
