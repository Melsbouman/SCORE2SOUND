import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';
import { tempoLijst } from '../src/model/tempo.mjs';
import { tempoUitTekst } from '../src/model/tempotekst.mjs';

test('tempowissels blijven behouden na schrijven en lezen', async () => {
  const eerst = tempoUitTekst(leesMusicXML(
    await readFile(new URL('./fixtures/tempo-vormen.xml', import.meta.url), 'utf8')
  ));
  const opnieuw = leesMusicXML(naarMusicXML(eerst));

  assert.deepEqual(tempoLijst(opnieuw), tempoLijst(eerst));
});
