import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { leesPdfTekens } from '../src/server/pdftekens.mjs';

// Een kleine pdf in de test zelf: catalogus, pagina's, een pagina, een lettertype met breedtes en een gecomprimeerde inhoud.
function maakPdf(inhoud, { objectstroom = false } = {}) {
  const stroom = deflateSync(Buffer.from(inhoud, 'latin1'));
  const font = '<< /Type /Font /Subtype /Type1 /BaseFont /Maestro /FirstChar 65 /Widths [500 600] >>';
  const delen = [
    '%PDF-1.5\n',
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 /Resources << /Font << /F1 4 0 R >> >> >> endobj\n',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 5 0 R >> endobj\n',
  ];
  if (objectstroom) {
    const kop = '4 0 ';
    const data = Buffer.from(`${kop}${font}`, 'latin1');
    const gecomprimeerd = deflateSync(data);
    delen.push(`6 0 obj << /Type /ObjStm /N 1 /First ${kop.length} /Filter /FlateDecode /Length ${gecomprimeerd.length} >>\nstream\n`);
    delen.push(gecomprimeerd);
    delen.push('\nendstream endobj\n');
  } else {
    delen.push(`4 0 obj ${font} endobj\n`);
  }
  delen.push(`5 0 obj << /Length ${stroom.length} /Filter /FlateDecode >>\nstream\n`);
  delen.push(stroom);
  delen.push('\nendstream endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n');
  return Buffer.concat(delen.map((deel) => (Buffer.isBuffer(deel) ? deel : Buffer.from(deel, 'latin1'))));
}

test('tekens met plek, grootte en opschuiven volgens de breedte van het lettertype', async () => {
  const pdf = maakPdf('BT /F1 20 Tf 1 0 0 1 100 700 Tm (AB) Tj 0 -30 Td [(A) -1000 (B)] TJ ET');
  const [pagina] = await leesPdfTekens(pdf);
  assert.equal(pagina.pagina, 1);
  assert.deepEqual(pagina.tekens, [
    { lettertype: 'Maestro', code: 65, x: 100, y: 700, grootte: 20 },
    { lettertype: 'Maestro', code: 66, x: 110, y: 700, grootte: 20 },
    { lettertype: 'Maestro', code: 65, x: 100, y: 670, grootte: 20 },
    { lettertype: 'Maestro', code: 66, x: 130, y: 670, grootte: 20 },
  ]);
});

test('een transformatie (cm) verschuift en vergroot de tekens; q en Q zetten hem terug', async () => {
  const pdf = maakPdf('q 2 0 0 2 0 0 cm BT /F1 10 Tf 1 0 0 1 10 20 Tm (A) Tj ET Q BT /F1 10 Tf 1 0 0 1 10 20 Tm (B) Tj ET');
  const [pagina] = await leesPdfTekens(pdf);
  assert.deepEqual(pagina.tekens, [
    { lettertype: 'Maestro', code: 65, x: 20, y: 40, grootte: 20 },
    { lettertype: 'Maestro', code: 66, x: 10, y: 20, grootte: 10 },
  ]);
});

test('een lettertype in een objectstroom wordt ook gevonden, en hex-tekst en escapes werken', async () => {
  const pdf = maakPdf('BT /F1 12 Tf 50 60 Td <41> Tj (\\102) Tj ET', { objectstroom: true });
  const [pagina] = await leesPdfTekens(pdf);
  assert.deepEqual(pagina.tekens, [
    { lettertype: 'Maestro', code: 65, x: 50, y: 60, grootte: 12 },
    { lettertype: 'Maestro', code: 66, x: 56, y: 60, grootte: 12 },
  ]);
});

test('een pdf zonder pagina geeft een lege lijst', async () => {
  assert.deepEqual(await leesPdfTekens(Buffer.from('%PDF-1.4\n%%EOF\n')), []);
});
