import test from 'node:test';
import assert from 'node:assert/strict';
import { vulOntbrekendeMaten } from '../src/model/ontbrekend.mjs';

test('vulOntbrekendeMaten is idempotent', () => {
  const partituur = {
    partijen: [{
      id: 'P1',
      maten: [{
        nummer: '1',
        index: 0,
        maatsoort: { teller: 4, noemer: 4 },
        elementen: [
          { soort: 'rust', start: 0, duur: 1920, heleMaat: true },
          { soort: 'aanwijzing', type: 'letter', waarde: '9' },
        ],
      }],
    }],
  };

  const eersteResultaat = vulOntbrekendeMaten(partituur);
  const tweedeResultaat = vulOntbrekendeMaten(eersteResultaat);

  assert.deepEqual(tweedeResultaat, eersteResultaat);
});
