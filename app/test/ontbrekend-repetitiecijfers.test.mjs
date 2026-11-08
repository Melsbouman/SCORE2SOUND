import assert from 'node:assert/strict';
import test from 'node:test';

import { vulOntbrekendeMaten } from '../src/model/ontbrekend.mjs';

const rust = { soort: 'rust', start: 0, duur: 1920, stem: 1, notenbalk: 1, heleMaat: true, zekerheid: 1 };
const noot = { soort: 'noot', start: 0, duur: 1920, stem: 1, notenbalk: 1, toonhoogte: 60 };
const cijfer = (waarde) => ({ soort: 'aanwijzing', start: 0, type: 'letter', waarde: String(waarde), zekerheid: 1 });
const maat = (nummer, elementen) => ({
  nummer: String(nummer), index: nummer - 1, opmaat: false, maatsoort: { teller: 4, noemer: 4 },
  toonsoort: { kwinten: 0, modus: 'majeur' }, sleutels: [], tempo: null,
  herhaling: { begin: false, eind: false, keer: 2 }, elementen,
});
const reeks = (van, tot) => Array.from({ length: tot - van + 1 }, (_, index) => maat(van + index, [noot]));

test('repetitiecijfers die maatnummers zijn (22, 26, 30, 46) maken van een rustmaat geen meermaatsrust', () => {
  // Zoals Distant Land: maat 22 is een rustmaat met het kader 22 erboven, niet een rust van 22 maten.
  const maten = [
    ...reeks(1, 21), maat(22, [rust, cijfer(22)]), ...reeks(23, 25), maat(26, [noot, cijfer(26)]),
    ...reeks(27, 29), maat(30, [noot, cijfer(30)]), ...reeks(31, 45), maat(46, [noot, cijfer(46)]),
  ];
  const uit = vulOntbrekendeMaten({ partijen: [{ maten }] }).partijen[0].maten;
  assert.equal(uit.length, 46);
  assert.equal(uit[21].maatrust, undefined);
  assert.deepEqual(uit[21].elementen.map((element) => element.type ?? element.soort), ['rust', 'letter']);
});

test('de verborgen maten van een meermaatsrust krijgen alleen de rust: een tweede ronde vermenigvuldigt niets', () => {
  // Een rustmaat met het aantal 3 en het kader 30 van de maat erna (zo plaatst Audiveris het soms).
  const maten = [maat(1, [rust, cijfer(3), cijfer(30)]), maat(2, [noot])];
  const eerste = vulOntbrekendeMaten({ partijen: [{ maten }] });
  const tweede = vulOntbrekendeMaten(eerste).partijen[0].maten;
  assert.equal(tweede.length, 4);
  assert.equal(tweede[0].maatrust, 3);
  assert.deepEqual(tweede.slice(1, 3).map((huidige) => [huidige.verborgen, huidige.elementen.map((element) => element.soort)]), [[true, ['rust']], [true, ['rust']]]);
});
