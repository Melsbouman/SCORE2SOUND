import test from 'node:test';
import assert from 'node:assert/strict';
import { vulLegeMaten, markeerFouteMaten } from '../src/controle/nabewerken.mjs';

const noot = (start, duur = 480, extra = {}) => ({
  soort: 'noot', start, duur, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 4 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 0.9, ...extra,
});
const maat = (index, elementen) => ({
  nummer: String(index + 1), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen,
});
const partituur = (...maten) => ({ versie: 1, titel: '', componist: '', partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } }, maten }] });

test('vulLegeMaten zet een onzekere hele-maatrust in een maat zonder noten of rusten', () => {
  const oud = partituur(maat(0, [{ soort: 'aanwijzing', start: 0, type: 'tekst', waarde: 'rit.', zekerheid: 1 }]), maat(1, [noot(0)]));
  const nieuw = vulLegeMaten(oud);
  const rust = nieuw.partijen[0].maten[0].elementen.find((e) => e.soort === 'rust');
  assert.deepEqual([rust.start, rust.duur, rust.stem, rust.notenbalk, rust.heleMaat, rust.zekerheid], [0, 1920, 1, 1, true, 0.5]);
  assert.equal(nieuw.partijen[0].maten[1].elementen.length, 1);
  assert.equal(oud.partijen[0].maten[0].elementen.length, 1);
});

test('vulLegeMaten slaat een opmaat over', () => {
  const opmaat = { ...maat(0, []), opmaat: true };
  assert.equal(vulLegeMaten(partituur(opmaat)).partijen[0].maten[0].elementen.length, 0);
});

test('markeerFouteMaten maakt de noten in een maat met een maatduurfout onzeker', () => {
  const oud = partituur(maat(0, [noot(0, 480, { zekerheid: 0.95 }), noot(480, 480, { zekerheid: 0.6 })]), maat(1, [noot(0, 1920)]));
  const meldingen = [{ soort: 'maatduur', ernst: 'fout', partij: 'P1', maat: 0, tekst: 'x' }, { soort: 'herkenning', ernst: 'waarschuwing', partij: null, maat: null, tekst: 'y' }];
  const nieuw = markeerFouteMaten(oud, meldingen);
  assert.deepEqual(nieuw.partijen[0].maten[0].elementen.map((e) => e.zekerheid), [0.75, 0.6]);
  assert.equal(nieuw.partijen[0].maten[1].elementen[0].zekerheid, 0.9);
  assert.equal(oud.partijen[0].maten[0].elementen[0].zekerheid, 0.95);
});
