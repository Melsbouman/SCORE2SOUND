import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { maakPdf } from '../src/export/pdf.mjs';
import pdfRoute from '../src/server/pdf.mjs';

const voorbeeld = () => readFile(new URL('../public/voorbeeld.musicxml', import.meta.url), 'utf8');
const titelblok = { titel: 'Mijn Stuk', componist: 'Anna Componist', arrangeur: 'Bert Arrangeur', partij: 'Fluit in B♭' };

// pdfkit zet tekst als hex in een TJ-reeks, met tussendoor kerning-getallen; plak de hex-stukken van een reeks weer aan elkaar.
const tekstUit = (pdf) => [...pdf.toString('latin1').matchAll(/\[([^\]]*)\]\s*TJ/g)]
  .map((reeks) => [...reeks[1].matchAll(/<([0-9a-f]*)>/gi)].map((stuk) => Buffer.from(stuk[1], 'hex').toString('latin1')).join(''))
  .join('\n');

test('maakPdf zet titel, componist, arrangeur en partij boven het stuk', async () => {
  const tekst = tekstUit(await maakPdf(await voorbeeld(), { comprimeer: false, titelblok }));
  for (const deel of ['Mijn Stuk', 'Anna Componist', 'arr. Bert Arrangeur', 'Fluit in Bb']) {
    assert.ok(tekst.includes(deel), `${deel} ontbreekt`);
  }
});

test('zonder titelblok blijft maakPdf zoals het was', async () => {
  const pdf = await maakPdf(await voorbeeld(), { comprimeer: false });
  assert.equal(pdf.subarray(0, 5).toString('latin1'), '%PDF-');
  assert.ok(!tekstUit(pdf).includes('arr. '));
});

test('de route accepteert JSON met musicxml en titelblok, en ook gewone MusicXML', async () => {
  const xml = await voorbeeld();
  const metJson = await pdfRoute({ methode: 'POST', body: Buffer.from(JSON.stringify({ musicxml: xml, titelblok })) });
  assert.equal(metJson.status, 200);
  assert.equal(metJson.body.subarray(0, 5).toString('latin1'), '%PDF-');
  const gewoon = await pdfRoute({ methode: 'POST', body: Buffer.from(xml) });
  assert.equal(gewoon.status, 200);
});
