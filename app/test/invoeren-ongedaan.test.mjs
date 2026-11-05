import test from 'node:test';
import assert from 'node:assert/strict';
import { maakGeschiedenis } from '../src/model/geschiedenis.mjs';
import { schrijfNoot } from '../src/model/invoeren.mjs';
import { maakLeegStuk } from '../src/model/nieuw.mjs';

test('een stap terug na het schrijven van een noot geeft weer de maatrust', () => {
  const geschiedenis = maakGeschiedenis(10);
  const leeg = maakLeegStuk({ instrumenten: ['trompet'], aantalMaten: 1 });
  geschiedenis.zet(leeg);

  const metNoot = schrijfNoot(leeg, 'P1', 0, 0, 480, { stap: 'C', alter: 0, octaaf: 5 });
  geschiedenis.zet(metNoot);

  const ongedaan = geschiedenis.ongedaan();
  assert.equal(ongedaan.partijen[0].maten[0].maatrust, true);
});
