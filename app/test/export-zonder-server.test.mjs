import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { bouwPdfPaginas } from '../src/export/paginas.mjs';
import { maakPdfZonderServer } from '../src/export/pdfbrowser.mjs';
import { maakPdf } from '../src/export/pdf.mjs';
import { openPdf } from '../src/pdf/lezer.mjs';
import { leesPdfTekens } from '../src/pdf/tekens.mjs';

const require = createRequire(import.meta.url);
async function maakToolkit() {
  const map = dirname(require.resolve('verovio'));
  const { default: maakModule } = await import(pathToFileURL(join(map, 'verovio-module.mjs')).href);
  const { VerovioToolkit } = await import(pathToFileURL(join(map, 'verovio.mjs')).href);
  return new VerovioToolkit(await maakModule());
}
const tekstVan = (pagina, lettertype) => pagina.tekens.filter((teken) => teken.lettertype.includes(lettertype)).map((teken) => String.fromCharCode(teken.code)).join('');

test('de pagina’s worden in de browser op dezelfde manier opgebouwd als op de server (zelfde aantal)', async () => {
  const tk = await maakToolkit();
  for (const naam of ['eenvoudig', 'ensemble']) {
    const musicxml = await readFile(new URL(`./voorbeelden/${naam}.musicxml`, import.meta.url), 'utf8');
    const paginas = bouwPdfPaginas(tk, musicxml, { titelblok: { titel: 'Proef' } });
    assert.ok(paginas.length >= 1);
    assert.ok(paginas.every((pagina) => typeof pagina.svg === 'string' && pagina.svg.startsWith('<svg')));
    assert.equal(paginas[0].eerste, true);
    const server = await openPdf(new Uint8Array(await maakPdf(musicxml, { titelblok: { titel: 'Proef' } })));
    assert.equal(paginas.length, server.paginas.length, naam);
  }
});

test('een pdf zonder server: titel, componist, paginanummer, regel onderaan en watermerk staan erin', async () => {
  const tk = await maakToolkit();
  const musicxml = await readFile(new URL('./voorbeelden/eenvoudig.musicxml', import.meta.url), 'utf8');
  const bytes = await maakPdfZonderServer(tk, musicxml, { titelblok: { titel: 'Proef', componist: 'Iemand' } });
  assert.ok(bytes instanceof Uint8Array);
  const pdf = await openPdf(bytes);
  assert.ok(pdf.paginas.length >= 1);
  const [eerste] = await leesPdfTekens(bytes);
  assert.match(tekstVan(eerste, 'Times-Bold'), /Proef/);
  const gewoon = tekstVan(eerste, 'Times-Roman');
  assert.match(gewoon, /Iemand/);
  assert.match(gewoon, /pagina 1 van \d+/);
  assert.match(gewoon, /Gemaakt met SCORE2SOUND/);
  assert.match(gewoon, /SCORE2SOUND/, 'watermerk');
});

test('zonder watermerk staat het woord alleen in de regel onderaan', async () => {
  const tk = await maakToolkit();
  const musicxml = await readFile(new URL('./voorbeelden/eenvoudig.musicxml', import.meta.url), 'utf8');
  const [eerste] = await leesPdfTekens(await maakPdfZonderServer(tk, musicxml, { watermerk: false }));
  const gewoon = tekstVan(eerste, 'Times-Roman');
  assert.equal((gewoon.match(/SCORE2SOUND/g) ?? []).length, 1);
});

test('het exportscherm maakt de pdf in de browser en vraagt hem niet meer aan de server', async () => {
  const bron = await readFile(new URL('../public/js/views/export.js', import.meta.url), 'utf8');
  assert.equal(bron.includes('/api/pdf'), false);
  assert.match(bron, /maakPdfZonderServer/);
});
