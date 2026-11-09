import assert from 'node:assert/strict';
import test from 'node:test';

import { vulOntbrekendeMaten } from '../src/model/ontbrekend.mjs';
import { vergelijkGedrukteMaatnummers, zetGedrukteNummers } from '../src/model/gedruktenummers.mjs';

const noot = { soort: 'noot', start: 0, duur: 1920, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, zekerheid: 1 };
const maat = (nummer, extra = {}) => ({
  nummer: String(nummer), index: nummer - 1, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen: [noot], ...extra,
});
// 30 maten; gedrukte nummers op de maten met index 9, 14 en 24.
function stuk(ankers, extra = {}) {
  const maten = Array.from({ length: 30 }, (_, index) => maat(index + 1, ankers[index] ? { gedruktNummer: ankers[index] } : {}));
  if (extra.letter) maten[2].elementen = [{ soort: 'aanwijzing', start: 0, type: 'letter', waarde: '3', zekerheid: 1, kader: true }, noot];
  return { partijen: [{ id: 'P1', maten }] };
}
const ingevoegd = (uit) => uit.partijen[0].maten.filter((huidige) => huidige.ingevoegd).length;

test('gedrukte maatnummers aan het begin van een regel vullen ontbrekende maten aan als het volgende nummer het bevestigt', () => {
  // Op het blad 10, 20 en 30; de herkenning heeft tussen 10 en 20 maar 5 maten (er ontbreken er 5), tussen 20 en 30 wel 10.
  const uit = vulOntbrekendeMaten(stuk({ 9: 10, 14: 20, 24: 30 }));
  assert.equal(ingevoegd(uit), 5);
  assert.equal(uit.partijen[0].maten.find((huidige) => huidige.gedruktNummer === 20).nummer, '20');
});

test('een verkeerd gelezen nummer (26 voor 20) vult niets aan: het volgende nummer bevestigt het niet', () => {
  assert.equal(ingevoegd(vulOntbrekendeMaten(stuk({ 9: 10, 14: 26, 24: 30 }))), 0);
});

test('met genummerde repetitiecijfers tellen de gedrukte maatnummers niet mee', () => {
  assert.equal(ingevoegd(vulOntbrekendeMaten(stuk({ 9: 10, 14: 20, 24: 30 }, { letter: true }))), 0);
});

test('zetGedrukteNummers zet het getal links boven de eerste maat van een regel bij die maat', () => {
  const partituur = { partijen: [{ id: 'P1', maten: [
    { nummer: '1', index: 0, regelbegin: true, vak: { blad: 1, links: 150, rechts: 650, boven: 700, onder: 780 }, elementen: [] },
    { nummer: '2', index: 1, regelbegin: false, vak: { blad: 1, links: 650, rechts: 1150, boven: 700, onder: 780 }, elementen: [] },
  ] }] };
  const woorden = [{ blad: 1, regels: [{ tekst: '17', woorden: [{ tekst: '17', x: 150, y: 650, breedte: 40, hoogte: 40 }] }] }];
  const uit = zetGedrukteNummers(partituur, woorden).partijen[0].maten;
  assert.deepEqual(uit.map((huidige) => huidige.gedruktNummer ?? null), [17, null]);
});

test('meer dan 40 maten verschil geeft geen melding (een verkeerd gelezen getal)', () => {
  const partituur = { partijen: [{ id: 'P1', maten: [
    { nummer: '364', index: 0, regelbegin: true, vak: { blad: 1, links: 150, rechts: 650, boven: 700, onder: 780 }, elementen: [] },
  ] }] };
  const woorden = [{ blad: 1, regels: [{ tekst: '864', woorden: [{ tekst: '864', x: 150, y: 650, breedte: 50, hoogte: 40 }] }] }];
  assert.equal(vergelijkGedrukteMaatnummers(partituur, woorden).meldingen.length, 0);
});
