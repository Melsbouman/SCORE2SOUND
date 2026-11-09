import test from 'node:test';
import assert from 'node:assert/strict';
import { vulOntbrekendeMaten } from '../src/model/ontbrekend.mjs';

const noot = (start) => ({
  soort: 'noot', start, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
});
const letter = (waarde) => ({ soort: 'aanwijzing', start: 0, type: 'letter', waarde, zekerheid: 1 });
const maat = (index, elementen = [noot(0)]) => ({
  nummer: String(index + 1), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen,
});
const stuk = (maten) => ({
  versie: 1, titel: '', componist: '',
  partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } }, maten }],
});
const tien = () => Array.from({ length: 10 }, (_, i) => maat(i));
const rustMaat = { soort: 'rust', start: 0, duur: 1920, stem: 1, notenbalk: 1, heleMaat: true, zekerheid: 0.3 };

test('een lege maat in het gat wordt een samengestelde rust met het ontbrekende aantal', () => {
  const maten = tien();
  maten[4].elementen.unshift(letter('5'));
  maten[5].elementen = [];
  maten[7].elementen.unshift(letter('10'));
  const nieuw = vulOntbrekendeMaten(stuk(maten)).partijen[0].maten;
  // De rust van 3 maten krijgt zijn 2 verborgen maten (maatrust N met N-1 verborgen maten, docs/model.md).
  assert.equal(nieuw.length, 12);
  assert.equal(nieuw[5].maatrust, 3);
  assert.deepEqual(nieuw[5].elementen, [rustMaat]);
  assert.deepEqual(nieuw.slice(6, 8).map((maat) => [maat.verborgen, maat.nummer]), [[true, '7'], [true, '8']]);
  assert.equal(nieuw[8].nummer, '9');
  assert.equal(nieuw[9].nummer, '10');
  assert.equal(nieuw[11].nummer, '12');
});

test('twee lege maten delen het ontbrekende aantal, de eerste krijgt de rest', () => {
  const maten = tien();
  maten[4].elementen.unshift(letter('5'));
  maten[5].elementen = [];
  maten[6].elementen = [];
  maten[7].elementen.unshift(letter('11'));
  const nieuw = vulOntbrekendeMaten(stuk(maten)).partijen[0].maten;
  assert.equal(nieuw.length, 13);
  assert.equal(nieuw[5].maatrust, 3);
  assert.equal(nieuw[8].maatrust, 2);
  assert.equal(nieuw[10].nummer, '11');
});

test('zonder lege maat in het gat komen er nog steeds onzekere rustmaten bij', () => {
  const maten = tien();
  maten[4].elementen.unshift(letter('5'));
  maten[7].elementen.unshift(letter('10'));
  const nieuw = vulOntbrekendeMaten(stuk(maten)).partijen[0].maten;
  assert.equal(nieuw.length, 12);
  assert.equal(nieuw[7].maatrust, undefined);
});

test('een lege maat buiten een gat of in een kloppend gat blijft zoals hij is', () => {
  const maten = tien();
  maten[4].elementen.unshift(letter('5'));
  maten[5].elementen = [];
  maten[7].elementen.unshift(letter('8'));
  const oud = stuk(maten);
  assert.deepEqual(vulOntbrekendeMaten(oud), oud);
});
