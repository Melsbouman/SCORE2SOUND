import test from 'node:test';
import assert from 'node:assert/strict';
import { scheidColofon } from '../src/model/colofon.mjs';

const noot = (start, lettergreep) => ({
  soort: 'noot', start, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
  teksten: [{ couplet: 1, lettergreep, soort: 'single' }],
});

const partij = (id, woorden) => ({
  id, naam: id, afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
  maten: [{
    nummer: '1', index: 0, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
    sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 },
    elementen: woorden.map((woord, index) => noot(index * 480, woord)),
  }],
});

test('elke partij bewaart zijn eigen colofon en de eerste blijft beschikbaar voor de partituur', () => {
  const invoer = {
    versie: 1, titel: '', componist: '',
    partijen: [
      partij('P1', ['Copyright', 'Eerste', 'Verlag']),
      partij('P2', ['Copyright', 'Tweede', 'Publishing']),
    ],
  };

  const uit = scheidColofon(invoer);

  assert.equal(uit.partituur.partijen[0].colofon, 'Copyright Eerste Verlag');
  assert.equal(uit.partituur.partijen[1].colofon, 'Copyright Tweede Publishing');
  assert.equal(uit.colofon, 'Copyright Eerste Verlag');
});
