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

test('een tweede composer-credit met een titel ertussen wordt arrangeur', () => {
  const partituur = {
    titel: 'Galop',
    componist: 'D. Shoshtakowich',
    partijen: [],
  };

  maakNetjes(partituur, '', [
    { tekst: '2nd Bb Cornet', type: 'lyricist', y: 1764 },
    { tekst: 'D. Shoshtakowich', type: 'composer', y: 1757 },
    { tekst: 'GALOP', type: '', y: 1755 },
    { tekst: 'Alan emie', type: 'composer', y: 1732 },
  ]);

  assert.equal(partituur.arrangeur, 'Alan emie');
  assert.equal(partituur.componist, 'D. Shostakovich');
});
