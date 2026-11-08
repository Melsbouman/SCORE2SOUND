import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { vlakkenVoor } from '../public/js/views/kop.js';

const bron = await readFile(new URL('../public/js/views/lint.js', import.meta.url), 'utf8');
const bestandBlok = bron.slice(bron.indexOf("if (tabblad.naam === 'Bestand')"), bron.indexOf("knop.addEventListener('click'"));

test('het tabblad Bestand neemt de bibliotheek (projecten) niet over: dat is een eigen scherm', () => {
  const tab = bron.match(/\{ naam: 'Bestand', vlakken: \[([^\]]*)\] \}/);
  assert.ok(tab, 'tabblad Bestand niet gevonden');
  assert.ok(vlakkenVoor('bibliotheek').includes('projecten'));
  assert.equal(tab[1].includes("'projecten'"), false);
});

test('het tabblad Bestand pakt titel en export uit het paneel vóór het leegmaken (het paneel hangt nog niet in het document)', () => {
  const leegmaken = bestandBlok.indexOf('paneel.replaceChildren()');
  assert.ok(leegmaken > 0);
  assert.ok(bestandBlok.indexOf("paneel.querySelector('#titel')") > -1 && bestandBlok.indexOf("paneel.querySelector('#titel')") < leegmaken);
  assert.ok(bestandBlok.indexOf("paneel.querySelector('#export')") > -1 && bestandBlok.indexOf("paneel.querySelector('#export')") < leegmaken);
  assert.equal(/document\.getElementById\('(titel|export|projecten)'\)/.test(bestandBlok), false);
});
