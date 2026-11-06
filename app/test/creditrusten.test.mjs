import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { creditBeginRust } from '../src/model/creditrusten.mjs';
import { leesCredits } from '../src/server/herken.mjs';

test('het hoogste numerieke credit op de eerste pagina geeft de beginrust', async () => {
  const xml = await readFile(new URL('./fixtures/sand-and-stars-begin.xml', import.meta.url), 'utf8');

  assert.equal(creditBeginRust(leesCredits(xml)), 12);
});

test('zonder numerieke credits is er geen beginrust', () => {
  const credits = [{ tekst: 'Titel', type: null, pagina: 0, x: 100, y: 500 }];

  assert.equal(creditBeginRust(credits), null);
});

test('een numeriek credit op een latere pagina telt niet', () => {
  const credits = [{ tekst: '12', type: null, pagina: 1, x: 100, y: 500 }];

  assert.equal(creditBeginRust(credits), null);
});

test('getallen buiten het bereik van 2 tot en met 200 tellen niet', () => {
  const credits = [
    { tekst: '1', type: null, pagina: 0, x: 100, y: 500 },
    { tekst: '300', type: null, pagina: 0, x: 100, y: 400 },
  ];

  assert.equal(creditBeginRust(credits), null);
});
