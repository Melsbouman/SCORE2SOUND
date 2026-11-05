import test from 'node:test';
import assert from 'node:assert/strict';
import { maakNetjes } from '../src/server/herken.mjs';

test('maakNetjes herstelt de namen van alle partijen', () => {
  const partituur = {
    titel: '',
    componist: '',
    partijen: ['Eb Comet', 'Fliigelhom 1', 'Hnm2 Eb', 'Tmmbbne 1 C']
      .map((naam) => ({ naam, instrument: {} })),
  };

  maakNetjes(partituur, '', []);

  assert.deepEqual(
    partituur.partijen.map((partij) => partij.naam),
    ['Eb Cornet', 'Flugelhorn 1', 'Horn 2 Eb', 'Trombone 1 C'],
  );
});
