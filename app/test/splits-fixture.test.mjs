import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { herstelHerkenning } from '../src/model/herstel.mjs';
import { splitsRust, splitsNoot, zoekElement } from '../src/model/corrigeren.mjs';

const laad = async () => herstelHerkenning(leesMusicXML(await readFile(new URL('./fixtures/sand-and-stars-begin.xml', import.meta.url), 'utf8')));

test('een rust van het echte stuk wordt twee rusten met samen dezelfde duur', async () => {
  const p = await laad();
  const rust = zoekElement(p, 'n-P1-15-6');
  assert.equal(rust.soort, 'rust');
  const nieuw = splitsRust(p, 'n-P1-15-6');
  const a = zoekElement(nieuw, 'n-P1-15-6');
  const b = zoekElement(nieuw, 'n-P1-15-7');
  assert.equal(a.soort, 'rust');
  assert.equal(b.soort, 'rust');
  assert.equal(a.duur + b.duur, rust.duur);
  assert.equal(b.start, rust.start + a.duur);
  assert.equal(nieuw.partijen[0].maten[15].elementen.length, p.partijen[0].maten[15].elementen.length + 1);
});

test('een noot van het echte stuk wordt twee gebonden noten met samen dezelfde duur', async () => {
  const p = await laad();
  const maat = p.partijen[0].maten.findIndex((m) => m.elementen.some((e) => e.soort === 'noot' && e.duur % 2 === 0 && e.duur >= 240 && !e.akkoord));
  const index = p.partijen[0].maten[maat].elementen.findIndex((e) => e.soort === 'noot' && e.duur % 2 === 0 && e.duur >= 240 && !e.akkoord);
  const id = `n-P1-${maat}-${index}`;
  const noot = zoekElement(p, id);
  const nieuw = splitsNoot(p, id);
  const a = zoekElement(nieuw, id);
  const b = zoekElement(nieuw, `n-P1-${maat}-${index + 1}`);
  assert.equal(a.duur + b.duur, noot.duur);
  assert.equal(a.overbinding.begin, true);
  assert.equal(b.overbinding.eind, true);
  assert.deepEqual(b.toonhoogte, noot.toonhoogte);
});
