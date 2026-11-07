import test from 'node:test';
import assert from 'node:assert/strict';
import { maakTuplet } from '../src/model/tuplets.mjs';

function approxEqual(actual, expected, eps = 0.001) {
  assert.ok(Math.abs(actual - expected) <= eps);
}

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

const tupletDef = [
  { id: 'duool', aantal: 2, normaal: 3 },
  { id: 'triool', aantal: 3, normaal: 2 },
  { id: 'kwartool', aantal: 4, normaal: 3 },
  { id: 'kwintool', aantal: 5, normaal: 4 },
  { id: 'sextool', aantal: 6, normaal: 4 },
  { id: 'zeventool', aantal: 7, normaal: 4 },
  { id: 'achttool', aantal: 8, normaal: 6 },
  { id: 'negentool', aantal: 9, normaal: 8 },
];

for (const { id: tupletId, aantal } of [
  { id: 'duool', aantal: 2 },
  { id: 'triool', aantal: 3 },
  { id: 'kwartool', aantal: 4 },
  { id: 'kwintool', aantal: 5 },
  { id: 'sextool', aantal: 6 },
  { id: 'zeventool', aantal: 7 },
  { id: 'achttool', aantal: 8 },
  { id: 'negentool', aantal: 9 },
]) {
  const def = tupletDef.find(t => t.id === tupletId);
  test(`een ${tupletId} heeft ${aantal} noten met samen dezelfde duur`, () => {
    const origineel = partituur();
    const resultaat = maakTuplet(origineel, 'n-P1-0-0', tupletId);
    const elementen = resultaat.partijen[0].maten[0].elementen;

    assert.equal(elementen.length, aantal);
    approxEqual(elementen.reduce((som, element) => som + element.duur, 0), noot.duur);
    assert.deepEqual(elementen.map((element) => element.toonhoogte), Array(aantal).fill(noot.toonhoogte));

    const expectedTuplet = [];
    for (let i = 0; i < aantal; i++) {
      const isFirst = i === 0;
      const isLast = i === aantal - 1;
      expectedTuplet.push({
        aantal: def.aantal,
        normaal: def.normaal,
        begin: isFirst,
        eind: isLast,
      });
    }
    assert.deepEqual(elementen.map((element) => element.tuplet), expectedTuplet);
  });
}

test('een onbekende tupletId geeft een fout', () => {
  const origineel = partituur();
  assert.throws(() => maakTuplet(origineel, 'n-P1-0-0', 'onbekend'), /Onbekende tuplet 'onbekend'/);
});

test('een tuplet die kleiner wordt dan een 64e geeft een fout', () => {
  const kleineNoot = {
    soort: 'noot', start: 0, duur: 480 / 64 - 0.1, stem: 1, notenbalk: 1,
    toonhoogte: { stap: 'C', alter: 0, octaaf: 4 }, akkoord: false,
    overbinding: { begin: false, eind: false }, articulaties: [],
    legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
  };
  const partituurKleine = () => ({
    partijen: [{
      id: 'P1',
      maten: [{ index: 0, elementen: [structuredClone(kleineNoot)] }],
    }],
  });

  const origineel = partituurKleine();
  assert.throws(() => maakTuplet(origineel, 'n-P1-0-0', 'duool'), /kan niet kleiner zijn dan een 64e/);
});