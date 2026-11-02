import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';
import { controleerMaatduur } from '../src/controle/maatduur.mjs';

const voorbeeld = new URL('./voorbeelden/gemengd.musicxml', import.meta.url);

test('gemengde MusicXML blijft gelijk na schrijven en opnieuw lezen', async () => {
  const xml = await readFile(voorbeeld, 'utf8');
  const eerste = leesMusicXML(xml);
  const tweede = leesMusicXML(naarMusicXML(eerste));

  assert.equal(tweede.partijen.length, eerste.partijen.length);
  assert.equal(tweede.partijen[0].maten.length, 8);
  assert.equal(tweede.partijen[0].maten.length, eerste.partijen[0].maten.length);

  const velden = ['balk', 'tuplet', 'fermate', 'letter', 'maatrust'];
  const waarden = (model) => {
    const gevonden = [];
    const bezoek = (waarde) => {
      if (!waarde || typeof waarde !== 'object') return;
      const aanwezigeVelden = velden.filter((veld) => veld in waarde);
      if (aanwezigeVelden.length > 0) {
        gevonden.push(Object.fromEntries(
          aanwezigeVelden.map((veld) => [veld, waarde[veld]]),
        ));
      }
      Object.values(waarde).forEach(bezoek);
    };
    bezoek(model.partijen);
    return gevonden;
  };

  assert.deepEqual(waarden(tweede), waarden(eerste));
  assert.deepEqual(controleerMaatduur(tweede), []);
});
