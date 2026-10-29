import test from 'node:test';
import assert from 'node:assert/strict';
import { controleerMaatduur } from '../src/controle/maatduur.mjs';

const noot = (start, duur, stem = 1) => ({ soort: 'noot', start, duur, stem, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false, overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1 });
const rust = (start, duur, stem = 1) => ({ soort: 'rust', start, duur, stem, notenbalk: 1, heleMaat: false, zekerheid: 1 });
const aanwijzing = (start) => ({ soort: 'aanwijzing', start, type: 'dynamiek', waarde: 'f', zekerheid: 1 });
const maat = (index, maatsoort, elementen, extra = {}) => ({
  nummer: String(index + (extra.opmaat ? 0 : 1)), index, opmaat: false, maatsoort, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen, ...extra,
});
const partij = (id, maten) => ({ id, naam: id, afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } }, maten });
const vier = { teller: 4, noemer: 4 };
const zesAcht = { teller: 6, noemer: 8 };

test('een kloppende partituur geeft geen meldingen', () => {
  const p = { versie: 1, titel: '', componist: '', partijen: [
    partij('P1', [
      maat(0, zesAcht, [noot(0, 1440)]),
      // Twee stemmen: de langste telt.
      maat(1, zesAcht, [noot(0, 1440, 1), noot(0, 720, 2), aanwijzing(0)]),
      maat(2, zesAcht, [{ ...rust(0, 1440), heleMaat: true }]),
    ]),
  ] };
  assert.deepEqual(controleerMaatduur(p), []);
});

test('te korte en te lange maten zijn een fout; de opmaat en de afmaat niet', () => {
  const p = { versie: 1, titel: '', componist: '', partijen: [
    partij('P1', [
      maat(0, vier, [noot(0, 480)], { opmaat: true, nummer: '0' }),
      maat(1, vier, [noot(0, 1920)], { nummer: '1' }),
      maat(2, vier, [noot(0, 480), noot(480, 480), noot(960, 480)], { nummer: '2' }),
      maat(3, vier, [noot(0, 1920), noot(1920, 480)], { nummer: '3' }),
      maat(4, vier, [noot(0, 1440)], { nummer: '4' }),
    ]),
  ] };
  assert.deepEqual(controleerMaatduur(p), [
    { soort: 'maatduur', ernst: 'fout', partij: 'P1', maat: 2, tekst: 'Maat 2 duurt 3 kwarten, maar de maatsoort 4/4 vraagt er 4.' },
    { soort: 'maatduur', ernst: 'fout', partij: 'P1', maat: 3, tekst: 'Maat 3 duurt 5 kwarten, maar de maatsoort 4/4 vraagt er 4.' },
    { soort: 'maatduur', ernst: 'waarschuwing', partij: 'P1', maat: 4, tekst: 'Maat 4 duurt 3 kwarten, maar de maatsoort 4/4 vraagt er 4. Bij een opmaat kan dit een afmaat zijn.' },
  ]);
});

test('een te lange opmaat is wel een fout', () => {
  const p = { versie: 1, titel: '', componist: '', partijen: [
    partij('P1', [maat(0, vier, [noot(0, 2400)], { opmaat: true, nummer: '0' }), maat(1, vier, [noot(0, 1920)], { nummer: '1' })]),
  ] };
  assert.deepEqual(controleerMaatduur(p), [
    { soort: 'maatduur', ernst: 'fout', partij: 'P1', maat: 0, tekst: 'Maat 0 duurt 5 kwarten, maar de maatsoort 4/4 vraagt er 4.' },
  ]);
});

test('zonder opmaat is een korte laatste maat gewoon een fout', () => {
  const p = { versie: 1, titel: '', componist: '', partijen: [
    partij('P1', [maat(0, vier, [noot(0, 1920)], { nummer: '1' }), maat(1, vier, [noot(0, 960)], { nummer: '2' })]),
  ] };
  assert.equal(controleerMaatduur(p)[0].ernst, 'fout');
});

test('kwarten met een komma en enkelvoud, en meldingen per partij in volgorde', () => {
  const drieAcht = { teller: 3, noemer: 8 };
  const p = { versie: 1, titel: '', componist: '', partijen: [
    partij('P1', [maat(0, drieAcht, [noot(0, 480)], { nummer: '1' })]),
    partij('P2', [maat(0, drieAcht, [noot(0, 960)], { nummer: '1' })]),
  ] };
  assert.deepEqual(controleerMaatduur(p).map((m) => [m.partij, m.tekst]), [
    ['P1', 'Maat 1 duurt 1 kwart, maar de maatsoort 3/8 vraagt er 1,5.'],
    ['P2', 'Maat 1 duurt 2 kwarten, maar de maatsoort 3/8 vraagt er 1,5.'],
  ]);
});
