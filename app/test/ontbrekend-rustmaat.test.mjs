import test from 'node:test';
import assert from 'node:assert/strict';
import { vulOntbrekendeMaten } from '../src/model/ontbrekend.mjs';

const noot = { soort: 'noot', start: 0, duur: 1920, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 } };
const rust = { soort: 'rust', start: 0, duur: 1920, stem: 1, notenbalk: 1, heleMaat: true, zekerheid: 1 };
const letter = (waarde) => ({ soort: 'aanwijzing', start: 0, type: 'letter', waarde, zekerheid: 1 });
const maat = (index, elementen = [noot]) => ({
  nummer: String(index + 1), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen,
});
const stuk = (maten) => ({ partijen: [{ id: 'P1', maten }] });
const tien = () => Array.from({ length: 10 }, (_, index) => maat(index));

test('zonder lege maat maar met één rustmaat in het gat krijgt die rustmaat het ontbrekende aantal (Devils Galop maat 53)', () => {
  // Cijfer 2 op maat 2 en cijfer 10 op maat 8: er ontbreken twee maten, en maat 4 is de enige rustmaat ertussen.
  const maten = tien();
  maten[1].elementen = [letter('2'), noot];
  maten[3].elementen = [rust, { soort: 'aanwijzing', start: 0, type: 'tekst', waarde: 'open', zekerheid: 1 }];
  maten[7].elementen = [letter('10'), noot];
  const nieuw = vulOntbrekendeMaten(stuk(maten)).partijen[0].maten;
  assert.equal(nieuw.length, 10);
  assert.equal(nieuw[3].maatrust, 3);
  assert.deepEqual(nieuw[3].elementen.map((element) => element.soort), ['rust', 'aanwijzing']);
  assert.equal(nieuw.some((huidige) => huidige.ingevoegd), false);
  assert.equal(nieuw[7].nummer, '10');
});

test('twee rustmaten in het gat: niet duidelijk welke, dan komen er maten bij zoals eerst', () => {
  const maten = tien();
  maten[1].elementen = [letter('2'), noot];
  maten[3].elementen = [rust];
  maten[5].elementen = [rust];
  maten[7].elementen = [letter('10'), noot];
  const nieuw = vulOntbrekendeMaten(stuk(maten)).partijen[0].maten;
  assert.equal(nieuw.length, 12);
  assert.equal(nieuw.filter((huidige) => huidige.ingevoegd).length, 2);
  assert.equal(nieuw[3].maatrust, undefined);
});

test('een rustmaat die in een andere partij noten heeft, wordt geen meermaatsrust', () => {
  const maten = tien();
  maten[1].elementen = [letter('2'), noot];
  maten[3].elementen = [rust];
  maten[7].elementen = [letter('10'), noot];
  const tweede = tien();
  const nieuw = vulOntbrekendeMaten({ partijen: [{ id: 'P1', maten }, { id: 'P2', maten: tweede }] });
  assert.equal(nieuw.partijen[0].maten.length, 12);
  assert.equal(nieuw.partijen[0].maten[3].maatrust, undefined);
});
