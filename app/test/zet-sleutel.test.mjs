import test from 'node:test';
import assert from 'node:assert/strict';
import { zetSleutel } from '../src/model/maten-bewerken.mjs';

test('sleutel zetten op maat 3 verandert maat 3 en 4', () => {
  const vioolsleutel = {
    teken: 'G',
    lijn: 2,
    notenbalk: 1,
    octaafVerschuiving: 0,
  };
  const partituur = {
    partijen: [{
      id: 'partij-1',
      maten: [0, 1, 2, 3].map((index) => ({
        nummer: String(index + 1),
        index,
        sleutels: [{ ...vioolsleutel }],
      })),
    }],
  };

  const nieuw = zetSleutel(partituur, 'partij-1', 2, 'F', 4);

  assert.deepEqual(nieuw.partijen[0].maten.map((maat) => maat.sleutels[0]), [
    vioolsleutel,
    vioolsleutel,
    { teken: 'F', lijn: 4, notenbalk: 1, octaafVerschuiving: 0 },
    { teken: 'F', lijn: 4, notenbalk: 1, octaafVerschuiving: 0 },
  ]);
});
