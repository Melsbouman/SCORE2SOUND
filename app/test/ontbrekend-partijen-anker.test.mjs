import assert from 'node:assert/strict';
import test from 'node:test';

import { vulOntbrekendeMaten } from '../src/model/ontbrekend.mjs';

const noot = { soort: 'noot', start: 0, duur: 1920, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, zekerheid: 1 };
const cijfer = (waarde) => ({ soort: 'aanwijzing', start: 0, type: 'letter', waarde: String(waarde), zekerheid: 1 });
const maat = (nummer, extra = {}) => ({
  nummer: String(nummer), index: nummer - 1, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen: [noot], ...extra,
});

test('een kortere tweede partij houdt het vullen van een lege maat in de eerste partij niet tegen', () => {
  // Cijfer 1 en 10: er ontbreken 5 maten en maat 4 is leeg (wordt een rust van 6); de tweede partij heeft maar 2 maten.
  const eerste = [maat(1, { elementen: [noot, cijfer(1)] }), maat(2), maat(3), maat(4, { elementen: [] }), maat(5, { elementen: [noot, cijfer(10)] })];
  const uit = vulOntbrekendeMaten({ partijen: [{ id: 'P1', maten: eerste }, { id: 'P2', maten: [maat(1), maat(2)] }] });
  assert.equal(uit.partijen[0].maten[3].maatrust, 6);
  assert.equal(uit.partijen[0].maten.filter((huidige) => huidige.ingevoegd).length, 0);
});

test('het laatste gedrukte maatnummer vult niets aan zonder een volgend nummer dat het bevestigt', () => {
  // Gedrukt 10, 20 en 36 (36 is verkeerd gelezen, moet 30 zijn) met steeds 10 maten ertussen.
  const maten = Array.from({ length: 30 }, (_, index) => maat(index + 1, { 9: { gedruktNummer: 10 }, 19: { gedruktNummer: 20 }, 29: { gedruktNummer: 36 } }[index] ?? {}));
  const uit = vulOntbrekendeMaten({ partijen: [{ id: 'P1', maten }] });
  assert.equal(uit.partijen[0].maten.filter((huidige) => huidige.ingevoegd).length, 0);
});
