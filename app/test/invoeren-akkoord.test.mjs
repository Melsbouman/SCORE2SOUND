import test from 'node:test';
import assert from 'node:assert/strict';
import { schrijfNoot, voegAkkoordNootToe } from '../src/model/invoeren.mjs';

const partituur = {
  partijen: [{
    id: 'P1',
    maten: [{
      maatsoort: { teller: 4, noemer: 4 },
      elementen: [],
    }],
  }],
};

test('voegAkkoordNootToe voegt een noot met dezelfde start en duur toe', () => {
  const metC = schrijfNoot(
    partituur, 'P1', 0, 0, 480, { stap: 'C', alter: 0, octaaf: 5 },
  );
  const metAkkoord = voegAkkoordNootToe(
    metC, 'P1', 0, 0, { stap: 'E', alter: 0, octaaf: 5 },
  );
  const noten = metAkkoord.partijen[0].maten[0].elementen;

  assert.equal(noten.length, 2);
  assert.equal(noten[0].start, noten[1].start);
  assert.equal(noten[0].duur, noten[1].duur);
  assert.equal(noten[1].akkoord, true);
});
