import test from 'node:test';
import assert from 'node:assert/strict';
import { herstelHerkenning } from '../src/model/herstel.mjs';

// Deze test bewaakt dat de herstelstappen echt in de keten zitten (en niet alleen geimporteerd zijn).
const noot = (teksten) => ({
  soort: 'noot', start: 0, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
  ...(teksten ? { teksten: teksten.map((lettergreep) => ({ couplet: 1, lettergreep, soort: 'single' })) } : {}),
});
const letter = (waarde) => ({ soort: 'aanwijzing', start: 0, type: 'letter', waarde, zekerheid: 1 });
const maat = (index, extra = {}, elementen = [noot()]) => ({
  nummer: String(index + 1), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen, ...extra,
});
const stuk = (maten) => ({
  versie: 1, titel: 'Test', componist: '',
  partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } }, maten }],
});
const letters = (p) => p.partijen[0].maten.flatMap((m) => m.elementen.filter((e) => e.type === 'letter').map((e) => e.waarde));

test('de herstelketen vult een ontbrekende letter in (B, C, E wordt B, C, D, E)', () => {
  const maten = [maat(0), maat(1, {}, [letter('B'), noot()]), maat(2), maat(3, {}, [letter('C'), noot()]), maat(4), maat(5), maat(6), maat(7, {}, [letter('E'), noot()]), maat(8)];
  assert.deepEqual(letters(herstelHerkenning(stuk(maten))), ['B', 'C', 'D', 'E']);
});

test('de herstelketen zet hokjes bij een herhalingseind met één maat ervoor een letter', () => {
  const maten = [maat(0), maat(1, { herhaling: { begin: false, eind: true, keer: 2 } }), maat(2), maat(3, {}, [letter('E'), noot()])];
  const uit = herstelHerkenning(stuk(maten)).partijen[0].maten;
  assert.deepEqual(uit[1].volta, { nummers: [1], begin: true, eind: true });
  assert.deepEqual(uit[2].volta, { nummers: [2], begin: true, eind: true });
});

test('de herstelketen haalt een colofon uit de noten en bewaart het eenmaal als colofon', () => {
  const zin = ['Music', 'Studio', 'Verlag', 'AG,', 'CH', 'Wiedlisbach'];
  const rij = () => zin.map((w) => noot([w]));
  const uit = herstelHerkenning(stuk([maat(0, {}, rij()), maat(1), maat(2, {}, rij())]));
  assert.equal(uit.colofon, 'Music Studio Verlag AG, CH Wiedlisbach');
  assert.equal(uit.partijen[0].maten.flatMap((m) => m.elementen.filter((e) => e.teksten?.length)).length, 0);
});
