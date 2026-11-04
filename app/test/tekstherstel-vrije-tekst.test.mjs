import test from 'node:test';
import assert from 'node:assert/strict';

import { herstelMuziekterm } from '../src/model/muziektermen.mjs';
import { herstelTeksten } from '../src/model/tekstherstel.mjs';

const vrijeTeksten = [
  '* Optional cut to bar 65',
  '*Optional cut to bar 53',
  'Allegro con fuoco',
];

test('herstelMuziekterm laat lange vrije tekst met cijfers ongemoeid', () => {
  for (const tekst of vrijeTeksten) {
    assert.equal(herstelMuziekterm(tekst), tekst);
  }
});

test('herstelTeksten laat vrije tekst met cijfers ongemoeid', () => {
  const aanwijzingen = vrijeTeksten.map((tekst) => ({ type: 'tekst', tekst }));

  assert.deepEqual(herstelTeksten(aanwijzingen), aanwijzingen);
});
