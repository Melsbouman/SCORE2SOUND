import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { herstelHerkenning } from '../src/model/herstel.mjs';
import { vulMaatAan } from '../src/model/corrigeren.mjs';

test('vulMaatAan op het herstelde Sand and Stars verandert de invoer niet en geeft nooit een kortere maat', async () => {
  const p = herstelHerkenning(leesMusicXML(await readFile(new URL('./fixtures/sand-and-stars-begin.xml', import.meta.url), 'utf8')));
  const kopie = structuredClone(p);
  for (let i = 0; i < p.partijen[0].maten.length; i++) {
    const nieuw = vulMaatAan(p, 'P1', i);
    assert.ok(nieuw.partijen[0].maten[i].elementen.length >= p.partijen[0].maten[i].elementen.length, `maat ${i}`);
    assert.equal(nieuw.partijen[0].maten.length, p.partijen[0].maten.length);
  }
  assert.deepEqual(p, kopie);
});
