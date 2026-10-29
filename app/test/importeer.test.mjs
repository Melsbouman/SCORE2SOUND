import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import importeer from '../src/server/importeer.mjs';

const voorbeeld = (naam) => readFile(new URL(`./voorbeelden/${naam}.musicxml`, import.meta.url));
const verzoek = (body, methode = 'POST') => ({ methode, pad: '/api/importeer', rest: '', query: {}, body, koppen: {} });

test('een geldig bestand geeft de partituur en de meldingen van de controles', async () => {
  const uit = await importeer(verzoek(await voorbeeld('fout-maatduur')));
  assert.equal(uit.status, 200);
  assert.equal(uit.body.partituur.titel, 'Fout in de maatduur');
  assert.equal(uit.body.partituur.partijen[0].naam, 'Klarinet');
  assert.deepEqual(uit.body.meldingen.map((m) => [m.soort, m.ernst, m.maat]), [['maatduur', 'fout', 1], ['maatduur', 'fout', 2]]);
});

test('een kloppend bestand geeft geen meldingen', async () => {
  const uit = await importeer(verzoek(await voorbeeld('eenvoudig')));
  assert.equal(uit.status, 200);
  assert.deepEqual(uit.body.meldingen, []);
  assert.equal(uit.body.partituur.partijen[0].maten.length, 4);
});

test('een UTF-8 BOM aan het begin is geen probleem', async () => {
  const bom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), await voorbeeld('ensemble')]);
  const uit = await importeer(verzoek(bom));
  assert.equal(uit.status, 200);
  assert.equal(uit.body.partituur.partijen.length, 2);
});

test('alleen POST', async () => {
  const uit = await importeer(verzoek(Buffer.alloc(0), 'GET'));
  assert.equal(uit.status, 405);
  assert.match(uit.body.fout, /POST/);
});

test('een leeg bestand', async () => {
  const uit = await importeer(verzoek(Buffer.alloc(0)));
  assert.equal(uit.status, 400);
  assert.match(uit.body.fout, /leeg/);
});

test('een kapot bestand geeft de melding van het lezen', async () => {
  const uit = await importeer(verzoek(Buffer.from('<score-partwise><part>')));
  assert.equal(uit.status, 422);
  assert.match(uit.body.fout, /geen geldige MusicXML/);
});

test('een gecomprimeerd .mxl-bestand (zip) wordt herkend', async () => {
  const uit = await importeer(verzoek(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00])));
  assert.equal(uit.status, 415);
  assert.match(uit.body.fout, /\.mxl/);
});
