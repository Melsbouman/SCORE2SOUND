import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { creditBeginRust, eersteBalkBoven } from '../src/model/creditrusten.mjs';
import { leesCredits } from '../src/server/herken.mjs';

const sandAndStars = readFileSync(new URL('./fixtures/sand-and-stars-begin.xml', import.meta.url), 'utf8');

test('de bovenkant van de eerste notenbalk volgt uit de paginaopmaak', () => {
  assert.equal(eersteBalkBoven(sandAndStars), 1634);
  assert.equal(eersteBalkBoven('<score-partwise/>'), null);
});

test('de beginrust van Sand and Stars (12, net boven de eerste balk) blijft gevonden', () => {
  assert.equal(creditBeginRust(leesCredits(sandAndStars), { eersteBalkBoven: 1634 }), 12);
});

test('een maatnummer bij een latere regel is geen beginrust', () => {
  // Galop: de 9 aan het begin van de tweede regel staat onder de eerste balk.
  const credits = [{ tekst: '9', type: '', pagina: 0, x: 115, y: 1400 }];
  assert.equal(creditBeginRust(credits, { eersteBalkBoven: 1634 }), null);
});

test('een getal ver boven de eerste balk (titel, nummer van het stuk) is geen beginrust', () => {
  const credits = [{ tekst: '4', type: '', pagina: 0, x: 900, y: 1950 }];
  assert.equal(creditBeginRust(credits, { eersteBalkBoven: 1634 }), null);
});

test('zonder bekende balk werkt het als voorheen', () => {
  const credits = [{ tekst: '9', type: '', pagina: 0, x: 115, y: 1400 }];
  assert.equal(creditBeginRust(credits), 9);
});
