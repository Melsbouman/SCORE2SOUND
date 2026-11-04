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

test('de herstelketen haalt een colofon uit de noten en bewaart het eenmaal als colofon', () => {
  const zin = ['Music', 'Studio', 'Verlag', 'AG,', 'CH', 'Wiedlisbach'];
  const rij = () => zin.map((w) => noot([w]));
  const uit = herstelHerkenning(stuk([maat(0, {}, rij()), maat(1), maat(2, {}, rij())]));
  assert.equal(uit.colofon, 'Music Studio Verlag AG, CH Wiedlisbach');
  assert.equal(uit.partijen[0].maten.flatMap((m) => m.elementen.filter((e) => e.teksten?.length)).length, 0);
});

test('de herstelketen zet FL. Mare om in de sterkte ff en de speelwijze Marcato (alleen aanduidingen uit de lijst)', () => {
  const tekst = { soort: 'aanwijzing', start: 480, type: 'tekst', waarde: 'FL. Mare', zekerheid: 1 };
  const uit = herstelHerkenning(stuk([maat(0, {}, [noot(), tekst]), maat(1)]));
  const aanwijzingen = uit.partijen[0].maten[0].elementen.filter((e) => e.soort === 'aanwijzing').map((e) => [e.type, e.waarde, e.zekerheid]);
  assert.deepEqual(aanwijzingen, [['dynamiek', 'ff', 0.5], ['tekst', 'Marcato', 0.5]]);
});

test('de herstelketen laat een lange of onbekende tekst zoals hij is (cup mute, een zin met een getal)', () => {
  const teksten = ['All, cup mute', '* Optional cut to bar 65'].map((waarde) => ({ soort: 'aanwijzing', start: 0, type: 'tekst', waarde, zekerheid: 1 }));
  const uit = herstelHerkenning(stuk([maat(0, {}, [noot(), ...teksten])]));
  assert.deepEqual(uit.partijen[0].maten[0].elementen.filter((e) => e.type === 'tekst').map((e) => e.waarde), ['All, cup mute', '* Optional cut to bar 65']);
});

test('repetitiecijfers (22, 26, 30) en een mengeling met een letter blijven ongemoeid: dat is geen letterreeks', () => {
  const cijfers = [maat(0, {}, [letter('22'), noot()]), maat(1), maat(2, {}, [letter('26'), noot()]), maat(3, {}, [letter('30'), noot()]), maat(4, {}, [letter('30'), noot()])];
  assert.deepEqual(letters(herstelHerkenning(stuk(cijfers))), ['22', '26', '30', '30']);
  const gemengd = [maat(0, {}, [letter('A'), noot()]), maat(1), maat(2, {}, [letter('21'), noot()]), maat(3, {}, [letter('29'), noot()])];
  assert.deepEqual(letters(herstelHerkenning(stuk(gemengd))), ['A', '21', '29']);
});
