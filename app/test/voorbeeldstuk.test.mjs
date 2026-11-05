import test from 'node:test';
import assert from 'node:assert/strict';
import { maakVoorbeeldStuk } from '../src/model/nieuw.mjs';

test('maakVoorbeeldStuk maakt een volledig gevuld voorbeeld van Frère Jacques', () => {
  const stuk = maakVoorbeeldStuk();
  const maten = stuk.partijen[0].maten;

  assert.ok(maten.length <= 8);
  for (const maat of maten) {
    const maatduur = maat.maatsoort.teller * 480 * 4 / maat.maatsoort.noemer;
    assert.equal(maat.elementen.reduce((som, element) => som + element.duur, 0), maatduur);
  }
  assert.deepEqual(maten[0].elementen[0].toonhoogte, { stap: 'C', alter: 0, octaaf: 5 });
});
