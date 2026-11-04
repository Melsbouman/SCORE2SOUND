import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';
import { maakPdf } from '../src/export/pdf.mjs';

const voorbeeld = async () => leesMusicXML(await readFile(new URL('../public/voorbeeld.musicxml', import.meta.url), 'utf8'));
const tekst = 'Music Studio Verlag AG, CH Wiedlisbach';

test('het colofon wordt als rights in MusicXML geschreven en weer gelezen', async () => {
  const stuk = { ...(await voorbeeld()), colofon: tekst };
  const xml = naarMusicXML(stuk);
  assert.ok(xml.includes('<rights>' + tekst + '</rights>'));
  assert.equal(leesMusicXML(xml).colofon, tekst);
});

test('zonder colofon staat er geen rights en is colofon niet gezet', async () => {
  const stuk = await voorbeeld();
  assert.ok(!naarMusicXML(stuk).includes('<rights>'));
  assert.equal(leesMusicXML(naarMusicXML(stuk)).colofon, undefined);
});

test('speciale tekens in het colofon worden netjes geschreven en teruggelezen', async () => {
  const stuk = { ...(await voorbeeld()), colofon: 'A & B <Verlag>' };
  assert.equal(leesMusicXML(naarMusicXML(stuk)).colofon, 'A & B <Verlag>');
});

test('de pdf zet het colofon alleen op de laatste pagina, onderaan', async () => {
  const stuk = { ...(await voorbeeld()), colofon: tekst };
  const pdf = await maakPdf(naarMusicXML(stuk), { comprimeer: false, watermerk: false });
  const inhoud = pdf.toString('latin1').toLowerCase();
  const hex = Buffer.from(tekst).toString('hex');
  assert.equal(inhoud.split(hex).length - 1, 1);
});

test('de editor heeft een plek voor het colofon onder de laatste pagina', async () => {
  const weergave = await readFile(new URL('../public/js/weergave.js', import.meta.url), 'utf8');
  assert.ok(weergave.includes('bladmuziek__colofon'));
});
