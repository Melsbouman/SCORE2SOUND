import test from 'node:test';
import assert from 'node:assert/strict';
import { partijUitnemen, voegSamen } from '../src/model/partijen.mjs';

const maat = (index, maatsoort = { teller: 4, noemer: 4 }) => ({
  nummer: String(index + 1), index, opmaat: false, maatsoort, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }], tempo: null, herhaling: { begin: false, eind: false, keer: 2 },
  elementen: [{ soort: 'rust', start: 0, duur: (maatsoort.teller * 1920) / maatsoort.noemer, stem: 1, notenbalk: 1, heleMaat: true, zekerheid: 1 }],
});
const partij = (id, naam, aantal, maatsoorten = {}) => ({
  id, naam, afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
  maten: Array.from({ length: aantal }, (_, i) => maat(i, maatsoorten[i])),
});
const partituur = (titel, partijen) => ({ versie: 1, titel, componist: 'Iemand', partijen });

test('partijUitnemen: een losse partij met haar eigen titel', () => {
  const p = partituur('Mars', [partij('P1', 'Bugel', 2), partij('P2', 'Tuba', 2)]);
  const kopie = structuredClone(p);
  const los = partijUitnemen(p, 'P2');
  assert.deepEqual(los, { versie: 1, titel: 'Mars (Tuba)', componist: 'Iemand', partijen: [kopie.partijen[1]] });
  assert.notEqual(los.partijen[0], p.partijen[1], 'een kopie, niet dezelfde partij');
  assert.deepEqual(p, kopie, 'de partituur zelf verandert niet');
  assert.throws(() => partijUitnemen(p, 'P9'), /Onbekende partij/);
});

test('voegSamen: alle partijen achter elkaar, met unieke id-s, zonder meldingen als alles klopt', () => {
  const a = partituur('Mars', [partij('P1', 'Bugel', 3)]);
  const b = partituur('Mars, tuba', [partij('P1', 'Tuba', 3), partij('P2', 'Bas', 3)]);
  const { partituur: samen, meldingen } = voegSamen([a, b]);
  assert.equal(samen.titel, 'Mars');
  assert.equal(samen.componist, 'Iemand');
  assert.deepEqual(samen.partijen.map((p) => [p.id, p.naam]), [['P1', 'Bugel'], ['P1-2', 'Tuba'], ['P2', 'Bas']]);
  assert.deepEqual(meldingen, []);
  assert.equal(a.partijen[0].id, 'P1', 'de invoer verandert niet');
  assert.equal(b.partijen[0].id, 'P1');
});

test('voegSamen: meldt een verschil in het aantal maten en in de maatsoort', () => {
  const a = partituur('Wals', [partij('P1', 'Bugel', 3)]);
  const b = partituur('Wals', [partij('P1', 'Tuba', 2, { 1: { teller: 3, noemer: 4 } })]);
  const { meldingen } = voegSamen([a, b]);
  assert.deepEqual(meldingen, [
    { soort: 'aantal-maten', ernst: 'waarschuwing', partij: 'P1-2', maat: null, tekst: 'Tuba heeft 2 maten, Bugel heeft er 3.' },
    { soort: 'maatsoort', ernst: 'waarschuwing', partij: 'P1-2', maat: 1, tekst: 'Maat 2: Tuba staat in 3/4, Bugel in 4/4.' },
  ]);
});

test('voegSamen: zonder partituren is een fout', () => {
  assert.throws(() => voegSamen([]), /geen partituren/);
});
