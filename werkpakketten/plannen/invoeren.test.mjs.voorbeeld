import test from 'node:test';
import assert from 'node:assert/strict';
import { maakLeegStuk } from '../src/model/nieuw.mjs';
import { schrijfNoot } from '../src/model/invoeren.mjs';

const C5 = { stap: 'C', alter: 0, octaaf: 5 };
const D5 = { stap: 'D', alter: 0, octaaf: 5 };
const nieuw = () => maakLeegStuk({ instrumenten: ['trompet'], aantalMaten: 2 });

test('een noot op het begin van een lege maat laat de rest van de maat als rust staan', () => {
  const uit = schrijfNoot(nieuw(), 'P1', 0, 0, 480, C5);
  const maat = uit.partijen[0].maten[0];
  assert.notEqual(maat.maatrust, true);
  assert.deepEqual(maat.elementen.map((e) => [e.soort, e.start, e.duur]), [['noot', 0, 480], ['rust', 480, 1440]]);
  assert.deepEqual(maat.elementen[0].toonhoogte, C5);
  assert.equal(maat.elementen[0].zekerheid, 1);
});

test('een tweede noot komt achter de eerste en de rust wordt korter', () => {
  const een = schrijfNoot(nieuw(), 'P1', 0, 0, 480, C5);
  const twee = schrijfNoot(een, 'P1', 0, 480, 960, D5);
  const maat = twee.partijen[0].maten[0];
  assert.deepEqual(maat.elementen.map((e) => [e.soort, e.start, e.duur]), [['noot', 0, 480], ['noot', 480, 960], ['rust', 1440, 480]]);
});

test('een noot over een bestaande noot heen vervangt die', () => {
  const een = schrijfNoot(nieuw(), 'P1', 0, 0, 480, C5);
  const vervangen = schrijfNoot(een, 'P1', 0, 0, 960, D5);
  const maat = vervangen.partijen[0].maten[0];
  assert.deepEqual(maat.elementen.map((e) => [e.soort, e.start, e.duur]), [['noot', 0, 960], ['rust', 960, 960]]);
  assert.deepEqual(maat.elementen[0].toonhoogte, D5);
});

test('een noot die de maat vult laat geen rust achter', () => {
  const uit = schrijfNoot(nieuw(), 'P1', 1, 0, 1920, C5);
  assert.deepEqual(uit.partijen[0].maten[1].elementen.map((e) => [e.soort, e.start, e.duur]), [['noot', 0, 1920]]);
});

test('een noot die langer is dan de rest van de maat geeft een fout en het origineel blijft ongewijzigd', () => {
  const stuk = nieuw();
  const voor = JSON.stringify(stuk);
  assert.throws(() => schrijfNoot(stuk, 'P1', 0, 1440, 960, C5), /past niet/i);
  assert.equal(JSON.stringify(stuk), voor);
});
