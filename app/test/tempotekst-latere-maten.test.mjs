import test from 'node:test';
import assert from 'node:assert/strict';
import { tempoUitTekst } from '../src/model/tempotekst.mjs';

const tekst = (waarde) => ({ soort: 'aanwijzing', start: 0, type: 'tekst', waarde, zekerheid: 1 });
const maat = (index, elementen = []) => ({
  nummer: String(index + 1),
  index,
  opmaat: false,
  maatsoort: { teller: 4, noemer: 4 },
  toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [],
  tempo: null,
  herhaling: { begin: false, eind: false, keer: 2 },
  elementen,
});
const stuk = (maten) => ({
  versie: 1,
  titel: '',
  componist: '',
  partijen: [{
    id: 'P1',
    naam: 'A',
    afkorting: '',
    instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten,
  }],
});

test('Allegro in maat 0 wordt tempo', () => {
  const nieuw = tempoUitTekst(stuk([maat(0, [tekst('Allegro')])]));

  assert.equal(nieuw.partijen[0].maten[0].tempo, 120);
  assert.deepEqual(nieuw.partijen[0].maten[0].elementen, [
    { soort: 'aanwijzing', start: 0, type: 'tempo', waarde: 120, zekerheid: 1 },
  ]);
});

test('Andante als tekstaanwijzing in maat 5 zet daar tempo 76', () => {
  const maten = Array.from({ length: 6 }, (_, index) => maat(index));
  maten[5].elementen.push(tekst('Andante'));

  const nieuw = tempoUitTekst(stuk(maten));

  assert.equal(nieuw.partijen[0].maten[5].tempo, 76);
  assert.deepEqual(nieuw.partijen[0].maten[5].elementen, [
    { soort: 'aanwijzing', start: 0, type: 'tempo', waarde: 76, zekerheid: 1 },
  ]);
});

test('Vivace risoluto in een latere maat blijft tekst', () => {
  const maten = Array.from({ length: 6 }, (_, index) => maat(index));
  maten[5].elementen.push(tekst('Vivace risoluto'));

  const nieuw = tempoUitTekst(stuk(maten));

  assert.equal(nieuw.partijen[0].maten[5].tempo, null);
  assert.deepEqual(nieuw.partijen[0].maten[5].elementen, [tekst('Vivace risoluto')]);
});
