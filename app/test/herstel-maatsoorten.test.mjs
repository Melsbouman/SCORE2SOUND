import test from 'node:test';
import assert from 'node:assert/strict';
import { herstelMaatsoorten } from '../src/model/maatsoorten.mjs';

const noot = (start, duur) => ({
  soort: 'noot', start, duur, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
});
const maat = (index, teller, noemer, elementen, extra = {}) => ({
  nummer: String(index + 1), index, opmaat: false, maatsoort: { teller, noemer }, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen, ...extra,
});
const stuk = (...maten) => ({
  versie: 1, titel: '', componist: '',
  partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } }, maten }],
});
const soorten = (p) => p.partijen[0].maten.map((m) => `${m.maatsoort.teller}/${m.maatsoort.noemer}`);
const achtsten = (n) => Array.from({ length: n }, (_, i) => noot(i * 240, 240));

test('een te lange maat krijgt geen verzonnen maatsoort (9 achtsten in 6/8 blijft 6/8)', () => {
  const nieuw = herstelMaatsoorten(stuk(maat(0, 6, 8, achtsten(6)), maat(1, 6, 8, achtsten(9)), maat(2, 6, 8, achtsten(6))));
  assert.deepEqual(soorten(nieuw), ['6/8', '6/8', '6/8']);
});

test('vijf kwarten in 4/4 blijven 4/4 en een maat die al klopt of korter is blijft ook zoals hij is', () => {
  const vijfKwarten = Array.from({ length: 5 }, (_, i) => noot(i * 480, 480));
  assert.deepEqual(soorten(herstelMaatsoorten(stuk(maat(0, 4, 4, vijfKwarten)))), ['4/4']);
});

test('een maat die al klopt, een onvolledige maat, een opmaat en een lege maat blijven zoals ze zijn', () => {
  const oud = stuk(
    maat(0, 6, 8, achtsten(6)),
    maat(1, 6, 8, achtsten(4)),
    maat(2, 6, 8, achtsten(9), { opmaat: true }),
    maat(3, 6, 8, []),
  );
  assert.deepEqual(soorten(herstelMaatsoorten(oud)), ['6/8', '6/8', '6/8', '6/8']);
});

test('de invoer wordt niet veranderd', () => {
  const oud = stuk(maat(0, 6, 8, achtsten(9)));
  herstelMaatsoorten(oud);
  assert.equal(oud.partijen[0].maten[0].maatsoort.teller, 6);
});
