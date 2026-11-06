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
const stuk = (...waarden) => ({
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

test('tempotekst herkent een kwart en rekent een gepunte kwart om', () => {
  const nieuw = tempoUitTekst(stuk('♩ = 96', 'J. = 60', 'poco 12'));
  const [kwart, gepunt, geenTempo] = nieuw.partijen[0].maten;

  assert.equal(kwart.tempo, 96);
  assert.deepEqual(kwart.elementen, [
    { soort: 'aanwijzing', start: 0, type: 'tempo', waarde: 96, getoond: { eenheid: 'quarter', punt: false, getal: 96 }, zekerheid: 1 },
  ]);
  assert.equal(gepunt.tempo, 90);
  assert.deepEqual(gepunt.elementen, [
    { soort: 'aanwijzing', start: 0, type: 'tempo', waarde: 90, getoond: { eenheid: 'quarter', punt: true, getal: 60 }, zekerheid: 1 },
  ]);
  assert.equal(geenTempo.tempo, null);
  assert.deepEqual(geenTempo.elementen, [tekst('poco 12')]);
});
