import test from 'node:test';
import assert from 'node:assert/strict';
import { maakTriool, maakTriooLos } from '../src/model/triolen.mjs';

const noot = {
  soort: 'noot', start: 0, duur: 480, stem: 1, notenbalk: 1,
  toonhoogte: { stap: 'C', alter: 0, octaaf: 4 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [],
  legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
};
const partituur = () => ({
  partijen: [{
    id: 'P1',
    maten: [{ index: 0, elementen: [structuredClone(noot)] }],
  }],
});

test('een triool heeft drie noten met samen dezelfde duur en behoudt de toonhoogte', () => {
  const origineel = partituur();
  const resultaat = maakTriool(origineel, 'n-P1-0-0');
  const elementen = resultaat.partijen[0].maten[0].elementen;

  assert.equal(elementen.length, 3);
  assert.equal(elementen.reduce((som, element) => som + element.duur, 0), noot.duur);
  assert.deepEqual(elementen.map((element) => element.toonhoogte), [
    noot.toonhoogte, noot.toonhoogte, noot.toonhoogte,
  ]);
  assert.deepEqual(elementen.map((element) => element.tuplet), [
    { aantal: 3, normaal: 2, begin: true, eind: false },
    { aantal: 3, normaal: 2, begin: false, eind: false },
    { aantal: 3, normaal: 2, begin: false, eind: true },
  ]);
  assert.deepEqual(origineel.partijen[0].maten[0].elementen, [noot]);
});

test('een triool weer losmaken geeft de oorspronkelijke noot terug', () => {
  const origineel = partituur();
  const triool = maakTriool(origineel, 'n-P1-0-0');
  const los = maakTriooLos(triool, 'n-P1-0-1');

  assert.deepEqual(los.partijen[0].maten[0].elementen, [noot]);
  assert.deepEqual(origineel.partijen[0].maten[0].elementen, [noot]);
});
