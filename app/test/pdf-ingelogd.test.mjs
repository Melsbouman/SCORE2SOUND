import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { maakPdf } from '../src/export/pdf.mjs';
import pdf from '../src/server/pdf.mjs';

const voorbeeld = () => readFile(new URL('../public/voorbeeld.musicxml', import.meta.url), 'utf8');
const heeftWatermerk = (buffer) => buffer.toString('latin1').includes(' 80 Tf');
const voettekst = Buffer.from('Gemaakt met SCORE2SOUND').toString('hex');

test('zonder watermerk staat er geen schuin watermerk op, wel de regel Gemaakt met SCORE2SOUND', async () => {
  const klaar = await maakPdf(await voorbeeld(), { comprimeer: false, watermerk: false });
  assert.equal(heeftWatermerk(klaar), false);
  assert.ok(klaar.toString('latin1').toLowerCase().includes(voettekst.toLowerCase()));
});

test('met watermerk (proef, niet ingelogd) staat het watermerk er nog op, naast dezelfde regel', async () => {
  const klaar = await maakPdf(await voorbeeld(), { comprimeer: false });
  assert.equal(heeftWatermerk(klaar), true);
  assert.ok(klaar.toString('latin1').toLowerCase().includes(voettekst.toLowerCase()));
});

test('de pdf-route geeft een ingelogde gebruiker een pdf zonder watermerk en een anonieme bezoeker met watermerk', async () => {
  const body = Buffer.from(await voorbeeld());
  const ingelogd = await pdf({ methode: 'POST', body, gebruiker: 'abc123' });
  const anoniem = await pdf({ methode: 'POST', body });
  assert.equal(ingelogd.status, 200);
  assert.equal(anoniem.status, 200);
  assert.ok(anoniem.body.length > 0 && ingelogd.body.length > 0);
});
