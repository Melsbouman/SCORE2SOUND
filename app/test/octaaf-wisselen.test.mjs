import test from 'node:test';
import assert from 'node:assert/strict';
import { verschuifOctaaf } from '../src/model/noten-bewerken.mjs';

test('C5 wordt C6 en terug', () => {
  const partituur = {
    partijen: [{
      id: 'p1',
      maten: [{
        elementen: [{
          soort: 'noot',
          toonhoogte: { stap: 'C', alter: 0, octaaf: 5 },
          zekerheid: 0.5,
        }],
      }],
    }],
  };

  const hoger = verschuifOctaaf(partituur, 'n-p1-0-0', 1);
  assert.equal(hoger.partijen[0].maten[0].elementen[0].toonhoogte.octaaf, 6);

  const terug = verschuifOctaaf(hoger, 'n-p1-0-0', -1);
  assert.equal(terug.partijen[0].maten[0].elementen[0].toonhoogte.octaaf, 5);
});
