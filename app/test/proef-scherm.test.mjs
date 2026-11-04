import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const lees = (pad) => readFile(new URL(pad, import.meta.url), 'utf8');

test('het startscherm heeft een knop Probeer een scan die naar de proefmodus van de editor gaat', async () => {
  const html = await lees('../public/welkom.html');
  assert.match(html, /href="\/app\?proef=1"[^>]*>[^<]*Probeer een scan/);
});

test('de proefmodus laat de uploader naar /api/proef sturen en daar de voortgang ophalen', async () => {
  const upload = await lees('../public/js/upload.js');
  assert.ok(upload.includes('/api/proef'));
  assert.ok(upload.includes('proef=1') || upload.includes("'proef'"));
});

test('in de proefmodus staat een duidelijk leesbaar watermerk over de notatie en zijn de exports en bibliotheek verborgen', async () => {
  const css = await lees('../public/app.css');
  assert.ok(css.includes('body.proef'));
  assert.match(css, /body\.proef[^{]*#export[^{]*\{[^}]*display:\s*none/);
  assert.match(css, /body\.proef[^{]*(#weergave|\.bladmuziek)[^{]*\{[^}]*background-image/);
});

test('de proefmodus laat de editor zien zonder in te loggen, en toont dat het een proef is', async () => {
  const inloggen = await lees('../public/js/views/inloggen.js');
  assert.ok(inloggen.includes('proef'));
});
