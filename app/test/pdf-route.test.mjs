import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import pdf from '../src/server/pdf.mjs';

test('GET geeft status 405', async () => {
  const antwoord = await pdf({ method: 'GET' });

  assert.equal(antwoord.status, 405);
});

test('POST met een lege body geeft status 400', async () => {
  const antwoord = await pdf({ method: 'POST', body: Buffer.alloc(0) });

  assert.equal(antwoord.status, 400);
});

test('POST met MusicXML geeft een pdf', async () => {
  const musicXml = Buffer.from(await readFile(new URL('../public/voorbeeld.musicxml', import.meta.url)));
  const antwoord = await pdf({ method: 'POST', body: musicXml });

  assert.equal(antwoord.status, 200);
  assert.equal(antwoord.soort, 'application/pdf');
  assert.equal(antwoord.body.subarray(0, 5).toString(), '%PDF-');
});
