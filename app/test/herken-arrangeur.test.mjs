import test from 'node:test';
import assert from 'node:assert/strict';
import { maakNetjes } from '../src/server/herken.mjs';

test('een tweede composer-credit direct onder de componist wordt arrangeur', () => {
  const partituur = {
    titel: 'Galop',
    componist: 'D. Shoshtakowich',
    partijen: [],
  };

  maakNetjes(partituur, '', [
    { tekst: 'D. Shoshtakowich', type: 'composer', y: 1757 },
    { tekst: 'Alan emie', type: 'composer', y: 1732 },
  ]);

  assert.equal(partituur.arrangeur, 'Alan emie');
  assert.equal(partituur.componist, 'D. Shostakovich');
});
