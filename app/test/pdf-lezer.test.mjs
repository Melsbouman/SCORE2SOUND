import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { filtersVan, naarTekst, openPdf } from '../src/pdf/lezer.mjs';

// Een kleine pdf met twee pagina's: een gecomprimeerde inhoudsstroom en een "JPEG" (DCTDecode) die niet uitgepakt mag worden.
function maakPdf() {
  const delen = [];
  const voeg = (tekst) => delen.push(Buffer.from(tekst, 'latin1'));
  const inhoud = deflateSync(Buffer.from('BT /F1 12 Tf 72 700 Td (Hallo) Tj ET', 'latin1'));
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x80, 0x90, 0xff, 0xd9]);
  voeg('%PDF-1.4\n');
  voeg('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n');
  voeg('2 0 obj << /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 /MediaBox [0 0 595 842] >> endobj\n');
  voeg('3 0 obj << /Type /Page /Parent 2 0 R /Contents 5 0 R /Resources << /XObject << /Im1 6 0 R >> >> >> endobj\n');
  voeg('4 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] >> endobj\n');
  voeg(`5 0 obj << /Length ${inhoud.length} /Filter /FlateDecode >> stream\n`);
  delen.push(inhoud);
  voeg('\nendstream endobj\n');
  voeg(`6 0 obj << /Type /XObject /Subtype /Image /Width 1 /Height 1 /Filter [/DCTDecode] /Length ${jpeg.length} >> stream\n`);
  delen.push(jpeg);
  voeg('\nendstream endobj\n%%EOF\n');
  return new Uint8Array(Buffer.concat(delen));
}

test('pagina’s op volgorde, met eigen of geërfde MediaBox', async () => {
  const pdf = await openPdf(maakPdf());
  assert.deepEqual(pdf.paginas.map((pagina) => pagina.maat), [[0, 0, 595, 842], [0, 0, 842, 595]]);
  assert.deepEqual(pdf.paginas.map((pagina) => pagina.nummer), [3, 4]);
});

test('een FlateDecode-stroom wordt uitgepakt, een DCTDecode-stroom (JPEG) blijft zoals hij is', async () => {
  const pdf = await openPdf(maakPdf());
  assert.equal(naarTekst(await pdf.stroom(5)), 'BT /F1 12 Tf 72 700 Td (Hallo) Tj ET');
  assert.deepEqual([...await pdf.stroom(6)], [0xff, 0xd8, 0xff, 0xe0, 0x80, 0x90, 0xff, 0xd9]);
  assert.deepEqual(filtersVan(pdf.objecten.get(6).woordenboek), ['DCTDecode']);
});

test('de inhoud van een pagina zonder inhoudsstroom is leeg', async () => {
  const pdf = await openPdf(maakPdf());
  assert.equal(naarTekst(await pdf.inhoud(pdf.paginas[1])).trim(), '');
});

test('naarTekst houdt elke byte (ook boven 127) als één teken met dezelfde code', () => {
  const bytes = new Uint8Array(256).map((_, i) => i);
  const tekst = naarTekst(bytes);
  assert.equal(tekst.length, 256);
  assert.ok([...tekst].every((teken, i) => teken.charCodeAt(0) === i));
});

test('een kapotte gecomprimeerde stroom geeft lege bytes, geen fout', async () => {
  const kapot = Buffer.from('%PDF-1.4\n1 0 obj << /Length 4 /Filter /FlateDecode >> stream\nabcd\nendstream endobj\n', 'latin1');
  const pdf = await openPdf(new Uint8Array(kapot));
  assert.equal((await pdf.stroom(1)).length, 0);
});

test('een stroom met alleen CR na stream, en een lengte in een ander object (/Length 10 0 R), worden goed gelezen', async () => {
  const CR = String.fromCharCode(13);
  const LF = String.fromCharCode(10);
  const inhoud = `q 1 0 0 1 0 0 cm /Im1 Do Q`;
  const pdf = await openPdf(new Uint8Array(Buffer.from([
    `%PDF-1.4${LF}`,
    `1 0 obj${CR}<< /Length ${inhoud.length} ${CR}>>${CR}stream${CR}${inhoud}${CR}endstream${CR}endobj${CR}`,
    `2 0 obj${CR}${LF}<< /Length 3 0 R >>${CR}${LF}stream${CR}${LF}${inhoud}${CR}${LF}endstream${CR}${LF}endobj${CR}${LF}`,
    `3 0 obj${CR}${LF}${inhoud.length}${CR}${LF}endobj${CR}${LF}`,
  ].join(''), 'latin1')));
  assert.equal(naarTekst(await pdf.stroom(1)), inhoud);
  assert.equal(naarTekst(await pdf.stroom(2)), inhoud);
});

test('een verkeerde /Length (te lang) valt terug op endstream', async () => {
  const LF = String.fromCharCode(10);
  const pdf = await openPdf(new Uint8Array(Buffer.from(`%PDF-1.4${LF}1 0 obj << /Length 999 >> stream${LF}abc${LF}endstream endobj${LF}`, 'latin1')));
  assert.equal(naarTekst(await pdf.stroom(1)), 'abc');
});
