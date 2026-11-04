import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { herstelHerkenning } from '../src/model/herstel.mjs';
import { verplaatsNoot, zoekElement } from '../src/model/corrigeren.mjs';

test('op het herstelde Sand and Stars wisselt de noot in maat 16 met de rust erna', async () => {
  const p = herstelHerkenning(leesMusicXML(await readFile(new URL('./fixtures/sand-and-stars-begin.xml', import.meta.url), 'utf8')));
  const noot = zoekElement(p, 'n-P1-15-5');
  const rust = zoekElement(p, 'n-P1-15-6');
  assert.equal(noot.soort, 'noot');
  assert.equal(rust.soort, 'rust');
  assert.equal(noot.duur, rust.duur);
  const nieuw = verplaatsNoot(p, 'n-P1-15-5', 'n-P1-15-6');
  assert.equal(zoekElement(nieuw, 'n-P1-15-5').soort, 'rust');
  assert.equal(zoekElement(nieuw, 'n-P1-15-6').soort, 'noot');
  assert.equal(zoekElement(nieuw, 'n-P1-15-6').start, rust.start);
  assert.deepEqual(zoekElement(nieuw, 'n-P1-15-6').toonhoogte, noot.toonhoogte);
  assert.equal(zoekElement(p, 'n-P1-15-5').soort, 'noot');
});
