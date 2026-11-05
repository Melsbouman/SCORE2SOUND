import assert from 'node:assert/strict';
import test from 'node:test';

import { voorbeeldStukken } from '../src/model/voorbeeldstukken.mjs';

test('de ontdekrij bevat vier voorbeeldstukken met unieke ids', () => {
  const voorbeelden = voorbeeldStukken();
  assert.equal(voorbeelden.length, 4);
  assert.equal(new Set(voorbeelden.map((voorbeeld) => voorbeeld.id)).size, 4);
});

test('iedere maat van een voorbeeldstuk is volledig gevuld', () => {
  for (const voorbeeld of voorbeeldStukken()) {
    for (const maat of voorbeeld.stuk.partijen[0].maten) {
      const duur = maat.elementen.reduce((som, element) => som + element.duur, 0);
      assert.equal(duur, 1920, `${voorbeeld.titel}, maat ${maat.nummer}`);
    }
  }
});

test('Ode an die Freude begint met E4', () => {
  const ode = voorbeeldStukken().find((voorbeeld) => voorbeeld.id === 'ode-an-die-freude');
  const eersteNoot = ode.stuk.partijen[0].maten[0].elementen[0];
  assert.deepEqual(eersteNoot.toonhoogte, { stap: 'E', alter: 0, octaaf: 4 });
});

test('de voorbeeldstukken hebben het verwachte aantal maten', () => {
  const aantallen = Object.fromEntries(voorbeeldStukken().map((voorbeeld) => [
    voorbeeld.id,
    voorbeeld.stuk.partijen[0].maten.length,
  ]));
  assert.deepEqual(aantallen, {
    'frere-jacques': 8,
    'ode-an-die-freude': 8,
    'twinkle-twinkle-little-star': 12,
    'jingle-bells': 8,
  });
});
