import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { maakPdf } from '../src/export/pdf.mjs';

const voorbeeld = () => readFile(new URL('../public/voorbeeld.musicxml', import.meta.url), 'utf8');

test('maakPdf geeft een pdf met minstens een pagina', async () => {
  const pdf = await maakPdf(await voorbeeld(), { comprimeer: false });
  assert.ok(Buffer.isBuffer(pdf));
  assert.equal(pdf.subarray(0, 5).toString('latin1'), '%PDF-');
  assert.ok(pdf.length > 2000);
  assert.ok(/\/Type \/Page\b/.test(pdf.toString('latin1')));
});

test('elke pagina krijgt het watermerk SCORE2SOUND', async () => {
  const pdf = await maakPdf(await voorbeeld(), { comprimeer: false });
  const tekst = pdf.toString('latin1').toLowerCase();
  const hex = Buffer.from('SCORE2SOUND').toString('hex');
  const paginas = (tekst.match(/\/type \/page\b/g) ?? []).length;
  const watermerken = (tekst.split(hex).length - 1) + (tekst.split('(score2sound)').length - 1);
  assert.ok(paginas >= 1);
  assert.ok(watermerken >= paginas);
});

test('een ander watermerk kan worden opgegeven', async () => {
  const pdf = await maakPdf(await voorbeeld(), { comprimeer: false, watermerk: 'CONCEPT' });
  assert.ok(pdf.toString('latin1').toLowerCase().includes(Buffer.from('CONCEPT').toString('hex')));
});
