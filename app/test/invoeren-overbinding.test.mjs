import test from 'node:test';
import assert from 'node:assert/strict';
import { schrijfNootMetOverbinding } from '../src/model/invoeren.mjs';

test('splitst een noot over de maatstreep met een overbinding', () => {
  const partituur = {
    partijen: [{
      id: 'partij-1',
      maten: [0, 1].map(() => ({
        maatsoort: { teller: 4, noemer: 4 },
        elementen: [{
          soort: 'rust', start: 0, duur: 1920, stem: 1, notenbalk: 1,
          heleMaat: true, zekerheid: 1,
        }],
        maatrust: true,
      })),
    }],
  };
  const toonhoogte = { stap: 'C', alter: 0, octaaf: 5 };

  const resultaat = schrijfNootMetOverbinding(
    partituur, 'partij-1', 0, 1440, 960, toonhoogte,
  );

  const eersteNoot = resultaat.partijen[0].maten[0].elementen.find(
    (element) => element.soort === 'noot',
  );
  const tweedeNoot = resultaat.partijen[0].maten[1].elementen.find(
    (element) => element.soort === 'noot',
  );
  assert.equal(eersteNoot.start, 1440);
  assert.equal(eersteNoot.duur, 480);
  assert.deepEqual(eersteNoot.overbinding, { begin: true, eind: false });
  assert.equal(tweedeNoot.start, 0);
  assert.equal(tweedeNoot.duur, 480);
  assert.deepEqual(tweedeNoot.overbinding, { begin: false, eind: true });
});
