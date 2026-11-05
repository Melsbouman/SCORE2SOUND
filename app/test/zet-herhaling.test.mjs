import test from 'node:test';
import assert from 'node:assert/strict';
import { zetHerhaling } from '../src/model/maten-bewerken.mjs';

test('zet en verwijdert een eindherhaling op alleen de gekozen maat', () => {
  const partituur = {
    partijen: [{
      id: 'partij-1',
      maten: [
        { index: 0 },
        { index: 1 },
        { index: 2 },
      ],
    }],
  };

  const metHerhaling = zetHerhaling(partituur, 2, 'eind', true);

  assert.equal(metHerhaling.partijen[0].maten[2].herhaling.eind, true);
  assert.equal(metHerhaling.partijen[0].maten[2].herhaling.keer, 2);
  assert.equal(metHerhaling.partijen[0].maten[1].herhaling, undefined);
  assert.equal(partituur.partijen[0].maten[2].herhaling, undefined);

  const zonderHerhaling = zetHerhaling(metHerhaling, 2, 'eind', false);

  assert.equal(zonderHerhaling.partijen[0].maten[2].herhaling.eind, false);
});
