import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { herstelHerkenning } from '../src/model/herstel.mjs';

test('na de herstelketen lopen de maatnummers van het echte stuk strikt op, zonder dubbele nummers', async () => {
  const gelezen = leesMusicXML(await readFile(new URL('./fixtures/sand-and-stars-begin.xml', import.meta.url), 'utf8'));
  const maten = herstelHerkenning(gelezen).partijen[0].maten;
  const nummers = maten.map((maat) => Number(maat.nummer));
  assert.ok(nummers.every((n) => Number.isInteger(n)), 'alle nummers zijn gehele getallen');
  assert.equal(new Set(nummers).size, nummers.length, 'geen dubbele nummers');
  for (let i = 1; i < nummers.length; i += 1) assert.ok(nummers[i] > nummers[i - 1], `maat ${i}: ${nummers[i - 1]} dan ${nummers[i]}`);
  assert.equal(nummers[0], 1);
});
