import test from 'node:test';
import assert from 'node:assert/strict';
import { klikGebeurtenissen } from '../src/midi/klik.mjs';

const partituur = {
  versie: 1,
  titel: 'Voorinteller',
  componist: '',
  partijen: [{
    id: 'P1',
    naam: 'Piano',
    afkorting: '',
    instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: [{
      nummer: '1',
      index: 0,
      opmaat: false,
      maatsoort: { teller: 4, noemer: 4 },
      toonsoort: { kwinten: 0, modus: 'majeur' },
      sleutels: [],
      tempo: 120,
      herhaling: { begin: false, eind: false, keer: 2 },
      elementen: [{
        soort: 'noot',
        start: 0,
        duur: 480,
        stem: 1,
        notenbalk: 1,
        toonhoogte: { stap: 'C', alter: 0, octaaf: 4 },
        akkoord: false,
        overbinding: { begin: false, eind: false },
        articulaties: [],
        legato: { begin: false, eind: false },
        versiering: null,
        zekerheid: 1,
      }],
    }],
  }],
};

test('een maat voorinteller in 4/4 geeft vier klikken voor de eerste noot', () => {
  const klikken = klikGebeurtenissen(partituur, { voorinteller: 1 });

  assert.equal(klikken.filter((klik) => klik.tik < 0).length, 4);
});
