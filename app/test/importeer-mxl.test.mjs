import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import importeer from '../src/server/importeer.mjs';

// Een zip van niet-gecomprimeerde bestanden, met de hand opgebouwd.
function maakZip(bestanden) {
  const delen = [];
  const centraal = [];
  let plek = 0;
  for (const [naam, inhoud] of Object.entries(bestanden)) {
    const n = Buffer.from(naam);
    const d = Buffer.from(inhoud);
    const kop = Buffer.alloc(30);
    kop.writeUInt32LE(0x04034b50, 0);
    kop.writeUInt32LE(d.length, 18);
    kop.writeUInt32LE(d.length, 22);
    kop.writeUInt16LE(n.length, 26);
    const regel = Buffer.alloc(46);
    regel.writeUInt32LE(0x02014b50, 0);
    regel.writeUInt32LE(d.length, 20);
    regel.writeUInt32LE(d.length, 24);
    regel.writeUInt16LE(n.length, 28);
    regel.writeUInt32LE(plek, 42);
    delen.push(kop, n, d);
    centraal.push(regel, n);
    plek += kop.length + n.length + d.length;
  }
  const map = Buffer.concat(centraal);
  const einde = Buffer.alloc(22);
  einde.writeUInt32LE(0x06054b50, 0);
  einde.writeUInt16LE(Object.keys(bestanden).length, 8);
  einde.writeUInt16LE(Object.keys(bestanden).length, 10);
  einde.writeUInt32LE(map.length, 12);
  einde.writeUInt32LE(plek, 16);
  return Buffer.concat([...delen, map, einde]);
}

const verzoek = (body) => ({ methode: 'POST', pad: '/api/importeer', rest: '', query: {}, body, koppen: {} });
const voorbeeld = () => readFile(new URL('./voorbeelden/eenvoudig.musicxml', import.meta.url));

test('een .mxl opent via container.xml', async () => {
  const uit = await importeer(verzoek(maakZip({
    'META-INF/container.xml': '<container><rootfiles><rootfile full-path="muziek/stuk.xml"/></rootfiles></container>',
    'muziek/stuk.xml': await voorbeeld(),
  })));
  assert.equal(uit.status, 200);
  assert.ok(uit.body.partituur.partijen.length > 0);
});

test('een .mxl zonder container.xml opent het eerste xml-bestand', async () => {
  const uit = await importeer(verzoek(maakZip({ 'stuk.musicxml': await voorbeeld() })));
  assert.equal(uit.status, 200);
});

test('een zip zonder muziek of een kapot .mxl geeft een nette fout', async () => {
  const leeg = await importeer(verzoek(maakZip({ 'tekst.txt': 'hallo' })));
  assert.equal(leeg.status, 422);
  assert.match(leeg.body.fout, /geen MusicXML/);
  const kapot = await importeer(verzoek(Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3])));
  assert.equal(kapot.status, 422);
});
