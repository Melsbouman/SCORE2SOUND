import test from 'node:test';
import assert from 'node:assert/strict';
import { maakPdf } from '../src/export/pdf.mjs';
import { maakLeegStuk } from '../src/model/nieuw.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';

test('pdf van een nieuw stuk begint voor elke partij op een nieuw blad', async () => {
  const stuk = maakLeegStuk({
    instrumenten: ['trompet', 'hoorn', 'tuba'],
    aantalMaten: 4,
  });

  const pdf = await maakPdf(naarMusicXML(stuk), { comprimeer: false, watermerk: false });

  assert.ok(pdf.length > 0);
  assert.equal(pdf.subarray(0, 4).toString('latin1'), '%PDF');
  assert.ok((pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length >= 3);
});
