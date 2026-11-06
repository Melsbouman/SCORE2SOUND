import test from 'node:test';
import assert from 'node:assert/strict';
import { vulOntbrekendeMaten } from '../src/model/ontbrekend.mjs';

const noot = () => ({ soort: 'noot', start: 0, duur: 480 });
const rust = () => ({ soort: 'rust', start: 0, duur: 1920, heleMaat: true });
const letter = (waarde) => ({ soort: 'aanwijzing', type: 'letter', waarde });
const maat = (index, elementen = [noot()]) => ({
  nummer: String(index + 1),
  index,
  maatsoort: { teller: 4, noemer: 4 },
  elementen,
});

test('een samengestelde rust houdt twee partijen even lang', () => {
  const eersteMaten = [maat(0), maat(1), maat(2, [rust(), letter('14')]), maat(3)];
  const tweedeMaten = [maat(0), maat(1), maat(2, [rust()]), maat(3)];
  const resultaat = vulOntbrekendeMaten({
    partijen: [
      { id: 'P1', maten: eersteMaten },
      { id: 'P2', maten: tweedeMaten },
    ],
  });

  assert.equal(resultaat.partijen[0].maten.length, resultaat.partijen[1].maten.length);
  for (const partij of resultaat.partijen) {
    assert.equal(partij.maten.length, 17);
    assert.equal(partij.maten[2].maatrust, 14);
    assert.ok(partij.maten.slice(3, 16).every((huidigeMaat) => huidigeMaat.verborgen));
    assert.equal(partij.maten[16].nummer, '17');
  }
});
