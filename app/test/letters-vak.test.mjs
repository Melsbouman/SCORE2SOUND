import test from 'node:test';
import assert from 'node:assert/strict';
import { maatBijStapel } from '../src/server/letters.mjs';

// Twee systemen op blad 1 (balk op y 300 en 700) die allebei beginnen met een stapel van x 150 tot 600.
const maten = [
  { nummer: '1', vak: { blad: 1, links: 150, rechts: 600, boven: 300, onder: 380 } },
  { nummer: '2', vak: { blad: 1, links: 600, rechts: 980, boven: 300, onder: 380 } },
  { nummer: '3', vak: { blad: 1, links: 150, rechts: 600, boven: 700, onder: 780 } },
  { nummer: '4' },
  { nummer: '5', vak: { blad: 2, links: 150, rechts: 700, boven: 300, onder: 380 } },
];

test('de letter komt in de maat met het vak van die stapel in dat systeem', () => {
  assert.equal(maatBijStapel(maten, 1, { links: 150, rechts: 600 }, 0, { boven: 300, tot: 700 }).nummer, '1');
  assert.equal(maatBijStapel(maten, 1, { links: 150, rechts: 600 }, 0, { boven: 700 }).nummer, '3');
  assert.equal(maatBijStapel(maten, 1, { links: 600, rechts: 980 }, 0, { boven: 300, tot: 700 }).nummer, '2');
  assert.equal(maatBijStapel(maten, 2, { links: 150, rechts: 700 }, 0, { boven: 300 }).nummer, '5');
});

test('zonder maat met dat vak geldt de volgorde als terugval', () => {
  assert.equal(maatBijStapel(maten, 1, { links: 999, rechts: 1200 }, 3, { boven: 300, tot: 700 }).nummer, '4');
  assert.equal(maatBijStapel(maten, 1, undefined, 3).nummer, '4');
});
