import test from 'node:test';
import assert from 'node:assert/strict';
import { vulVoltas } from '../src/model/voltaherstel.mjs';

const noot = () => ({
  soort: 'noot', start: 0, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
});
const letter = (waarde) => ({ soort: 'aanwijzing', start: 0, type: 'letter', waarde, zekerheid: 1 });
const maat = (index, extra = {}, elementen = [noot()]) => ({
  nummer: String(index + 1), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen, ...extra,
});
const eind = { herhaling: { begin: false, eind: true, keer: 2 } };
const stuk = (maten) => ({
  versie: 1, titel: '', componist: '',
  partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } }, maten }],
});
const volta = (p) => p.partijen[0].maten.map((m) => m.volta ?? null);

test('een herhalingseind, één maat en dan een letter: eerste en tweede hokje (1. en 2.)', () => {
  const maten = [maat(0), maat(1), maat(2, eind), maat(3), maat(4, {}, [letter('E'), noot()]), maat(5)];
  const uit = vulVoltas(stuk(maten));
  assert.deepEqual(volta(uit), [null, null,
    { nummers: [1], begin: true, eind: true },
    { nummers: [2], begin: true, eind: true }, null, null]);
});

test('een herhalingseind, één maat en dan het einde van het stuk: ook hokjes', () => {
  const uit = vulVoltas(stuk([maat(0), maat(1, eind), maat(2)]));
  assert.deepEqual(volta(uit), [null, { nummers: [1], begin: true, eind: true }, { nummers: [2], begin: true, eind: true }]);
});

test('een herhalingseind met daarna meerdere gewone maten krijgt geen hokjes', () => {
  const maten = [maat(0), maat(1, eind), maat(2), maat(3), maat(4)];
  assert.deepEqual(volta(vulVoltas(stuk(maten))), [null, null, null, null, null]);
});

test('bestaande hokjes blijven zoals ze zijn en de invoer verandert niet', () => {
  const eerste = { nummers: [1], begin: true, eind: true };
  const tweede = { nummers: [2], begin: true, eind: true };
  const oud = stuk([maat(0), maat(1, { ...eind, volta: eerste }), maat(2, { volta: tweede }), maat(3, {}, [letter('E'), noot()])]);
  const kopie = structuredClone(oud);
  assert.deepEqual(vulVoltas(oud), kopie);
  assert.deepEqual(oud, kopie);
});

test('een regelbegin blijft op dezelfde maat staan', () => {
  const maten = [maat(0, { regelbegin: true }), maat(1, eind), maat(2, { regelbegin: true }), maat(3, {}, [letter('E'), noot()])];
  const uit = vulVoltas(stuk(maten));
  assert.deepEqual(uit.partijen[0].maten.map((m) => Boolean(m.regelbegin)), [true, false, true, false]);
});

test('met de herhalingsstreep op het eerste hokje speelt hokje 2 bij de tweede keer (standaard notatie)', async () => {
  const { speelVolgorde } = await import('../src/model/maten.mjs');
  const m = (i, extra = {}) => ({ index: i, nummer: String(i + 1), herhaling: { begin: false, eind: false, keer: 2 }, elementen: [], ...extra });
  const maten = [
    m(0, { herhaling: { begin: true, eind: false, keer: 2 } }), m(1),
    m(2, { herhaling: { begin: false, eind: true, keer: 2 }, volta: { nummers: [1], begin: true, eind: true } }),
    m(3, { volta: { nummers: [2], begin: true, eind: true } }), m(4), m(5),
  ];
  assert.deepEqual(speelVolgorde(maten), [0, 1, 2, 0, 1, 3, 4, 5]);
});
