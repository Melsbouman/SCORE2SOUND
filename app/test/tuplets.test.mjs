import test from 'node:test';
import assert from 'node:assert/strict';
import { schrijfNoot } from '../src/model/invoeren.mjs';
import { maakLeegStuk } from '../src/model/nieuw.mjs';
import { TUPLETS, maakTuplet } from '../src/model/tuplets.mjs';

function maakStuk() {
  const leeg = maakLeegStuk({ instrumenten: ['trompet'], aantalMaten: 1 });
  return schrijfNoot(leeg, 'P1', 0, 0, 480, { stap: 'C', alter: 0, octaaf: 5 });
}

for (const { id, aantal, normaal } of TUPLETS) {
  test(`maakTuplet maakt van een kwartnoot een ${id}`, () => {
    const resultaat = maakTuplet(maakStuk(), 'n-P1-0-0', id);
    const maat = resultaat.partijen[0].maten[0];
    const delen = maat.elementen.filter((element) => element.tuplet);

    assert.equal(delen.length, aantal);
    assert.equal(delen.reduce((som, deel) => som + deel.duur, 0), 480);
    assert.equal(delen[0].start, 0);
    delen.forEach((deel, index) => {
      assert.equal(deel.tuplet.aantal, aantal);
      assert.equal(deel.tuplet.normaal, normaal);
      assert.equal(deel.tuplet.begin, index === 0);
      assert.equal(deel.tuplet.eind, index === aantal - 1);
      if (index > 0) assert.equal(deel.start, delen[index - 1].start + delen[index - 1].duur);
    });
    assert.equal(maat.duur ?? 1920, 1920);
  });
}

test('maakTuplet geeft een fout bij een onbekende tupletId', () => {
  assert.throws(() => maakTuplet(maakStuk(), 'n-P1-0-0', 'twaalftool'), /Onbekende tuplet/);
});
