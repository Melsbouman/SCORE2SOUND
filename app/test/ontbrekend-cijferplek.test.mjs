import assert from 'node:assert/strict';
import test from 'node:test';

import { vulOntbrekendeMaten } from '../src/model/ontbrekend.mjs';

const rust = { soort: 'rust', start: 0, duur: 1920, stem: 1, notenbalk: 1, heleMaat: true, zekerheid: 1 };
const noot = { soort: 'noot', start: 0, duur: 1920, stem: 1, notenbalk: 1, toonhoogte: 60 };
const cijfer = (waarde) => ({ soort: 'aanwijzing', start: 0, type: 'letter', waarde: String(waarde), zekerheid: 1 });
const maat = (nummer, elementen, extra = {}) => ({
  nummer: String(nummer), index: nummer - 1, opmaat: false, maatsoort: { teller: 4, noemer: 4 },
  toonsoort: { kwinten: 0, modus: 'majeur' }, sleutels: [], tempo: null,
  herhaling: { begin: false, eind: false, keer: 2 }, elementen, ...extra,
});
// Maten van..tot met een noot; in cijfers staat per maatnummer welke cijfers erbij horen.
const reeks = (van, tot, cijfers = {}) => Array.from({ length: tot - van + 1 }, (_, plek) => {
  const nummer = van + plek;
  return maat(nummer, [noot, ...(cijfers[nummer] ?? []).map(cijfer)]);
});
const meermaatsrust = (nummer, aantal, cijfers = []) => [
  maat(nummer, [rust, ...cijfers.map(cijfer)], { maatrust: aantal }),
  ...Array.from({ length: aantal - 1 }, (_, plek) => maat(nummer + plek + 1, [rust], { verborgen: true })),
];
const cijfersPerMaat = (maten) => maten.flatMap((huidige) => huidige.elementen.filter((element) => element.type === 'letter').map((element) => `${element.waarde}@${huidige.nummer}`));

test('het hoogste van twee cijfers in één rustmaat gaat naar de maat na de rust (Distant Land, kader 26 en 30)', () => {
  const maten = [...reeks(1, 25, { 22: [22] }), ...meermaatsrust(26, 4, [26, 30]), ...reeks(30, 50, { 38: [38], 46: [46] })];
  const uit = vulOntbrekendeMaten({ partijen: [{ maten }] }).partijen[0].maten;
  assert.equal(uit.length, 50);
  assert.equal(uit.some((huidige) => huidige.ingevoegd), false);
  assert.deepEqual(cijfersPerMaat(uit), ['22@22', '26@26', '30@30', '38@38', '46@46']);
});

test('een cijfer op een gewone maat blijft staan, ook als het aantal maten met de volgende maat zou kloppen (kan een ontbrekende maat zijn)', () => {
  const maten = [...reeks(1, 28, { 28: [29] }), ...meermaatsrust(29, 3), ...reeks(32, 61, { 41: [41], 61: [61] })];
  const uit = vulOntbrekendeMaten({ partijen: [{ maten }] }).partijen[0].maten;
  assert.equal(uit.length, 61);
  assert.deepEqual(cijfersPerMaat(uit).slice(0, 1), ['29@28']);
  assert.equal(uit[28].maatrust, 3);
});

test('een cijfer op een meermaatsrust gaat naar de maat erna als het aantal maten alleen zo klopt (Sand and Stars, kader 41)', () => {
  const maten = [...reeks(1, 34, { 29: [29] }), ...meermaatsrust(35, 6, [41]), ...reeks(41, 60, { 50: [50] })];
  const uit = vulOntbrekendeMaten({ partijen: [{ maten }] }).partijen[0].maten;
  assert.equal(uit.length, 60);
  assert.deepEqual(cijfersPerMaat(uit), ['29@29', '41@41', '50@50']);
});

test('cijfers die al op hun maat staan blijven staan', () => {
  const maten = reeks(1, 60, { 9: [9], 17: [17], 25: [25], 41: [41], 57: [57] });
  const uit = vulOntbrekendeMaten({ partijen: [{ maten }] }).partijen[0].maten;
  assert.deepEqual(cijfersPerMaat(uit), ['9@9', '17@17', '25@25', '41@41', '57@57']);
});
