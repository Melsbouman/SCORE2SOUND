import test from 'node:test';
import assert from 'node:assert/strict';
import { leegMaten } from '../src/model/corrigeren.mjs';

const noot = (start) => ({
  soort: 'noot', start, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
});
const aanwijzing = { soort: 'aanwijzing', start: 0, type: 'tekst', waarde: 'dolce', zekerheid: 1 };
const maat = (index, teller, noemer) => ({
  nummer: String(index + 1), index, opmaat: false, maatsoort: { teller, noemer }, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen: [aanwijzing, noot(0), noot(480)],
});
const partij = (id) => ({ id, naam: id, afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
  maten: [maat(0, 4, 4), maat(1, 3, 4), maat(2, 6, 8), maat(3, 4, 4)] });
const voorbeeld = () => ({ versie: 1, titel: '', componist: '', partijen: [partij('P1'), partij('P2')] });

test('leegMaten maakt van elke gekozen maat een hele maat rust, voor alle partijen', () => {
  const oud = voorbeeld();
  const nieuw = leegMaten(oud, 1, 2);
  for (const p of nieuw.partijen) {
    assert.deepEqual(p.maten[1].elementen, [{ soort: 'rust', start: 0, duur: 1440, stem: 1, notenbalk: 1, heleMaat: true, zekerheid: 1 }]);
    assert.deepEqual(p.maten[2].elementen, [{ soort: 'rust', start: 0, duur: 1440, stem: 1, notenbalk: 1, heleMaat: true, zekerheid: 1 }]);
    assert.equal(p.maten[0].elementen.length, 3);
    assert.equal(p.maten[3].elementen.length, 3);
  }
  assert.equal(oud.partijen[0].maten[1].elementen.length, 3);
});

test('een maat van 4/4 krijgt een rust van 1920', () => {
  const nieuw = leegMaten(voorbeeld(), 0, 0);
  assert.equal(nieuw.partijen[0].maten[0].elementen[0].duur, 1920);
});

test('een ongeldige reeks verandert niets', () => {
  const oud = voorbeeld();
  assert.deepEqual(leegMaten(oud, 2, 1), oud);
  assert.deepEqual(leegMaten(oud, -1, 1), oud);
  assert.deepEqual(leegMaten(oud, 0, 9), oud);
});
