import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';

const noten = (p) => p.partijen[0].maten.flatMap((m) => m.elementen).filter((e) => e.soort === 'noot');
const sleutel = (e) => `${e.toonhoogte.stap}${e.toonhoogte.alter}${e.toonhoogte.octaaf}:${e.start}:${e.duur}`;

test('schrijven en weer lezen geeft dezelfde noten (toonhoogte, plaats en duur) voor een echt stuk', async () => {
  const eerst = leesMusicXML(await readFile(new URL('./fixtures/sand-and-stars-begin.xml', import.meta.url), 'utf8'));
  const terug = leesMusicXML(naarMusicXML(eerst));
  assert.equal(terug.partijen[0].maten.length, eerst.partijen[0].maten.length);
  assert.deepEqual(noten(terug).map(sleutel), noten(eerst).map(sleutel));
});

test('de maatsoorten en toonsoorten blijven na schrijven en lezen gelijk', async () => {
  const eerst = leesMusicXML(await readFile(new URL('./fixtures/sand-and-stars-begin.xml', import.meta.url), 'utf8'));
  const terug = leesMusicXML(naarMusicXML(eerst));
  const soorten = (p) => p.partijen[0].maten.map((m) => `${m.maatsoort.teller}/${m.maatsoort.noemer}:${m.toonsoort.kwinten}`);
  assert.deepEqual(soorten(terug), soorten(eerst));
});
