import test from 'node:test';
import assert from 'node:assert/strict';
import { tempoUitTekst } from '../src/model/tempotekst.mjs';

const tekst = (waarde) => ({ soort: 'aanwijzing', start: 0, type: 'tekst', waarde, zekerheid: 1 });
const maat = (index, waarde) => ({
  nummer: String(index + 1),
  index,
  opmaat: false,
  maatsoort: { teller: 4, noemer: 4 },
  toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [],
  tempo: null,
  herhaling: { begin: false, eind: false, keer: 2 },
  elementen: [tekst(waarde)],
});
const stuk = (waarden) => ({
  versie: 1,
  titel: '',
  componist: '',
  partijen: [{
    id: 'P1',
    naam: 'A',
    afkorting: '',
    instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: waarden.map((waarde, index) => maat(index, waarde)),
  }],
});

test('tekstaanwijzingen zonder getal zetten geen tempo', () => {
  const waarden = ['rall.', 'a tempo', 'dolce'];
  const nieuw = tempoUitTekst(stuk(waarden));

  assert.deepEqual(nieuw.partijen[0].maten.map((item) => item.tempo), [null, null, null]);
  assert.deepEqual(nieuw.partijen[0].maten.map((item) => item.elementen), waarden.map((waarde) => [tekst(waarde)]));
});
