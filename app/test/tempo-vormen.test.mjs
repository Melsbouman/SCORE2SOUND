import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { tempoLijst } from '../src/model/tempo.mjs';
import { tempoUitTekst } from '../src/model/tempotekst.mjs';

test('metronoom, sound tempo en tempowoord gelden vanaf hun maat', async () => {
  const xml = await readFile(new URL('./fixtures/tempo-vormen.xml', import.meta.url), 'utf8');
  const partituur = tempoUitTekst(leesMusicXML(xml));
  const wijzigingen = tempoLijst(partituur);
  const tempos = partituur.partijen[0].maten.map((_, maat) => {
    const huidig = wijzigingen.findLast((wijziging) => wijziging.maat <= maat);
    return huidig.bpm;
  });

  assert.deepEqual(wijzigingen, [
    { maat: 0, nummer: '1', bpm: 100 },
    { maat: 2, nummer: '3', bpm: 132 },
    { maat: 4, nummer: '5', bpm: 76 },
  ]);
  assert.deepEqual(tempos, [100, 100, 132, 132, 76, 76]);
});
