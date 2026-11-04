import test from 'node:test';
import assert from 'node:assert/strict';
import { SPELWIJZEN } from '../src/model/aanduidingen.mjs';
import { tempoUitTekst } from '../src/model/tempotekst.mjs';

const tekst = (waarde) => ({ soort: 'aanwijzing', start: 0, type: 'tekst', waarde, zekerheid: 1 });

test('Vivace boven de eerste maat wordt tempo en open blijft een aanduiding boven de maat', () => {
  const partituur = {
    versie: 1,
    titel: 'Galop',
    componist: '',
    partijen: [{
      id: 'P1',
      naam: 'Bugel',
      afkorting: '',
      instrument: { midiProgramma: 56, transpositie: { chromatisch: -2, diatonisch: -1 } },
      maten: [{
        nummer: '1',
        index: 0,
        opmaat: false,
        maatsoort: { teller: 2, noemer: 4 },
        toonsoort: { kwinten: 0, modus: 'majeur' },
        sleutels: [],
        tempo: null,
        herhaling: { begin: false, eind: false, keer: 2 },
        elementen: [tekst('Vivace'), tekst('open')],
      }],
    }],
  };

  const nieuw = tempoUitTekst(partituur);

  assert.equal(nieuw.partijen[0].maten[0].tempo, 140);
  assert.deepEqual(nieuw.partijen[0].maten[0].elementen, [
    { soort: 'aanwijzing', start: 0, type: 'tempo', waarde: 140, zekerheid: 1 },
    tekst('open'),
  ]);
  assert.ok(SPELWIJZEN.includes('open'));
});
