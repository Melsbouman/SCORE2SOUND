import test from 'node:test';
import assert from 'node:assert/strict';
import { maakPdf } from '../src/export/pdf.mjs';

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Flugel 1</part-name><rights>Copyright Eerste</rights></score-part>
    <score-part id="P2"><part-name>Flugel 2</part-name><rights>Copyright Tweede</rights></score-part>
  </part-list>
  <part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><note><rest/><duration>4</duration><type>whole</type></note></measure></part>
  <part id="P2"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><note><rest/><duration>4</duration><type>whole</type></note></measure></part>
</score-partwise>`;

const tekstUit = (pdf) => [...pdf.toString('latin1').matchAll(/\[([^\]]*)\]\s*TJ/g)]
  .map((reeks) => [...reeks[1].matchAll(/<([0-9a-f]*)>/gi)].map((stuk) => Buffer.from(stuk[1], 'hex').toString('latin1')).join(''))
  .join('\n');

test('elke partij begint op een nieuw blad met eigen titel en colofon', async () => {
  const pdf = await maakPdf(xml, {
    comprimeer: false,
    watermerk: false,
    titelblok: { titel: 'Feestmars', componist: 'Anna Componist' },
  });
  const tekst = tekstUit(pdf);

  assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length, 2);
  assert.equal(tekst.split('Feestmars').length - 1, 2);
  for (const deel of ['Flugel 1', 'Flugel 2', 'Copyright Eerste', 'Copyright Tweede']) {
    assert.equal(tekst.split(deel).length - 1, 1, `${deel} staat niet precies eenmaal in de pdf`);
  }
});
