import test from 'node:test';
import assert from 'node:assert/strict';
import { stapelKaart } from '../src/model/stapels.mjs';

const maat = (extra = {}) => ({ elementen: [], ...extra });

test('een meermaatsrust met verborgen maten is één stapel', () => {
  const maten = [maat(), maat({ maatrust: 3 }), maat({ verborgen: true }), maat({ verborgen: true }), maat()];
  assert.deepEqual(stapelKaart(maten), [0, 1, 4]);
});

test('een meermaatsrust zonder verborgen maten slaat de volgende echte maten niet over', () => {
  const maten = [maat(), maat({ maatrust: 4 }), maat(), maat(), maat()];
  assert.deepEqual(stapelKaart(maten), [0, 1, 2, 3, 4]);
});

test('alleen de verborgen maten die er zijn, horen bij de meermaatsrust', () => {
  const maten = [maat({ maatrust: 4 }), maat({ verborgen: true }), maat(), maat()];
  assert.deepEqual(stapelKaart(maten), [0, 2, 3]);
});

test('een maat die de herkenning invoegde, krijgt geen stapel', () => {
  const maten = [maat(), maat({ ingevoegd: true }), maat({ ingevoegd: true }), maat(), maat()];
  assert.deepEqual(stapelKaart(maten), [0, 3, 4]);
});
