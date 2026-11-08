import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { koppelOmr, bladenUitOmr } from '../src/server/omr.mjs';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { leesZip } from '../src/server/zip.mjs';

const voorbeeld = (naam) => readFile(new URL(`./voorbeelden/${naam}`, import.meta.url));

test('koppelOmr geeft elke gekoppelde maat zijn vak op het blad', async () => {
  const partituur = leesMusicXML((await voorbeeld('herkenning.xml')).toString('utf8'));
  const bladen = bladenUitOmr(leesZip(await voorbeeld('herkenning.omr')), [1]);
  const { partituur: uit } = koppelOmr(partituur, bladen);
  const metVak = uit.partijen.flatMap((p) => p.maten).filter((m) => m.vak);
  assert.ok(metVak.length > 0);
  for (const maat of metVak) {
    assert.equal(maat.vak.blad, 1);
    assert.ok(maat.vak.links < maat.vak.rechts);
    assert.ok(maat.vak.boven < maat.vak.onder);
  }
});
