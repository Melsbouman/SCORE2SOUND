import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { importeerBestand } from '../src/import/importeer.mjs';
import { maakZip } from '../src/model/zipschrijven.mjs';

const xml = new Uint8Array(await readFile(new URL('./voorbeelden/eenvoudig.musicxml', import.meta.url)));
const container = '<?xml version="1.0"?><container><rootfiles><rootfile full-path="stuk/score.xml"/></rootfiles></container>';

test('MusicXML als bytes wordt een partituur met meldingen', async () => {
  const { partituur, meldingen } = await importeerBestand(xml);
  assert.ok(partituur.partijen.length > 0);
  assert.ok(Array.isArray(meldingen));
});

test('een byte order mark aan het begin is geen probleem', async () => {
  const metBom = new Uint8Array([0xef, 0xbb, 0xbf, ...xml]);
  const { partituur } = await importeerBestand(metBom);
  assert.ok(partituur.partijen.length > 0);
});

test('een .mxl met container.xml wordt gelezen (in de browser, zonder server)', async () => {
  const zip = maakZip([
    { naam: 'META-INF/container.xml', inhoud: new TextEncoder().encode(container) },
    { naam: 'stuk/score.xml', inhoud: xml },
  ]);
  const { partituur } = await importeerBestand(zip);
  assert.deepEqual(partituur, (await importeerBestand(xml)).partituur);
});

test('een .mxl zonder container.xml gebruikt het eerste .xml- of .musicxml-bestand', async () => {
  const zip = maakZip([{ naam: 'score.musicxml', inhoud: xml }]);
  assert.ok((await importeerBestand(zip)).partituur.partijen.length > 0);
});

test('fouten geven een Nederlandse melding', async () => {
  await assert.rejects(importeerBestand(new Uint8Array()), /Het bestand is leeg\./);
  await assert.rejects(importeerBestand(maakZip([{ naam: 'leesmij.txt', inhoud: new TextEncoder().encode('hoi') }])), /In dit \.mxl-bestand staat geen MusicXML\./);
});

test('openen, partijen toevoegen en het voorbeeld gebruiken de server niet meer', async () => {
  for (const pad of ['../public/js/upload.js', '../public/js/views/bewerken.js', '../public/js/views/voorbeeld.js']) {
    const bron = await readFile(new URL(pad, import.meta.url), 'utf8');
    assert.equal(bron.includes('/api/importeer'), false, pad);
    assert.match(bron, /import \{[^}]*importeerBestand[^}]*\} from '\/src\/import\/importeer\.mjs'/, pad);
  }
});
