import test from 'node:test';
import assert from 'node:assert/strict';
import { maatIndexVanNummer, speelVolgorde, uitgevouwen } from '../src/model/maten.mjs';

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

const herhaalMaten = (...strepen) => strepen.map((herhaling, index) => ({ nummer: String(index + 1), index, herhaling: { begin: false, eind: false, keer: 2, ...herhaling }, elementen: [] }));

test('speelVolgorde volgt herhaalstrepen', () => {
  assert.deepEqual(speelVolgorde(herhaalMaten({}, {}, {})), [0, 1, 2]);
  assert.deepEqual(speelVolgorde(herhaalMaten({}, { eind: true }, {})), [0, 1, 0, 1, 2]);
  assert.deepEqual(speelVolgorde(herhaalMaten({}, { begin: true }, { eind: true }, {})), [0, 1, 2, 1, 2, 3]);
  assert.deepEqual(speelVolgorde(herhaalMaten({ eind: true, keer: 3 }, {})), [0, 0, 0, 1]);
  assert.deepEqual(speelVolgorde(herhaalMaten({ eind: true }, {}, { eind: true })), [0, 0, 1, 2, 1, 2]);
  assert.deepEqual(speelVolgorde([]), []);
});

test('uitgevouwen herhaalt de maten in elke partij, zonder herhaalstrepen', () => {
  const maten = herhaalMaten({ eind: true }, {});
  const uit = uitgevouwen({ partijen: [{ id: 'A', maten }, { id: 'B', maten }] });
  assert.deepEqual(uit.partijen[1].maten.map((m) => [m.nummer, m.index, m.herhaling.eind]), [['1', 0, false], ['1', 1, false], ['2', 2, false]]);
  assert.equal(maten[0].herhaling.eind, true);
});

