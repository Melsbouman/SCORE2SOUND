import test from 'node:test';
import assert from 'node:assert/strict';
import { maakLeegStuk } from '../src/model/nieuw.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';

test('een nieuw pianostuk heeft per maat twee notenbalken', () => {
  const stuk = maakLeegStuk({ instrumenten: ['piano'], aantalMaten: 2 });

  for (const maat of stuk.partijen[0].maten) {
    assert.deepEqual(maat.sleutels, [
      { teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 },
      { teken: 'F', lijn: 4, notenbalk: 2, octaafVerschuiving: 0 },
    ]);
    assert.equal(maat.maatrust, true);
    assert.equal(maat.elementen.length, 2);
    assert.deepEqual(maat.elementen.map((element) => element.soort), ['rust', 'rust']);
    assert.deepEqual(maat.elementen.map((element) => element.notenbalk), [1, 2]);
    assert.deepEqual(maat.elementen.map((element) => element.heleMaat), [true, true]);
  }

  assert.match(naarMusicXML(stuk), /<staves>2<\/staves>/);
});
