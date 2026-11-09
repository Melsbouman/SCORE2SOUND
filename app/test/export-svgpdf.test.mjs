import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { maakPdfBestand, svgNaarPdf } from '../src/export/svgpdf.mjs';
import { openPdf, naarTekst } from '../src/pdf/lezer.mjs';
import { leesPdfTekens } from '../src/pdf/tekens.mjs';

const A4 = { breedte: 595.28, hoogte: 841.89 };

test('een klein SVG wordt pdf-tekenopdrachten: pad, rechthoek, polygoon, use en tekst', () => {
  const svg = [
    '<svg width="100px" height="200px" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">',
    '<defs><g id="kop"><path transform="scale(1,-1)" d="M0 0 L10 0 L10 -5 Z"/></g></defs>',
    '<g transform="translate(5, 7)" stroke-width="2">',
    '<path d="M0 0 h20 v10 H0 z" fill="none" stroke="currentColor"/>',
    '<rect x="1" y="2" width="3" height="4"/>',
    '<polygon points="0,0 4,0 2,3"/>',
    '<use xlink:href="#kop" transform="translate(30,40) scale(0.5,0.5)"/>',
    '<text x="50" y="60" font-size="12px" text-anchor="start"><tspan>Hallo</tspan></text>',
    '</g></svg>',
  ].join('');
  const { opdrachten, onbekend } = svgNaarPdf(svg, A4);
  assert.deepEqual(onbekend, []);
  assert.match(opdrachten, /\bcm\b/);
  assert.match(opdrachten, /\bre\b/, 'rechthoek');
  assert.match(opdrachten, /\bS\b/, 'lijn (stroke) voor het pad met fill none');
  assert.match(opdrachten, /\bf\b/, 'vulling voor polygoon en use');
  assert.match(opdrachten, /BT[\s\S]*\(Hallo\) Tj[\s\S]*ET/, 'tekst');
  assert.match(opdrachten, /2 w\b/, 'lijndikte 2');
});

test('padopdrachten in hoofd- en kleine letters (M L H V C S Q Z) worden absolute pdf-opdrachten', () => {
  const svg = '<svg width="100px" height="100px"><path d="M10 10 l5 0 c1 1 2 2 3 3 s4 4 5 5 Q 1 2 3 4 z"/></svg>';
  const { opdrachten, onbekend } = svgNaarPdf(svg, A4);
  assert.deepEqual(onbekend, []);
  assert.match(opdrachten, /10 10 m/);
  assert.match(opdrachten, /15 10 l/);
  // c1 1 2 2 3 3 vanaf (15,10): 16 11 17 12 18 13 c
  assert.match(opdrachten, /16 11 17 12 18 13 c/);
  // s4 4 5 5: eerste controlepunt is het spiegelbeeld van (17,12) rond (18,13) = (19,14); dan 22 17 23 18
  assert.match(opdrachten, /19 14 22 17 23 18 c/);
  assert.match(opdrachten, /\bh\b/);
});

test('onbekende onderdelen worden gemeld en overgeslagen, geen fout', () => {
  const { onbekend } = svgNaarPdf('<svg width="10px" height="10px"><circle cx="1" cy="1" r="1"/><image href="x.png"/></svg>', A4);
  assert.deepEqual(onbekend.sort(), ['circle', 'image']);
});

test('een pdf-bestand met twee pagina’s en tekst in Times wordt door onze eigen lezer gelezen', async () => {
  const pagina = svgNaarPdf('<svg width="100px" height="100px"><text x="10" y="20" font-size="10px">Titel</text></svg>', A4).opdrachten;
  const bytes = await maakPdfBestand([pagina, pagina], A4);
  assert.ok(bytes instanceof Uint8Array);
  assert.equal(naarTekst(bytes.subarray(0, 5)), '%PDF-');
  const pdf = await openPdf(bytes);
  assert.equal(pdf.paginas.length, 2);
  assert.deepEqual(pdf.paginas[0].maat, [0, 0, 595.28, 841.89]);
  const [eerste] = await leesPdfTekens(bytes);
  assert.equal(eerste.tekens.map((teken) => String.fromCharCode(teken.code)).join(''), 'Titel');
  assert.match(eerste.tekens[0].lettertype, /Times/);
});

test('een echte partituur van Verovio wordt helemaal omgezet (niets onbekend) tot een leesbare pdf', async () => {
  const require = createRequire(import.meta.url);
  const map = dirname(require.resolve('verovio'));
  const { default: maakModule } = await import(pathToFileURL(join(map, 'verovio-module.mjs')).href);
  const { VerovioToolkit } = await import(pathToFileURL(join(map, 'verovio.mjs')).href);
  const tk = new VerovioToolkit(await maakModule());
  tk.setOptions({ pageWidth: 2100, pageHeight: 2970, scale: 40, footer: 'none', header: 'none' });
  tk.loadData(await readFile(new URL('./voorbeelden/gemengd.musicxml', import.meta.url), 'utf8'));
  const { opdrachten, onbekend } = svgNaarPdf(tk.renderToSVG(1), A4);
  assert.deepEqual(onbekend, []);
  const pdf = await openPdf(await maakPdfBestand([opdrachten], A4));
  assert.equal(pdf.paginas.length, 1);
  const inhoud = naarTekst(await pdf.inhoud(pdf.paginas[0]));
  assert.ok((inhoud.match(/\bc\b/g) ?? []).length > 50, 'veel krommen (de muziektekens)');
});

test('een pad met een eigen lijndikte (notenbalklijn, stok, maatstreep bij Verovio) wordt ook als lijn getekend', () => {
  const { opdrachten } = svgNaarPdf('<svg width="100px" height="100px"><g class="staff"><path d="M10 20 L90 20" stroke-width="13"/></g></svg>', A4);
  assert.match(opdrachten, /13 w/);
  assert.match(opdrachten, /10 20 m\s+90 20 l\s+B/);
});

test('een onzichtbaar vlak (fill-opacity 0) wordt niet gevuld', () => {
  const { opdrachten } = svgNaarPdf('<svg width="100px" height="100px"><rect x="1" y="2" width="30" height="40" fill-opacity="0"/></svg>', A4);
  assert.equal(/\bf\b|\bB\b/.test(opdrachten), false);
});
