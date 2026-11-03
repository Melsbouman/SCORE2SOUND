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

test('tussen twee repetitiecijfers die verder uit elkaar liggen dan de maten, komen onzekere rustmaten', () => {
  const maten = tien();
  maten[4].elementen.unshift(letter('5'));
  maten[7].elementen.unshift(letter('10'));
  const nieuw = vulOntbrekendeMaten(stuk(maten)).partijen[0].maten;
  assert.equal(nieuw.length, 12);
  for (const i of [7, 8]) {
    assert.deepEqual(nieuw[i].elementen, [{ soort: 'rust', start: 0, duur: 1920, stem: 1, notenbalk: 1, heleMaat: true, zekerheid: 0.3 }]);
    assert.equal(nieuw[i].nummer, String(i + 1));
  }
  assert.equal(nieuw[9].nummer, '10');
  assert.equal(nieuw[9].elementen[0].waarde, '10');
  assert.equal(nieuw[11].nummer, '12');
  nieuw.forEach((m, i) => assert.equal(m.index, i));
});

test('kloppende repetitiecijfers, dalende cijfers en gigantische gaten blijven met rust', () => {
  const kloppend = tien();
  kloppend[4].elementen.unshift(letter('5'));
  kloppend[7].elementen.unshift(letter('8'));
  assert.deepEqual(vulOntbrekendeMaten(stuk(kloppend)), stuk(kloppend));
  const dalend = tien();
  dalend[4].elementen.unshift(letter('9'));
  dalend[7].elementen.unshift(letter('3'));
  assert.deepEqual(vulOntbrekendeMaten(stuk(dalend)), stuk(dalend));
  const gat = tien();
  gat[4].elementen.unshift(letter('5'));
  gat[7].elementen.unshift(letter('200'));
  assert.deepEqual(vulOntbrekendeMaten(stuk(gat)), stuk(gat));
});

test('letters zoals A en B tellen niet mee en de invoer verandert niet', () => {
  const maten = tien();
  maten[4].elementen.unshift(letter('A'));
  maten[7].elementen.unshift(letter('B'));
  const oud = stuk(maten);
  assert.deepEqual(vulOntbrekendeMaten(oud), oud);
  const metGat = tien();
  metGat[4].elementen.unshift(letter('5'));
  metGat[7].elementen.unshift(letter('10'));
  const oud2 = stuk(metGat);
  vulOntbrekendeMaten(oud2);
  assert.equal(oud2.partijen[0].maten.length, 10);
});
