import test from 'node:test';
import assert from 'node:assert/strict';
import { dichtsteBijX } from '../src/model/paletdoel.mjs';

// Kaders van getekende noten (pixels): a en b op de balk onder de muis, c op een balk verderop.
const kandidaten = [
  { id: 'a', links: 100, rechts: 110, balkAfstand: 0 },
  { id: 'b', links: 140, rechts: 150, balkAfstand: 0 },
  { id: 'c', links: 120, rechts: 130, balkAfstand: 40 },
];

test('paletdoel: de noot onder de muis', () => {
  assert.equal(dichtsteBijX(kandidaten, 105).id, 'a');
  assert.equal(dichtsteBijX(kandidaten, 145).id, 'b');
});

test('paletdoel: ook ver van een noot de dichtstbijzijnde, alleen op de balk die het dichtst bij de muis is', () => {
  assert.equal(dichtsteBijX(kandidaten, 128).id, 'b', 'c is dichterbij, maar staat op een andere balk');
  assert.equal(dichtsteBijX(kandidaten, 300).id, 'b');
  assert.equal(dichtsteBijX(kandidaten, 20).id, 'a');
});

test('paletdoel: bij gelijke afstand de linker, en zonder kandidaten null', () => {
  assert.equal(dichtsteBijX(kandidaten, 125).id, 'a');
  assert.equal(dichtsteBijX([], 10), null);
  assert.equal(dichtsteBijX(undefined, 10), null);
});
