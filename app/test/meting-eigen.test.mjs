import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { herkenEigen } from '../src/meting/eigen.mjs';
import { vatSamen } from '../src/meting/scanmeting.mjs';
import { maakBlad } from './hulp/blad.mjs';

const NL = '\n';

// Een kleine pdf: een bladzijde met één grijs beeld dat de hele bladzijde vult, of een bladzijde zonder beeld.
function maakPdf({ metBeelden = true, beeld = null } = {}) {
  const delen = [];
  const voeg = (tekst) => delen.push(Buffer.from(tekst, 'latin1'));
  const stroom = (nummer, woordenboek, data) => {
    voeg(`${nummer} 0 obj << ${woordenboek} /Length ${data.length} >> stream${NL}`);
    delen.push(Buffer.from(data));
    voeg(`${NL}endstream endobj${NL}`);
  };
  const b = beeld?.breedte ?? 100;
  const h = beeld?.hoogte ?? 200;
  voeg(`%PDF-1.4${NL}`);
  voeg(`1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj${NL}`);
  voeg(`2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 /MediaBox [0 0 ${b} ${h}] >> endobj${NL}`);
  if (metBeelden) {
    voeg(`3 0 obj << /Type /Page /Parent 2 0 R /Contents 4 0 R /Resources << /XObject << /Beeld 5 0 R >> >> >> endobj${NL}`);
    stroom(4, '/Filter /FlateDecode', deflateSync(Buffer.from(`q ${b} 0 0 ${h} 0 0 cm /Beeld Do Q`, 'latin1')));
    stroom(5, `/Type /XObject /Subtype /Image /Width ${b} /Height ${h} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode`,
      deflateSync(Buffer.from(beeld?.pixels ?? new Uint8Array(b * h).fill(255))));
  } else {
    voeg(`3 0 obj << /Type /Page /Parent 2 0 R /Contents 4 0 R >> endobj${NL}`);
    stroom(4, '', Buffer.from('0 0 m 100 100 l S', 'latin1'));
  }
  voeg(`%%EOF${NL}`);
  return new Uint8Array(Buffer.concat(delen));
}

test('eigen: een pdf zonder beelden geeft geen partituur en reden geen-beelden', async () => {
  const uit = await herkenEigen(maakPdf({ metBeelden: false }));
  assert.equal(uit.partituur, null);
  assert.equal(uit.reden, 'geen-beelden');
});

test('eigen: een pdf met één grijs beeld geeft een partituur met maten', async () => {
  const { beeld } = maakBlad({ balken: 1, koppen: true });
  const uit = await herkenEigen(maakPdf({ beeld }), { paginas: '1' });
  assert.ok(uit.partituur);
  assert.ok(uit.partituur.partijen[0].maten.length >= 1);
});

test('eigen: de kop van het overzicht noemt de eigen herkenning', () => {
  assert.ok(vatSamen([], '2026-11-10', 'eigen').startsWith('# Scanmeting 2026-11-10 (eigen herkenning)'));
  assert.ok(vatSamen([], '2026-11-10').startsWith('# Scanmeting 2026-11-10' + '\n'));
});
