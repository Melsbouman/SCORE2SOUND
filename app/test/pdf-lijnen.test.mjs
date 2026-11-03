import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { maakPdf } from '../src/export/pdf.mjs';

test('de pdf tekent lijnen: notenbalken, stokken en balken', async () => {
  const xml = await readFile(new URL('../public/voorbeeld.musicxml', import.meta.url), 'utf8');
  const tekst = (await maakPdf(xml, { comprimeer: false })).toString('latin1');
  const lijnen = (tekst.match(/\nS\n/g) ?? []).length;
  assert.ok(lijnen >= 20, `er zijn maar ${lijnen} lijnen getekend`);
});
