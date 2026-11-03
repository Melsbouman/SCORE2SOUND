import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';

const voorbeeld = async () => leesMusicXML(await readFile(new URL('./voorbeelden/eenvoudig.musicxml', import.meta.url), 'utf8'));

test('zonder opties blijft de uitvoer zonder id en kleur', async () => {
  const p = await voorbeeld();
  p.partijen[0].maten[0].elementen.find((e) => e.soort === 'noot').zekerheid = 0.5;
  assert.doesNotMatch(naarMusicXML(p), /<note [^>]*(id|color)=/);
});

test('voor de weergave krijgt elke noot en rust een id, en onzekere een kleur', async () => {
  const p = await voorbeeld();
  const maat = p.partijen[0].maten[0];
  const index = maat.elementen.findIndex((e) => e.soort === 'noot');
  maat.elementen[index].zekerheid = 0.79;
  const xml = naarMusicXML(p, { weergave: true });
  assert.ok(xml.includes(`<note id="n-${p.partijen[0].id}-0-${index}" color="#C0392B">`));
  const aantal = p.partijen.flatMap((q) => q.maten.flatMap((m) => m.elementen)).filter((e) => e.soort !== 'aanwijzing').length;
  assert.equal((xml.match(/<note id="n-/g) ?? []).length, aantal);
  assert.equal((xml.match(/color="/g) ?? []).length, 1);
});

test('een weergave leest terug als dezelfde muziek', async () => {
  const p = await voorbeeld();
  const weergave = leesMusicXML(naarMusicXML(p, { weergave: true }));
  const exportbestand = leesMusicXML(naarMusicXML(p));
  weergave.partijen[0].afkorting = '';
  exportbestand.partijen[0].afkorting = '';
  assert.deepEqual(weergave, exportbestand);
});
