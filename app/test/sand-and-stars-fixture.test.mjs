import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { herstelMaatsoorten } from '../src/model/maatsoorten.mjs';
import { maatLengte } from '../src/model/duur.mjs';

const lees = async () => leesMusicXML(await readFile(new URL('./fixtures/sand-and-stars-begin.xml', import.meta.url), 'utf8'));
const inhoud = (maat) => Math.max(0, ...maat.elementen.filter((e) => e.soort === 'noot' || e.soort === 'rust').map((e) => e.start + e.duur));
const tel = (partituur) => {
  let vol = 0;
  for (const maat of partituur.partijen[0].maten) if (!maat.opmaat && inhoud(maat) > maatLengte(maat.maatsoort)) vol += 1;
  return vol;
};

test('de ruwe herkenning heeft 30 maten, waarvan 10 te vol door een verkeerde maatsoort', async () => {
  const partituur = await lees();
  assert.equal(partituur.partijen[0].maten.length, 30);
  assert.equal(tel(partituur), 10);
});

test('herstelMaatsoorten verzint geen wisselingen van maatsoort: de maatsoorten blijven zoals Audiveris ze las', async () => {
  const gelezen = await lees();
  const herstel = herstelMaatsoorten(gelezen);
  const soorten = (p) => p.partijen[0].maten.map((maat) => `${maat.maatsoort.teller}/${maat.maatsoort.noemer}`);
  assert.deepEqual(soorten(herstel), soorten(gelezen));
  assert.equal(herstel.partijen[0].maten.length, 30);
});
