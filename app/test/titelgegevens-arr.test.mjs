import test from 'node:test';
import assert from 'node:assert/strict';
import { zetTitelgegevens } from '../src/model/titelgegevens.mjs';

test('een arrangeurregel wordt apart bewaard en een OCR-fout in de componist wordt hersteld', () => {
  const partituur = {
    titel: '',
    componist: '',
    partijen: [{ id: 'P1', naam: 'Cornet', maten: [{ nummer: 1, noten: [] }] }]
  };

  const nieuw = zetTitelgegevens(partituur, { titel: 'Galop', componist: 'Shoshtakowich\narr. Alan Fernie' });

  assert.equal(nieuw.titel, 'Galop');
  assert.equal(nieuw.componist, 'Shostakovich');
  assert.equal(nieuw.arrangeur, 'Alan Fernie');
});
