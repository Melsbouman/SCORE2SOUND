import test from 'node:test';
import assert from 'node:assert/strict';

import { samenvattingHerkenning } from '../src/model/samenvatting.mjs';

test('vat onzekere herkenning samen', () => {
  const partituur = {
    partijen: [
      {
        maten: [
          {
            maatrust: 1,
            noten: [{ zekerheid: 0.7 }, { zekerheid: 0.8 }],
            aanwijzingen: [
              { type: 'letter', zekerheid: 0.6 },
              { type: 'letter', zekerheid: 0.9 },
              { type: 'dynamiek', zekerheid: 0.5 },
            ],
          },
          {
            maatrust: 0,
            noten: [{ zekerheid: 0.5 }],
            aanwijzingen: [],
          },
        ],
      },
    ],
  };

  assert.equal(
    samenvattingHerkenning(partituur),
    '2 onzekere noten, 1 aangenomen letters, 1 maten met maatrust',
  );
});

test('laat onderdelen met aantal nul weg', () => {
  const partituur = {
    partijen: [
      {
        maten: [
          {
            maatrust: 0,
            noten: [{ zekerheid: 0.4 }],
            aanwijzingen: [],
          },
        ],
      },
    ],
  };

  assert.equal(samenvattingHerkenning(partituur), '1 onzekere noten');
});

test('meldt dat alles zeker lijkt zonder onzekerheden', () => {
  const partituur = {
    partijen: [
      {
        maten: [
          {
            maatrust: 0,
            noten: [{ zekerheid: 0.8 }],
            aanwijzingen: [{ type: 'letter', zekerheid: 0.8 }],
          },
        ],
      },
    ],
  };

  assert.equal(samenvattingHerkenning(partituur), 'Alles lijkt zeker.');
});
