import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { leesPdfTekens } from '../src/server/pdftekens.mjs';

// Een pdf waarvan de pagina zijn MediaBox (A4 liggend en staand) erft van de pagina-boom of zelf heeft.
function maakPdf(mediaboxPages, mediaboxPage) {
  const stroom = deflateSync(Buffer.from('BT /F1 10 Tf 10 10 Td (A) Tj ET', 'latin1'));
  const delen = [
    '%PDF-1.4\n',
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n',
    `2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 ${mediaboxPages ? `/MediaBox [${mediaboxPages}]` : ''} /Resources << /Font << /F1 4 0 R >> >> >> endobj\n`,
    `3 0 obj << /Type /Page /Parent 2 0 R ${mediaboxPage ? `/MediaBox [${mediaboxPage}]` : ''} /Contents 5 0 R >> endobj\n`,
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Maestro >> endobj\n',
    `5 0 obj << /Length ${stroom.length} /Filter /FlateDecode >>\nstream\n`,
    stroom,
    '\nendstream endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n',
  ];
  return Buffer.concat(delen.map((deel) => (Buffer.isBuffer(deel) ? deel : Buffer.from(deel, 'latin1'))));
}

test('de pagina geeft haar breedte en hoogte in punten (MediaBox), ook als ze die erft', () => {
  const [eigen] = leesPdfTekens(maakPdf(null, '0 0 595.28 841.89'));
  assert.deepEqual([eigen.breedte, eigen.hoogte], [595.28, 841.89]);
  const [geerfd] = leesPdfTekens(maakPdf('0 0 842 595', null));
  assert.deepEqual([geerfd.breedte, geerfd.hoogte], [842, 595]);
});
