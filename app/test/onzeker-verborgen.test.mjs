import test from 'node:test';
import assert from 'node:assert/strict';
import { onzekereElementen } from '../src/model/corrigeren.mjs';
import { vulOntbrekendeMaten } from '../src/model/ontbrekend.mjs';

const noot = { soort: 'noot', start: 0, duur: 1920, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, zekerheid: 1 };
const rust = (zekerheid) => ({ soort: 'rust', start: 0, duur: 1920, stem: 1, notenbalk: 1, heleMaat: true, zekerheid });
const cijfer = (waarde) => ({ soort: 'aanwijzing', start: 0, type: 'letter', waarde: String(waarde), zekerheid: 1 });
const maat = (nummer, elementen, extra = {}) => ({
  nummer: String(nummer), index: nummer - 1, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen, ...extra,
});

test('verborgen maten achter een meermaatsrust tellen niet als onzeker (ze staan niet in de weergave)', () => {
  const maten = [maat(1, [rust(0.3)], { maatrust: 3 }), maat(2, [rust(0.3)], { verborgen: true }), maat(3, [rust(0.3)], { verborgen: true }), maat(4, [noot])];
  assert.deepEqual(onzekereElementen({ partijen: [{ id: 'P1', maten }] }), ['n-P1-0-0']);
});

test('de verborgen maten van een aangevulde rust zijn zeker; alleen de eerste maat is rood', () => {
  const maten = [maat(1, [noot, cijfer(1)]), maat(2, [noot]), maat(3, []), maat(4, [noot]), maat(5, [noot, cijfer(7)])];
  const uit = vulOntbrekendeMaten({ partijen: [{ id: 'P1', maten }] }).partijen[0].maten;
  assert.deepEqual(uit.filter((huidige) => huidige.verborgen).map((huidige) => huidige.elementen[0].zekerheid), [1, 1]);
  assert.equal(uit[2].elementen[0].zekerheid, 0.3);
});
