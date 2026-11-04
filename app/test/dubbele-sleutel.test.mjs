import assert from 'node:assert/strict';
import test from 'node:test';

import { herstelHerkenning } from '../src/model/herstel.mjs';

const gSleutel = { teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 };
const fSleutel = { teken: 'F', lijn: 4, notenbalk: 1, octaafVerschuiving: 0 };
const rust = { soort: 'rust', start: 0, duur: 1920, stem: 1, notenbalk: 1, heleMaat: true, zekerheid: 1 };
const cijfer = { soort: 'aanwijzing', start: 0, type: 'letter', waarde: '8', zekerheid: 1 };
const maat = (index, sleutels, elementen) => ({
  nummer: String(index + 1), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 },
  toonsoort: { kwinten: 0, modus: 'majeur' }, sleutels, tempo: null,
  herhaling: { begin: false, eind: false, keer: 2 }, elementen,
});
const partituur = (tweedeSleutel) => ({
  versie: 1, titel: 'Test', componist: '',
  partijen: [{
    id: 'P1', naam: 'Piano', afkorting: '',
    instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: [
      maat(0, [gSleutel], [rust, cijfer]),
      maat(1, [tweedeSleutel], [rust]),
    ],
  }],
});

test('een gelijke sleutel na een samengestelde rust wordt verwijderd', () => {
  const maten = herstelHerkenning(partituur(gSleutel)).partijen[0].maten;

  assert.deepEqual(maten.at(-1).sleutels, []);
});

test('een echte sleutelwisseling na een samengestelde rust blijft staan', () => {
  const maten = herstelHerkenning(partituur(fSleutel)).partijen[0].maten;

  assert.deepEqual(maten.at(-1).sleutels, [fSleutel]);
});
