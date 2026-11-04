import assert from 'node:assert/strict';
import test from 'node:test';

import { vulOntbrekendeMaten } from '../src/model/ontbrekend.mjs';

function noot(tijd = 0) {
  return { type: 'noot', tijd, duur: 480, toonhoogte: 60 };
}

function letter(waarde) {
  return { type: 'letter', waarde };
}

function maat(nummer, elementen = [noot()]) {
  return { nummer, elementen };
}

function stuk(maten) {
  return { partijen: [{ maten }] };
}

test('een meermaatsrust telt als meerdere maten', () => {
  const invoer = stuk([
    maat(1, [letter('1')]),
    { ...maat(2, [{ type: 'rust', heleMaat: true }]), maatrust: 3 },
    maat(5, [letter('5')]),
  ]);

  const resultaat = vulOntbrekendeMaten(invoer);

  assert.equal(resultaat.partijen[0].maten.length, 3);
  assert.equal(resultaat.partijen[0].maten[1].maatrust, 3);
  assert.deepEqual(resultaat.partijen[0].maten[1].elementen, [
    { type: 'rust', heleMaat: true },
  ]);
});
