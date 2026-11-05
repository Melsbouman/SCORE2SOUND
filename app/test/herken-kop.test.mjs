import test from 'node:test';
import assert from 'node:assert/strict';
import { maakNetjes } from '../src/server/herken.mjs';

test('maakNetjes herstelt de componist en haalt de arrangeur uit de kop', () => {
  const partituur = {
    titel: '',
    componist: 'D. Shoshtakowich',
    partijen: [{ naam: '2nd Bb Cornet', instrument: {} }],
  };

  maakNetjes(partituur, 'galop.pdf', ['GALOP', 'D. Shoshtakowich', 'arr. Alan Fernie', '2nd Bb Cornet']);

  assert.equal(partituur.arrangeur, 'Alan Fernie');
  assert.equal(partituur.componist, 'D. Shostakovich');
});
