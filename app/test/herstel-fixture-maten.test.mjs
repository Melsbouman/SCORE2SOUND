import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { herstelHerkenning } from '../src/model/herstel.mjs';

test('na het herstel van Sand and Stars heeft elke maat elementen en staan er 64 maten op het blad', async () => {
  const p = leesMusicXML(await readFile(new URL('./fixtures/sand-and-stars-begin.xml', import.meta.url), 'utf8'));
  const nieuw = herstelHerkenning(p);
  const maten = nieuw.partijen[0].maten;
  // Een meermaatsrust zonder verborgen maten erachter telt voor zijn volle aantal.
  const opHetBlad = maten.reduce((som, maat, index) => som + (!maat.verborgen && maat.maatrust > 1 && !maten[index + 1]?.verborgen ? maat.maatrust : 1), 0);
  assert.equal(opHetBlad, 64);
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
