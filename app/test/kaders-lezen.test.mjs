import assert from 'node:assert/strict';
import test from 'node:test';

import { leesKaderTeken } from '../src/server/kaders.mjs';

const rasters = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
};

function maakBeeld(teken) {
  const breedte = 40;
  const hoogte = 44;
  const zwart = Array.from({ length: hoogte }, () => Array(breedte).fill(false));
  for (let x = 2; x <= 37; x += 1) {
    zwart[2][x] = true;
    zwart[41][x] = true;
  }
  for (let y = 2; y <= 41; y += 1) {
    zwart[y][2] = true;
    zwart[y][37] = true;
  }
  if (teken) {
    const regels = rasters[teken];
    for (let y = 0; y < 7; y += 1) {
      for (let x = 0; x < 5; x += 1) {
        if (regels[y][x] !== '1') continue;
        for (let dy = 0; dy < 4; dy += 1) {
          for (let dx = 0; dx < 4; dx += 1) zwart[8 + y * 4 + dy][10 + x * 4 + dx] = true;
        }
      }
    }
  }
  return { breedte, hoogte, zwart };
}

const kader = { links: 2, boven: 2, rechts: 37, onder: 41 };

for (const teken of ['A', 'B', 'C']) {
  test(`leest ${teken} uit een kader`, () => {
    const gelezen = leesKaderTeken(maakBeeld(teken), kader);
    assert.equal(gelezen?.teken, teken);
    assert.ok(gelezen.score >= 0.6 && gelezen.score <= 1);
  });
}

test('geeft null voor een leeg kader', () => {
  assert.equal(leesKaderTeken(maakBeeld(null), kader), null);
});

test('geeft null voor een onleesbaar kader', () => {
  const beeld = maakBeeld(null);
  beeld.zwart[20][20] = true;
  assert.equal(leesKaderTeken(beeld, kader), null);
});
