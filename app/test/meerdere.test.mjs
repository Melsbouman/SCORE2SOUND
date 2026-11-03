import test from 'node:test';
import assert from 'node:assert/strict';
import { opAlle, verwijderAlle } from '../src/model/meerdere.mjs';

test('opAlle past de bewerking op alle ids toe en laat de originele partituur ongemoeid', () => {
  const origineel = { bewerkt: [] };
  const resultaat = opAlle(origineel, ['eerste', 'tweede'], (partituur, id) => ({
    bewerkt: [...partituur.bewerkt, id],
  }));

  assert.deepEqual(resultaat, { bewerkt: ['eerste', 'tweede'] });
  assert.deepEqual(origineel, { bewerkt: [] });
});

test('opAlle verandert niets bij een lege lijst', () => {
  const partituur = { bewerkt: [] };

  assert.equal(opAlle(partituur, [], () => assert.fail('De bewerking mag niet worden aangeroepen.')), partituur);
});

test('verwijderAlle haalt alle gekozen elementen weg', () => {
  const partituur = {
    partijen: [{
      id: 'partij',
      maten: [{
        elementen: [
          { soort: 'noot', start: 0, duur: 480, stem: 1, notenbalk: 1 },
          { soort: 'noot', start: 480, duur: 480, stem: 1, notenbalk: 1 },
          { soort: 'noot', start: 960, duur: 480, stem: 1, notenbalk: 1 },
        ],
      }],
    }],
  };

  const resultaat = verwijderAlle(partituur, ['n-partij-0-0', 'n-partij-0-2']);

  assert.deepEqual(resultaat.partijen[0].maten[0].elementen.map((element) => element.soort), [
    'rust', 'noot', 'rust',
  ]);
  assert.deepEqual(partituur.partijen[0].maten[0].elementen.map((element) => element.soort), [
    'noot', 'noot', 'noot',
  ]);
});
