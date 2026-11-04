import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { herstelHerkenning } from '../src/model/herstel.mjs';

test('na het herstel van Sand and Stars heeft elke maat elementen en blijven er 58 maten', async () => {
  const p = leesMusicXML(await readFile(new URL('./fixtures/sand-and-stars-begin.xml', import.meta.url), 'utf8'));
  const nieuw = herstelHerkenning(p);
  const maten = nieuw.partijen[0].maten;
  assert.equal(maten.length, 58);
  assert.equal(maten.filter((m) => m.elementen.length === 0).length, 0);
  maten.forEach((m, i) => assert.equal(m.index, i));
});

test('het herstel verandert de invoer niet en geeft bij een tweede keer hetzelfde', async () => {
  const p = leesMusicXML(await readFile(new URL('./fixtures/sand-and-stars-begin.xml', import.meta.url), 'utf8'));
  const kopie = structuredClone(p);
  const een = herstelHerkenning(p);
  assert.deepEqual(p, kopie);
  assert.deepEqual(herstelHerkenning(een), een);
});
