import test from 'node:test';
import assert from 'node:assert/strict';
import { kopieerMaten } from '../src/model/corrigeren.mjs';

const noot = (duur) => ({
  soort: 'noot', start: 0, duur, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
});
const maat = (index) => ({
  nummer: String(index + 1), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen: [noot(480 * (index + 1))],
});
const partij = (id) => ({ id, naam: id, afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
  maten: [maat(0), maat(1), maat(2), maat(3)] });
const voorbeeld = () => ({ versie: 1, titel: '', componist: '', partijen: [partij('P1'), partij('P2')] });
const duren = (p, partijIndex) => p.partijen[partijIndex].maten.map((m) => m.elementen[0].duur);

test('kopieerMaten zet een reeks maten van alle partijen op een andere plek', () => {
  const oud = voorbeeld();
  const nieuw = kopieerMaten(oud, 0, 1, 2);
  assert.deepEqual(duren(nieuw, 0), [480, 960, 480, 960]);
  assert.deepEqual(duren(nieuw, 1), [480, 960, 480, 960]);
  assert.notEqual(nieuw.partijen[0].maten[2].elementen[0], nieuw.partijen[0].maten[0].elementen[0]);
  assert.equal(nieuw.partijen[0].maten[2].nummer, '3');
  assert.deepEqual(duren(oud, 0), [480, 960, 1440, 1920]);
});

test('past de reeks niet meer, dan stopt het kopiëren aan het einde van het stuk', () => {
  const nieuw = kopieerMaten(voorbeeld(), 0, 1, 3);
  assert.deepEqual(duren(nieuw, 0), [480, 960, 1440, 480]);
});

test('een ongeldige reeks of plek verandert niets', () => {
  const oud = voorbeeld();
  assert.deepEqual(kopieerMaten(oud, 2, 1, 0), oud);
  assert.deepEqual(kopieerMaten(oud, -1, 1, 0), oud);
  assert.deepEqual(kopieerMaten(oud, 0, 9, 0), oud);
  assert.deepEqual(kopieerMaten(oud, 0, 1, 9), oud);
});
